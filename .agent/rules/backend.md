# Backend Engineering Rules

1. **Python 3.12 Standard:** Use modern built-in type syntax (`list`, `dict`, `int | None`).
2. **Polars for DataFrames:** Prefer Polars over Pandas for tabular operations due to memory efficiency and speed.
3. **Pydantic Validation:** All incoming payloads and outgoing API responses must be modeled with Pydantic v2 schemas.
4. **Error Propagation:** Always raise exceptions using `raise ... from err` to preserve tracebacks.
5. **Linting:** Enforce `ruff check` and `ruff format` before committing.
