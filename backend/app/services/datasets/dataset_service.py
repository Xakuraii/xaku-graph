from pathlib import Path

import polars as pl

from app.core.config import settings
from app.schemas.dataset import ColumnDetail, DatasetInspectionResponse, DatasetSummary


class DatasetService:
    @staticmethod
    def inspect_dataframe(
        df: pl.DataFrame,
        dataset_id: str,
        name: str,
        source_format: str,
        is_sample: bool = False,
        max_preview: int = 50,
    ) -> DatasetInspectionResponse:
        row_count = df.height
        col_count = df.width
        columns_list = df.columns
        memory_bytes = df.estimated_size()

        col_details = []
        for col_name in columns_list:
            series = df[col_name]
            dtype_str = str(series.dtype)
            null_count = series.null_count()
            unique_count = series.n_unique()

            min_val = None
            max_val = None
            mean_val = None

            if series.dtype.is_numeric():
                non_null = series.drop_nulls()
                if non_null.len() > 0:
                    min_val = float(non_null.min())
                    max_val = float(non_null.max())
                    mean_val = float(non_null.mean())

            col_details.append(
                ColumnDetail(
                    name=col_name,
                    dtype=dtype_str,
                    null_count=null_count,
                    unique_count=unique_count,
                    min_value=min_val,
                    max_value=max_val,
                    mean_value=mean_val,
                )
            )

        preview_rows = df.head(max_preview).to_dicts()

        summary = DatasetSummary(
            id=dataset_id,
            name=name,
            row_count=row_count,
            column_count=col_count,
            columns=columns_list,
            memory_bytes=memory_bytes,
            is_sample=is_sample,
            source_format=source_format,
        )

        return DatasetInspectionResponse(
            summary=summary,
            columns=col_details,
            preview_rows=preview_rows,
            metadata={"row_preview_limit": max_preview},
        )

    @classmethod
    def load_sample_dataset(cls) -> DatasetInspectionResponse:
        sample_path = settings.SAMPLES_DIR / "iris_sample.csv"
        if not sample_path.exists():
            raise FileNotFoundError(f"Sample dataset file not found at {sample_path}")

        df = pl.read_csv(sample_path)
        return cls.inspect_dataframe(
            df=df,
            dataset_id="sample-iris-dataset",
            name="Iris Benchmark Sample (30 samples)",
            source_format="csv",
            is_sample=True,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )

    @classmethod
    def inspect_file(cls, file_path: Path, original_filename: str) -> DatasetInspectionResponse:
        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            df = pl.read_csv(file_path)
            format_name = "csv"
        elif suffix in [".json", ".jsonl"]:
            df = pl.read_ndjson(file_path) if suffix == ".jsonl" else pl.read_json(file_path)
            format_name = suffix.replace(".", "")
        elif suffix == ".parquet":
            df = pl.read_parquet(file_path)
            format_name = "parquet"
        else:
            raise ValueError(f"Unsupported dataset format: {suffix}")

        return cls.inspect_dataframe(
            df=df,
            dataset_id=file_path.stem,
            name=original_filename,
            source_format=format_name,
            is_sample=False,
            max_preview=settings.MAX_PREVIEW_ROWS,
        )
