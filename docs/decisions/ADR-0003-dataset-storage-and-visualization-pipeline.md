# ADR-0003: Dataset Storage, Excel Engine, and Visualization Pipeline

## Status
Accepted

## Context
Phase 2 introduces local dataset ingestion (CSV, JSON, JSONL, Parquet, Excel), statistical profiling, outlier analysis, correlations, and interactive browser visualizations. We needed:
1. Fast persistent metadata and tabular caching across restarts without storing large data blobs in SQLite.
2. Reliable `.xlsx` ingestion compatible with Python 3.12 and Polars.
3. Responsive client-side charting without shipping full raw multi-megabyte datasets to the browser for histograms or box plots.

## Decision
1. **Metadata vs Tabular Storage Split:** Dataset metadata (`id`, `name`, `source_format`, counts, timestamps) is persisted in a local SQLite database (`data/xakugraph.db`). Processed tabular frames are cached as Apache Parquet files under `data/processed/{dataset_id}.parquet` for fast analytical queries.
2. **Excel Engine:** Use `fastexcel` (Polars `calamine` engine) for high-speed Rust-backed `.xlsx` reading.
3. **Server-Side Aggregation + Plotly Rendering:** Histogram bins, quartile box-plot fences, outlier counts, and correlation matrices are computed deterministically in Python (Polars/NumPy/SciPy) and rendered in the browser via `plotly.js-dist-min`.

## Consequences
- Fast repeated inspections and queries without re-parsing raw CSV/JSON/Excel files.
- Browser memory stays bounded regardless of dataset size.
- Built-in sample fixtures remain protected (`is_sample=True`) from accidental deletion.
