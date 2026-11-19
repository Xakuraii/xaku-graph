import importlib.util
import io
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Literal

import numpy as np
from PIL import Image
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import HashingVectorizer, TfidfVectorizer

EmbeddingModality = Literal["text", "image"]


class ModalityMismatchError(ValueError):
    """Raised when an embedding adapter is invoked with an incompatible modality."""


class AdapterUnavailableError(RuntimeError):
    """Raised when an optional embedding adapter's runtime dependencies are not installed."""


@dataclass(frozen=True)
class EmbeddingModelInfo:
    model_id: str
    name: str
    modality: EmbeddingModality
    dimensions: int
    description: str
    available: bool
    is_local_lightweight: bool
    install_hint: str | None = None


def _l2_normalize_rows(matrix: np.ndarray) -> np.ndarray:
    matrix = np.asarray(matrix, dtype=np.float32)
    if matrix.ndim == 1:
        matrix = matrix.reshape(1, -1)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    safe_norms = np.where(norms > 1e-12, norms, 1.0)
    return (matrix / safe_norms).astype(np.float32)


def _has_package(package_name: str) -> bool:
    return importlib.util.find_spec(package_name) is not None


class EmbeddingModelAdapter(ABC):
    """Extensible interface for text and image embedding model adapters."""

    model_id: str
    name: str
    modality: EmbeddingModality
    dimensions: int
    description: str
    is_local_lightweight: bool = True
    install_hint: str | None = None

    @property
    def available(self) -> bool:
        return True

    def info(self) -> EmbeddingModelInfo:
        return EmbeddingModelInfo(
            model_id=self.model_id,
            name=self.name,
            modality=self.modality,
            dimensions=self.dimensions,
            description=self.description,
            available=self.available,
            is_local_lightweight=self.is_local_lightweight,
            install_hint=self.install_hint if not self.available else None,
        )

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        if self.modality != "text":
            raise ModalityMismatchError(
                f"Model '{self.model_id}' is an '{self.modality}' model and cannot embed text."
            )
        if not self.available:
            raise AdapterUnavailableError(
                f"Model '{self.model_id}' is unavailable. {self.install_hint or ''}".strip()
            )
        return self._embed_texts_impl(texts)

    def embed_images(self, image_bytes_list: list[bytes]) -> np.ndarray:
        if self.modality != "image":
            raise ModalityMismatchError(
                f"Model '{self.model_id}' is a '{self.modality}' model and cannot embed images."
            )
        if not self.available:
            raise AdapterUnavailableError(
                f"Model '{self.model_id}' is unavailable. {self.install_hint or ''}".strip()
            )
        return self._embed_images_impl(image_bytes_list)

    @abstractmethod
    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        """Compute text embeddings with shape (N, dimensions)."""

    @abstractmethod
    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        """Compute image embeddings with shape (N, dimensions)."""


class HashNGramTextAdapter(EmbeddingModelAdapter):
    """Deterministic local 128D text embedding via char/word n-gram hashing."""

    model_id = "local-text-hash-128"
    name = "Local Hash N-Gram Text (128D)"
    modality: EmbeddingModality = "text"
    dimensions = 128
    description = (
        "Deterministic, zero-download local text encoder combining word and character n-grams "
        "into L2-normalized 128D vectors."
    )
    is_local_lightweight = True

    def __init__(self) -> None:
        self._word_vec = HashingVectorizer(
            n_features=64,
            analyzer="word",
            ngram_range=(1, 2),
            alternate_sign=True,
            norm=None,
        )
        self._char_vec = HashingVectorizer(
            n_features=64,
            analyzer="char_wb",
            ngram_range=(3, 5),
            alternate_sign=True,
            norm=None,
        )

    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimensions), dtype=np.float32)
        cleaned = [t if t.strip() else " " for t in texts]
        w_mat = self._word_vec.transform(cleaned).toarray()
        c_mat = self._char_vec.transform(cleaned).toarray()
        combined = np.hstack([w_mat, c_mat]).astype(np.float32)
        return _l2_normalize_rows(combined)

    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        raise ModalityMismatchError("HashNGramTextAdapter only supports text.")


class TfidfSvdTextAdapter(EmbeddingModelAdapter):
    """Corpus-aware local 64D text embeddings using TF-IDF + Latent Semantic Analysis (SVD)."""

    model_id = "local-text-tfidf-64"
    name = "Local TF-IDF + SVD Text (64D)"
    modality: EmbeddingModality = "text"
    dimensions = 64
    description = (
        "Corpus-level semantic text vectors computed via TF-IDF and TruncatedSVD (LSA), "
        "L2-normalized to 64 dimensions."
    )
    is_local_lightweight = True

    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimensions), dtype=np.float32)
        cleaned = [t if t.strip() else "empty" for t in texts]
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=2048, sublinear_tf=True)
        try:
            tfidf = vectorizer.fit_transform(cleaned)
        except ValueError:
            return np.zeros((len(texts), self.dimensions), dtype=np.float32)

        n_samples, n_features = tfidf.shape
        if n_features <= self.dimensions or n_samples <= 2:
            dense = tfidf.toarray().astype(np.float32)
        else:
            n_comp = min(self.dimensions, n_features - 1, n_samples - 1)
            if n_comp >= 1:
                svd = TruncatedSVD(n_components=n_comp, random_state=42)
                dense = svd.fit_transform(tfidf).astype(np.float32)
            else:
                dense = tfidf.toarray().astype(np.float32)

        out = np.zeros((n_samples, self.dimensions), dtype=np.float32)
        copy_cols = min(self.dimensions, dense.shape[1])
        out[:, :copy_cols] = dense[:, :copy_cols]
        return _l2_normalize_rows(out)

    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        raise ModalityMismatchError("TfidfSvdTextAdapter only supports text.")


