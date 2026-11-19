# XakuGraph Backend Engine

Local-first, high-performance Python processing engine for XakuGraph.

## Architecture

- **FastAPI**: Asynchronous REST API serving web and desktop clients
- **Polars / NumPy**: Vectorized data manipulation and numerical computation
- **Scikit-learn**: Statistical metrics, PCA, and ML evaluation routines
- **Pydantic**: Strict data validation and schema serialization

## Directory Structure

- `app/api/`: Route handlers and endpoints
- `app/core/`: Configuration, application lifecycle, security
- `app/schemas/`: Pydantic request and response models
- `app/services/`: Core computational logic (datasets, embeddings, RAG, ML, vectors)
- `tests/`: Automated unit and integration tests
