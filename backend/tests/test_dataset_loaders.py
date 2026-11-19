from pathlib import Path

import polars as pl
import pytest

from app.services.datasets.loaders import (
    PathSecurityError,
    loader_registry,
    sanitize_filename,
    validate_safe_path,
)


def test_sanitize_filename_valid():
    assert sanitize_filename("my_data.CSV") == "my_data.csv"
    assert sanitize_filename("sales report 2026!.csv") == "sales_report_2026.csv"
    assert sanitize_filename("C:\\Users\\test\\folder\\metrics.parquet") == "metrics.parquet"
    assert sanitize_filename("nested/dir/records.jsonl") == "records.jsonl"


@pytest.mark.parametrize(
    "bad_name",
    [
        "",
        "../secret.csv",
        "..\\secret.csv",
        "dir/../../evil.csv",
        "bad\x00name.csv",
        ".csv",
        "no_extension",
        "..",
    ],
)
def test_sanitize_filename_rejects_unsafe_names(bad_name: str):
    with pytest.raises(PathSecurityError):
        sanitize_filename(bad_name)


def test_validate_safe_path_blocks_traversal(tmp_path: Path):
    base_dir = tmp_path / "uploads"
    base_dir.mkdir()
    outside = tmp_path / "outside.csv"
    outside.write_text("a,b\n1,2\n")

    with pytest.raises(PathSecurityError):
        validate_safe_path(base_dir, outside)

    inside = base_dir / "inside.csv"
    resolved = validate_safe_path(base_dir, inside)
    assert resolved == inside.resolve()


def test_load_all_supported_formats(tmp_path: Path):
    source_df = pl.DataFrame(
        {"id": [1, 2, 3], "score": [10.5, 20.0, 30.25], "label": ["a", "b", "c"]}
    )

    csv_path = tmp_path / "data.csv"
    source_df.write_csv(csv_path)
    df_csv, fmt_csv = loader_registry.load_file(csv_path)
    assert fmt_csv == "csv"
    assert df_csv.shape == (3, 3)

    json_path = tmp_path / "data.json"
    source_df.write_json(json_path)
    df_json, fmt_json = loader_registry.load_file(json_path)
    assert fmt_json == "json"
    assert df_json.shape == (3, 3)

    jsonl_path = tmp_path / "data.jsonl"
    source_df.write_ndjson(jsonl_path)
    df_jsonl, fmt_jsonl = loader_registry.load_file(jsonl_path)
    assert fmt_jsonl == "jsonl"
    assert df_jsonl.shape == (3, 3)

    parquet_path = tmp_path / "data.parquet"
    source_df.write_parquet(parquet_path)
    df_pq, fmt_pq = loader_registry.load_file(parquet_path)
    assert fmt_pq == "parquet"
    assert df_pq.shape == (3, 3)

    xlsx_path = tmp_path / "data.xlsx"
    source_df.write_excel(xlsx_path)
    df_xlsx, fmt_xlsx = loader_registry.load_file(xlsx_path)
    assert fmt_xlsx == "xlsx"
    assert df_xlsx.shape == (3, 3)
    assert df_xlsx["label"].to_list() == ["a", "b", "c"]


def test_unsupported_extension_raises_error(tmp_path: Path):
    bad_file = tmp_path / "payload.exe"
    bad_file.write_bytes(b"MZ")
    with pytest.raises(ValueError, match="Unsupported dataset format"):
        loader_registry.load_file(bad_file)
