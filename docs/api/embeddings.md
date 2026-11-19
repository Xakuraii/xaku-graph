# Embeddings API Specification

Base prefix: `/api/embeddings`

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/embeddings/models` | List registered text/image embedding adapters and runtime availability |
| `GET` | `/api/embeddings/reducers` | List dimensionality reduction adapters (`pca`, `tsne`, `umap`) and availability |
| `GET` | `/api/embeddings/spaces` | List cached embedding spaces (built-in sample + user-created) |
| `GET` | `/api/embeddings/sample` | Ensure and return the built-in 18-item AI & Data Concepts sample space |
| `POST` | `/api/embeddings/spaces/text` | Encode custom text/sentences/documents into a cached text embedding space |
| `POST` | `/api/embeddings/spaces/from-dataset` | Encode a text column + metadata columns from an existing dataset |
| `POST` | `/api/embeddings/spaces/image` | Multipart upload of local images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`) to an image space |
| `DELETE` | `/api/embeddings/spaces/{space_id}` | Delete a user-created embedding space (sample space returns `403 Forbidden`) |
| `POST` | `/api/embeddings/spaces/{space_id}/project` | Project vectors to 2D/3D (`pca`/`tsne`/`umap`), cluster high-dim vectors, and filter by metadata |
| `GET` | `/api/embeddings/spaces/{space_id}/points/{point_index}` | Inspect original item, vector stats, and exact high-dim nearest neighbors |
