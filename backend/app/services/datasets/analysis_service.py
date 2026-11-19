import math
from typing import Literal

import numpy as np
import polars as pl
from scipy.stats import spearmanr

from app.schemas.dataset import (
    BoxPlotStats,
    CategoryCount,
    ColumnDistribution,
    ColumnQualityMetric,
    CorrelationMatrixResponse,
    DatasetDistributionsResponse,
    DatasetQualityResponse,
    DatasetRowsResponse,
    HistogramBin,
)
from app.services.datasets.dataset_service import sanitize_row_values


def _extract_finite_numeric(series: pl.Series) -> np.ndarray:
    """Extract a 1D float64 NumPy array of finite non-null values from a numeric Polars Series."""
    cleaned = series.drop_nulls().cast(pl.Float64)
    arr = cleaned.to_numpy()
    if arr.size == 0:
        return arr
    return arr[np.isfinite(arr)]


def _compute_boxplot_and_outliers(
    values: np.ndarray, max_sample_outliers: int = 50
) -> BoxPlotStats:
    q1 = float(np.percentile(values, 25))
    median = float(np.percentile(values, 50))
    q3 = float(np.percentile(values, 75))
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr

    outlier_mask = (values < lower_fence) | (values > upper_fence)
    outliers = values[outlier_mask]

    return BoxPlotStats(
        min=float(np.min(values)),
        q1=q1,
        median=median,
        q3=q3,
        max=float(np.max(values)),
        iqr=iqr,
        lower_fence=lower_fence,
        upper_fence=upper_fence,
        outlier_count=int(outliers.size),
        sample_outliers=[float(v) for v in outliers[:max_sample_outliers]],
    )


