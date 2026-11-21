from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import datasets, embeddings, health, ml, rag, vectors
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="XakuGraph Local-first Data & AI Studio Processing Engine",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Enable CORS for local web development and Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(embeddings.router, prefix="/api/embeddings", tags=["Embeddings"])
app.include_router(ml.router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(vectors.router, prefix="/api/vectors", tags=["Vectors"])


@app.get("/")
def root():
    return {
        "app": "XakuGraph Backend",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
