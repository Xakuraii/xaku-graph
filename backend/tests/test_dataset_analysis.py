from pathlib import Path

import polars as pl
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.datasets.analysis_service import DatasetAnalysisService

client = TestClient(app)


def test_query_rows_search_filter_sort_paginate():
    df = pl.DataFrame(
        {
            "id": [1, 2, 3, 4, 5],
            "name": ["Alice", "Bob", "Alicia", "Charlie", "David"],
            "score": [80.0, 95.0, 70.0, 90.0, 85.0],
        }
    )

    # Search for 'ali' (case-insensitive -> Alice, Alicia)
    res_search = DatasetAnalysisService.query_rows(df, "ds-1", search="ali")
    assert res_search.total_rows == 5
    assert res_search.filtered_rows == 2
    assert [r["name"] for r in res_search.rows] == ["Alice", "Alicia"]

    # Sort descending and paginate
    res_page = DatasetAnalysisService.query_rows(
        df, "ds-1", sort_by="score", sort_desc=True, offset=1, limit=2
    )
    assert res_page.filtered_rows == 5
    assert [r["name"] for r in res_page.rows] == ["Charlie", "David"]

    # Column filter
    res_col = DatasetAnalysisService.query_rows(df, "ds-1", filter_col="name", filter_value="bob")
    assert res_col.filtered_rows == 1
    assert res_col.rows[0]["id"] == 2

    # Invalid column raises ValueError
    with pytest.raises(ValueError, match="does not exist"):
        DatasetAnalysisService.query_rows(df, "ds-1", sort_by="missing_col")


def test_compute_distributions_numeric_and_categorical():
    # Known values: [10, 12, 13, 14, 15, 16, 18, 100] -> 100 is an obvious IQR outlier
    df = pl.DataFrame(
        {
            "metric": [10.0, 12.0, 13.0, 14.0, 15.0, 16.0, 18.0, 100.0],
            "const": [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
            "group": ["A", "A", "B", "A", "B", "C", None, "A"],
        }
    )

    dist = DatasetAnalysisService.compute_distributions(df, "ds-dist", bins=5)
    assert dist.bins == 5
    assert len(dist.distributions) == 3

    metric_dist = dist.distributions[0]
    assert metric_dist.kind == "numeric"
    assert metric_dist.non_null_count == 8
    assert metric_dist.histogram is not None
    assert sum(b.count for b in metric_dist.histogram) == 8
    assert metric_dist.boxplot is not None
    assert metric_dist.boxplot.outlier_count == 1
    assert metric_dist.boxplot.sample_outliers == [100.0]

    const_dist = dist.distributions[1]
    assert const_dist.histogram is not None
    assert len(const_dist.histogram) == 1
    assert const_dist.histogram[0].count == 8

    group_dist = dist.distributions[2]
    assert group_dist.kind == "categorical"
    assert group_dist.non_null_count == 7
    assert group_dist.categories is not None
    assert group_dist.categories[0].value == "A"
    assert group_dist.categories[0].count == 4


def test_compute_quality_missing_duplicates_and_outliers():
    # 4 rows x 3 cols = 12 cells; 2 nulls -> completeness = 10/12 = 83.33%
    # 1 duplicate row (row 0 and row 1 identical)
    df = pl.DataFrame(
        {
            "val": [10.0, 10.0, 11.0, 10.5, 10.2, 9.8, 10.1, 9.9, 10.0, 10.3, 10.4, 500.0],
            "const": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "tag": ["x", "x", None, "y", "y", "y", "y", "y", "y", "y", "y", None],
        }
    )

    report = DatasetAnalysisService.compute_quality(df, "ds-qual")
    assert report.row_count == 12
    assert report.column_count == 3
    assert report.total_cells == 36
    assert report.total_missing_cells == 2
    assert report.duplicate_row_count == 1
    assert abs(report.completeness_percentage - 94.44) < 0.05

    val_metric = next(c for c in report.columns if c.column == "val")
    assert val_metric.iqr_outlier_count >= 1
    assert val_metric.zscore_outlier_count == 1

    const_metric = next(c for c in report.columns if c.column == "const")
    assert const_metric.is_constant is True

    tag_metric = next(c for c in report.columns if c.column == "tag")
    assert tag_metric.null_count == 2


def test_compute_correlations_pearson_and_spearman():
    df = pl.DataFrame(
        {
            "x": [1.0, 2.0, 3.0, 4.0, 5.0],
            "y_pos": [2.0, 4.0, 6.0, 8.0, 10.0],
            "y_neg": [10.0, 8.0, 6.0, 4.0, 2.0],
            "const": [3.0, 3.0, 3.0, 3.0, 3.0],
            "label": ["a", "b", "c", "d", "e"],
        }
    )

    pearson = DatasetAnalysisService.compute_correlations(df, "ds-corr", method="pearson")
    assert pearson.columns == ["x", "y_pos", "y_neg", "const"]
    assert pearson.matrix[0][0] == 1.0
    assert pearson.matrix[0][1] == 1.0
    assert pearson.matrix[0][2] == -1.0
    assert pearson.matrix[0][3] is None  # zero variance column

    spearman = DatasetAnalysisService.compute_correlations(df, "ds-corr", method="spearman")
    assert spearman.matrix[0][1] == 1.0
    assert spearman.matrix[0][2] == -1.0


def test_analysis_api_endpoints_on_sample(isolated_storage: Path):
    rows_res = client.get("/api/datasets/sample-iris-dataset/rows?search=setosa&limit=5")
    assert rows_res.status_code == 200
    rows_data = rows_res.json()
    assert rows_data["filtered_rows"] == 10
    assert len(rows_data["rows"]) == 5

    dist_res = client.get("/api/datasets/sample-iris-dataset/distributions?bins=10")
    assert dist_res.status_code == 200
    dist_data = dist_res.json()
    assert dist_data["bins"] == 10
    assert len(dist_data["distributions"]) == 5

    qual_res = client.get("/api/datasets/sample-iris-dataset/quality")
    assert qual_res.status_code == 200
    qual_data = qual_res.json()
    assert qual_data["completeness_percentage"] == 100.0
    assert qual_data["row_count"] == 30

    corr_res = client.get("/api/datasets/sample-iris-dataset/correlations?method=spearman")
    assert corr_res.status_code == 200
    corr_data = corr_res.json()
    assert corr_data["method"] == "spearman"
    assert len(corr_data["columns"]) == 4
    assert len(corr_data["matrix"]) == 4
