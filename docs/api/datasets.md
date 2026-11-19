# Datasets API Specification

Base prefix: `/api/datasets`

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/datasets` | List all available datasets (built-in sample + user uploads) |
| `GET` | `/api/datasets/sample` | Inspect the built-in Iris benchmark sample fixture |
| `POST` | `/api/datasets/upload` | Multipart upload (`.csv`, `.json`, `.jsonl`, `.parquet`, `.xlsx`) with size & path validation |
| `GET` | `/api/datasets/{dataset_id}` | Retrieve dataset summary, column statistics, and preview rows |
| `DELETE` | `/api/datasets/{dataset_id}` | Delete an uploaded dataset (sample fixture returns `403 Forbidden`) |
| `GET` | `/api/datasets/{dataset_id}/rows` | Query paginated, searchable, filterable, and sortable rows |
| `GET` | `/api/datasets/{dataset_id}/distributions` | Compute numeric histogram bins, quartile box plots, and categorical frequencies |
| `GET` | `/api/datasets/{dataset_id}/quality` | Compute completeness score, missing values, duplicates, constant flags, and IQR/Z-score outliers |
| `GET` | `/api/datasets/{dataset_id}/correlations` | Compute Pearson (`method=pearson`) or Spearman (`method=spearman`) correlation matrix |

## Security & Limits
- Filename sanitization and `Path.resolve()` boundary checks prevent path traversal.
- Streaming upload enforcement rejects files exceeding `MAX_UPLOAD_SIZE_MB` with `413 Content Too Large`.
- Unsupported extensions are rejected with `400 Bad Request`.