class DatasetAnalysisService:
    """Deterministic statistical profiling, quality, distribution, and correlation analysis."""

    @staticmethod
    def query_rows(
        df: pl.DataFrame,
        dataset_id: str,
        search: str | None = None,
        filter_col: str | None = None,
        filter_value: str | None = None,
        sort_by: str | None = None,
        sort_desc: bool = False,
        offset: int = 0,
        limit: int = 50,
    ) -> DatasetRowsResponse:
        total_rows = df.height
        filtered_df = df

        if filter_col is not None and filter_col != "":
            if filter_col not in df.columns:
                raise ValueError(f"Filter column '{filter_col}' does not exist in dataset.")
            if filter_value is not None and filter_value != "":
                needle = filter_value.strip().lower()
                filtered_df = filtered_df.filter(
                    pl.col(filter_col)
                    .cast(pl.Utf8)
                    .fill_null("")
                    .str.to_lowercase()
                    .str.contains(needle, literal=True)
                )

        if search is not None and search.strip() != "":
            needle = search.strip().lower()
            search_expr = pl.any_horizontal(
                [
                    pl.col(col)
                    .cast(pl.Utf8)
                    .fill_null("")
                    .str.to_lowercase()
                    .str.contains(needle, literal=True)
                    for col in filtered_df.columns
                ]
            )
            filtered_df = filtered_df.filter(search_expr)

        filtered_rows = filtered_df.height

        if sort_by is not None and sort_by != "":
            if sort_by not in df.columns:
                raise ValueError(f"Sort column '{sort_by}' does not exist in dataset.")
            filtered_df = filtered_df.sort(sort_by, descending=sort_desc, nulls_last=True)

        clamped_offset = max(0, offset)
        clamped_limit = max(1, min(limit, 500))
        page_df = filtered_df.slice(clamped_offset, clamped_limit)
        rows = sanitize_row_values(page_df.to_dicts())

        return DatasetRowsResponse(
            dataset_id=dataset_id,
            total_rows=total_rows,
            filtered_rows=filtered_rows,
            offset=clamped_offset,
            limit=clamped_limit,
            columns=df.columns,
            rows=rows,
        )

    @staticmethod
    def compute_distributions(
        df: pl.DataFrame,
        dataset_id: str,
        bins: int = 15,
        top_categories: int = 15,
    ) -> DatasetDistributionsResponse:
        effective_bins = max(2, min(bins, 100))
        total_count = df.height
        distributions: list[ColumnDistribution] = []

        for col_name in df.columns:
            series = df[col_name]
            dtype_str = str(series.dtype)

            if series.dtype.is_numeric() and series.dtype != pl.Boolean:
                values = _extract_finite_numeric(series)
                non_null_count = int(values.size)

                histogram_bins: list[HistogramBin] = []
                boxplot_stats: BoxPlotStats | None = None

                if non_null_count > 0:
                    boxplot_stats = _compute_boxplot_and_outliers(values)
                    val_min = float(np.min(values))
                    val_max = float(np.max(values))

                    if math.isclose(val_min, val_max):
                        histogram_bins = [
                            HistogramBin(start=val_min, end=val_max, count=non_null_count)
                        ]
                    else:
                        counts, edges = np.histogram(values, bins=effective_bins)
                        histogram_bins = [
                            HistogramBin(
                                start=float(edges[i]),
                                end=float(edges[i + 1]),
                                count=int(counts[i]),
                            )
                            for i in range(len(counts))
                        ]

                distributions.append(
                    ColumnDistribution(
                        column=col_name,
                        dtype=dtype_str,
                        kind="numeric",
                        total_count=total_count,
                        non_null_count=non_null_count,
                        histogram=histogram_bins,
                        boxplot=boxplot_stats,
                    )
                )
            else:
                non_null = series.drop_nulls().cast(pl.Utf8)
                non_null_count = non_null.len()
                categories: list[CategoryCount] = []
                if non_null_count > 0:
                    vc = non_null.value_counts(sort=True).head(top_categories).to_dicts()
                    for item in vc:
                        val_str = str(item[col_name])
                        count = int(item["count"])
                        pct = round((count / non_null_count) * 100.0, 2)
                        categories.append(CategoryCount(value=val_str, count=count, percentage=pct))

                distributions.append(
                    ColumnDistribution(
                        column=col_name,
                        dtype=dtype_str,
                        kind="categorical",
                        total_count=total_count,
                        non_null_count=non_null_count,
                        categories=categories,
                    )
                )

        return DatasetDistributionsResponse(
            dataset_id=dataset_id,
            bins=effective_bins,
            distributions=distributions,
        )

    @staticmethod
    def compute_quality(df: pl.DataFrame, dataset_id: str) -> DatasetQualityResponse:
        row_count = df.height
        column_count = df.width
        total_cells = row_count * column_count
        total_missing = 0
        col_metrics: list[ColumnQualityMetric] = []

        for col_name in df.columns:
            series = df[col_name]
            null_count = series.null_count()
            total_missing += null_count
            null_pct = round((null_count / row_count) * 100.0, 2) if row_count > 0 else 0.0
            unique_count = series.n_unique()
            non_null_unique = series.drop_nulls().n_unique()
            is_constant = non_null_unique <= 1

            iqr_outliers = 0
            zscore_outliers = 0
            outlier_pct = 0.0

            if series.dtype.is_numeric() and series.dtype != pl.Boolean:
                values = _extract_finite_numeric(series)
                if values.size > 0:
                    q1 = float(np.percentile(values, 25))
                    q3 = float(np.percentile(values, 75))
                    iqr = q3 - q1
                    lower_fence = q1 - 1.5 * iqr
                    upper_fence = q3 + 1.5 * iqr
                    iqr_outliers = int(np.sum((values < lower_fence) | (values > upper_fence)))

                    mean = float(np.mean(values))
                    std = float(np.std(values))
                    if std > 1e-12:
                        z_scores = np.abs((values - mean) / std)
                        zscore_outliers = int(np.sum(z_scores > 3.0))

                    outlier_pct = round((iqr_outliers / values.size) * 100.0, 2)

            col_metrics.append(
                ColumnQualityMetric(
                    column=col_name,
                    dtype=str(series.dtype),
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    is_constant=is_constant,
                    iqr_outlier_count=iqr_outliers,
                    zscore_outlier_count=zscore_outliers,
                    outlier_percentage=outlier_pct,
                )
            )

        completeness = (
            round(((total_cells - total_missing) / total_cells) * 100.0, 2)
            if total_cells > 0
            else 100.0
        )
        duplicate_rows = row_count - df.unique().height if row_count > 0 else 0

        return DatasetQualityResponse(
            dataset_id=dataset_id,
            row_count=row_count,
            column_count=column_count,
            total_cells=total_cells,
            total_missing_cells=total_missing,
            completeness_percentage=completeness,
            duplicate_row_count=duplicate_rows,
            columns=col_metrics,
        )

    @staticmethod
    def compute_correlations(
        df: pl.DataFrame,
        dataset_id: str,
        method: Literal["pearson", "spearman"] = "pearson",
    ) -> CorrelationMatrixResponse:
        numeric_cols = [
            col for col in df.columns if df[col].dtype.is_numeric() and df[col].dtype != pl.Boolean
        ]

        if len(numeric_cols) == 0:
            return CorrelationMatrixResponse(
                dataset_id=dataset_id,
                method=method,
                columns=[],
                matrix=[],
            )

        arrays = {col: df[col].cast(pl.Float64).to_numpy() for col in numeric_cols}

        n = len(numeric_cols)
        matrix: list[list[float | None]] = [[None for _ in range(n)] for _ in range(n)]

        for i in range(n):
            col_i = numeric_cols[i]
            arr_i = arrays[col_i]
            for j in range(i, n):
                if i == j:
                    valid_i = arr_i[np.isfinite(arr_i)]
                    matrix[i][j] = 1.0 if valid_i.size > 0 else None
                    continue

                col_j = numeric_cols[j]
                arr_j = arrays[col_j]
                mask = np.isfinite(arr_i) & np.isfinite(arr_j)
                if np.sum(mask) < 2:
                    corr_val = None
                else:
                    xi = arr_i[mask]
                    xj = arr_j[mask]
                    if np.std(xi) < 1e-12 or np.std(xj) < 1e-12:
                        corr_val = None
                    elif method == "pearson":
                        raw = float(np.corrcoef(xi, xj)[0, 1])
                        corr_val = round(raw, 4) if math.isfinite(raw) else None
                    else:
                        stat_res = spearmanr(xi, xj)
                        raw = float(stat_res.statistic)
                        corr_val = round(raw, 4) if math.isfinite(raw) else None

                matrix[i][j] = corr_val
                matrix[j][i] = corr_val

        return CorrelationMatrixResponse(
            dataset_id=dataset_id,
            method=method,
            columns=numeric_cols,
            matrix=matrix,
        )
