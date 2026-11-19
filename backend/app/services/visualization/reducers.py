import importlib.util
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

ReductionMethod = Literal["pca", "tsne", "umap"]


class ReducerUnavailableError(RuntimeError):
    """Raised when an optional dimensionality reduction backend is not installed."""


@dataclass(frozen=True)
class ReducerInfo:
    method: ReductionMethod
    name: str
    description: str
    available: bool
    supports_3d: bool = True
    install_hint: str | None = None


@dataclass(frozen=True)
class ReductionResult:
    coordinates: np.ndarray
    explained_variance_ratio: list[float] | None
    effective_params: dict[str, Any]


def _pad_coordinates(coords: np.ndarray, target_dims: int) -> np.ndarray:
    coords = np.asarray(coords, dtype=np.float64)
    if coords.ndim == 1:
        coords = coords.reshape(-1, 1)
    if coords.shape[1] >= target_dims:
        return coords[:, :target_dims]
    padded = np.zeros((coords.shape[0], target_dims), dtype=np.float64)
    padded[:, : coords.shape[1]] = coords
    return padded


class DimensionalityReducer(ABC):
    """Extensible interface for dimensionality reduction algorithms."""

    method: ReductionMethod
    name: str
    description: str
    install_hint: str | None = None

    @property
    def available(self) -> bool:
        return True

    def info(self) -> ReducerInfo:
        return ReducerInfo(
            method=self.method,
            name=self.name,
            description=self.description,
            available=self.available,
            supports_3d=True,
            install_hint=self.install_hint if not self.available else None,
        )

    @abstractmethod
    def reduce(
        self,
        vectors: np.ndarray,
        n_components: int = 2,
        perplexity: float = 10.0,
    ) -> ReductionResult:
        """Project high-dimensional vectors into 2D or 3D coordinates for visualization only."""


class PCAReducer(DimensionalityReducer):
    method: ReductionMethod = "pca"
    name = "PCA (Principal Component Analysis)"
    description = "Deterministic linear projection maximizing global variance; returns explained variance ratio."

    def reduce(
        self,
        vectors: np.ndarray,
        n_components: int = 2,
        perplexity: float = 10.0,
    ) -> ReductionResult:
        n_samples, n_features = vectors.shape
        if n_samples == 0:
            return ReductionResult(
                coordinates=np.zeros((0, n_components), dtype=np.float64),
                explained_variance_ratio=[],
                effective_params={"n_components": n_components},
            )
        if n_samples == 1:
            return ReductionResult(
                coordinates=np.zeros((1, n_components), dtype=np.float64),
                explained_variance_ratio=[0.0] * n_components,
                effective_params={"n_components": n_components},
            )

        max_comp = min(n_components, n_samples, n_features)
        pca = PCA(n_components=max_comp, random_state=42)
        projected = pca.fit_transform(vectors)
        coords = _pad_coordinates(projected, n_components)
        variance = [round(float(v), 4) for v in pca.explained_variance_ratio_]

        return ReductionResult(
            coordinates=coords,
            explained_variance_ratio=variance,
            effective_params={"n_components": max_comp, "random_state": 42},
        )


class TSNEReducer(DimensionalityReducer):
    method: ReductionMethod = "tsne"
    name = "t-SNE (t-Distributed Stochastic Neighbor Embedding)"
    description = (
        "Non-linear neighborhood-preserving projection for exploring local embedding clusters."
    )

    def reduce(
        self,
        vectors: np.ndarray,
        n_components: int = 2,
        perplexity: float = 10.0,
    ) -> ReductionResult:
        n_samples = vectors.shape[0]
        if n_samples < 3:
            raise ValueError("t-SNE requires at least 3 items in the embedding space.")

        effective_perplexity = float(min(max(2.0, perplexity), max(2.0, n_samples - 1.0)))
        if effective_perplexity >= n_samples:
            effective_perplexity = max(1.0, n_samples - 1.0)

        tsne_method = "exact" if n_samples <= 50 or n_components == 3 else "barnes_hut"
        init_mode = "pca" if min(n_samples, vectors.shape[1]) > n_components else "random"

        tsne = TSNE(
            n_components=n_components,
            perplexity=effective_perplexity,
            init=init_mode,
            method=tsne_method,
            random_state=42,
            max_iter=500,
        )
        projected = tsne.fit_transform(vectors)
        return ReductionResult(
            coordinates=_pad_coordinates(projected, n_components),
            explained_variance_ratio=None,
            effective_params={
                "n_components": n_components,
                "perplexity": round(effective_perplexity, 2),
                "method": tsne_method,
            },
        )


class UMAPReducer(DimensionalityReducer):
    method: ReductionMethod = "umap"
    name = "UMAP (Uniform Manifold Approximation and Projection)"
    description = (
        "Fast manifold projection preserving both local neighborhoods and global structure "
        "(requires optional 'umap-learn')."
    )
    install_hint = 'Install optional ML dependencies: uv pip install -e ".[ml]"'

    @property
    def available(self) -> bool:
        return importlib.util.find_spec("umap") is not None

    def reduce(
        self,
        vectors: np.ndarray,
        n_components: int = 2,
        perplexity: float = 10.0,
    ) -> ReductionResult:
        if not self.available:
            raise ReducerUnavailableError(
                f"UMAP is unavailable because 'umap-learn' is not installed. {self.install_hint}"
            )
        n_samples = vectors.shape[0]
        if n_samples < 4:
            raise ValueError("UMAP requires at least 4 items in the embedding space.")

        import umap

        n_neighbors = int(min(max(2, round(perplexity)), n_samples - 1))
        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            random_state=42,
        )
        projected = reducer.fit_transform(vectors)
        return ReductionResult(
            coordinates=_pad_coordinates(projected, n_components),
            explained_variance_ratio=None,
            effective_params={"n_components": n_components, "n_neighbors": n_neighbors},
        )


class ReducerRegistry:
    def __init__(self) -> None:
        self._reducers: dict[ReductionMethod, DimensionalityReducer] = {
            "pca": PCAReducer(),
            "tsne": TSNEReducer(),
            "umap": UMAPReducer(),
        }

    def list_reducers(self) -> list[ReducerInfo]:
        return [r.info() for r in self._reducers.values()]

    def get(self, method: ReductionMethod) -> DimensionalityReducer:
        reducer = self._reducers.get(method)
        if reducer is None:
            raise ValueError(f"Unsupported reduction method '{method}'.")
        return reducer


reducer_registry = ReducerRegistry()
