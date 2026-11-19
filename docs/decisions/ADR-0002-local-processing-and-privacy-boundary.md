# ADR-0002: Local Processing and Privacy Boundary

## Status
Accepted

## Context
Data privacy is essential for AI/ML engineers exploring proprietary models, corporate datasets, and production RAG databases.

## Decision
1. All dataset inspection, vector math, embedding transformations, and RAG inspections run strictly on local hardware.
2. The FastAPI service binds to `127.0.0.1` by default and enforces CORS restrictions.
3. No telemetry or remote error reporting is included in the application.
4. Database integrations (e.g., ChromaDB, Qdrant) must default to read-only mode to prevent unintended alteration of user data.

## Consequences
- Guarantees complete data confidentiality.
- Eliminates cloud hosting costs and third-party API dependencies.
