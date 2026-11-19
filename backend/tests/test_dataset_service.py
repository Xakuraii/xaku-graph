from app.services.datasets.dataset_service import DatasetService


def test_load_sample_dataset():
    result = DatasetService.load_sample_dataset()
    assert result.summary.name == "Iris Benchmark Sample (30 samples)"
    assert result.summary.row_count == 30
    assert result.summary.column_count == 5
    assert result.summary.is_sample is True
    assert "sepal_length" in result.summary.columns
    assert "species" in result.summary.columns
    assert len(result.preview_rows) == 30

    # Verify column metrics
    sepal_len_col = next(c for c in result.columns if c.name == "sepal_length")
    assert sepal_len_col.null_count == 0
    assert sepal_len_col.unique_count > 0
    assert sepal_len_col.min_value is not None
    assert sepal_len_col.max_value is not None
    assert sepal_len_col.mean_value is not None
    assert sepal_len_col.min_value < sepal_len_col.max_value