class VisualDescriptorImageAdapter(EmbeddingModelAdapter):
    """Deterministic local 96D image descriptor combining RGB histograms and 4x4 spatial patches."""

    model_id = "local-image-descriptor-96"
    name = "Local Visual Descriptor Image (96D)"
    modality: EmbeddingModality = "image"
    dimensions = 96
    description = (
        "Deterministic local image encoder extracting 16-bin RGB color histograms (48D) "
        "and a 4x4 spatial color grid (48D) into L2-normalized 96D vectors."
    )
    is_local_lightweight = True

    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        raise ModalityMismatchError("VisualDescriptorImageAdapter only supports images.")

    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        if not image_bytes_list:
            return np.zeros((0, self.dimensions), dtype=np.float32)

        vectors: list[np.ndarray] = []
        for raw_bytes in image_bytes_list:
            try:
                with Image.open(io.BytesIO(raw_bytes)) as img:
                    rgb = img.convert("RGB")
                    arr = np.asarray(rgb.resize((64, 64)), dtype=np.float32) / 255.0

                    # 48D color histogram (16 bins x 3 channels)
                    hist_parts = []
                    for channel in range(3):
                        counts, _ = np.histogram(
                            arr[:, :, channel], bins=16, range=(0.0, 1.0), density=False
                        )
                        hist_parts.append(
                            counts.astype(np.float32) / float(arr.shape[0] * arr.shape[1])
                        )
                    hist_vec = np.concatenate(hist_parts)

                    # 48D spatial 4x4 RGB patch means
                    grid = rgb.resize((4, 4))
                    grid_vec = (np.asarray(grid, dtype=np.float32) / 255.0).reshape(-1)

                    vectors.append(np.concatenate([hist_vec, grid_vec]))
            except Exception as err:
                raise ValueError(f"Failed to decode image for embedding: {err}") from err

        return _l2_normalize_rows(np.vstack(vectors))


class SentenceTransformerTextAdapter(EmbeddingModelAdapter):
    """Optional Sentence Transformers local neural text encoder (384D)."""

    model_id = "sentence-transformers/all-MiniLM-L6-v2"
    name = "all-MiniLM-L6-v2 (384D Neural)"
    modality: EmbeddingModality = "text"
    dimensions = 384
    description = "Dense semantic sentence transformer model (requires optional 'ml' dependencies)."
    is_local_lightweight = False
    install_hint = 'Install optional ML dependencies: uv pip install -e ".[ml]"'

    def __init__(self) -> None:
        self._model: Any = None

    @property
    def available(self) -> bool:
        return _has_package("sentence_transformers")

    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = self._model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
        return np.asarray(embeddings, dtype=np.float32)

    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        raise ModalityMismatchError("all-MiniLM-L6-v2 only supports text.")


class ClipImageAdapter(EmbeddingModelAdapter):
    """Optional CLIP local neural image encoder (512D)."""

    model_id = "sentence-transformers/clip-ViT-B-32"
    name = "CLIP ViT-B/32 Image (512D Neural)"
    modality: EmbeddingModality = "image"
    dimensions = 512
    description = (
        "Neural vision embedding model via Sentence Transformers CLIP "
        "(requires optional 'ml' dependencies)."
    )
    is_local_lightweight = False
    install_hint = 'Install optional ML dependencies: uv pip install -e ".[ml]"'

    def __init__(self) -> None:
        self._model: Any = None

    @property
    def available(self) -> bool:
        return _has_package("sentence_transformers")

    def _embed_texts_impl(self, texts: list[str]) -> np.ndarray:
        raise ModalityMismatchError("CLIP Image adapter is configured for image modality.")

    def _embed_images_impl(self, image_bytes_list: list[bytes]) -> np.ndarray:
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer("clip-ViT-B-32")
        pil_images = [Image.open(io.BytesIO(raw)).convert("RGB") for raw in image_bytes_list]
        embeddings = self._model.encode(
            pil_images, normalize_embeddings=True, convert_to_numpy=True
        )
        return np.asarray(embeddings, dtype=np.float32)


class EmbeddingAdapterRegistry:
    """Registry managing text and image embedding adapters with modality validation."""

    def __init__(self) -> None:
        self._adapters: dict[str, EmbeddingModelAdapter] = {}
        for adapter in (
            HashNGramTextAdapter(),
            TfidfSvdTextAdapter(),
            VisualDescriptorImageAdapter(),
            SentenceTransformerTextAdapter(),
            ClipImageAdapter(),
        ):
            self.register(adapter)

    def register(self, adapter: EmbeddingModelAdapter) -> None:
        self._adapters[adapter.model_id] = adapter

    def list_models(self, modality: EmbeddingModality | None = None) -> list[EmbeddingModelInfo]:
        infos = [a.info() for a in self._adapters.values()]
        if modality is not None:
            infos = [i for i in infos if i.modality == modality]
        return infos

    def get(
        self, model_id: str, expected_modality: EmbeddingModality | None = None
    ) -> EmbeddingModelAdapter:
        adapter = self._adapters.get(model_id)
        if adapter is None:
            raise ValueError(f"Unknown embedding model '{model_id}'.")
        if expected_modality is not None and adapter.modality != expected_modality:
            raise ModalityMismatchError(
                f"Model '{model_id}' has modality '{adapter.modality}', "
                f"but '{expected_modality}' was requested."
            )
        return adapter


embedding_adapter_registry = EmbeddingAdapterRegistry()
