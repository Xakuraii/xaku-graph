from app.schemas.rag import (
    ConnectorType,
    CreateRagSandboxRequest,
    ExternalConnectionConfig,
    RagChunkComparisonItem,
    RagCollectionInspectResponse,
    RagCollectionListResponse,
    RagCollectionSummary,
    RagCompareRequest,
    RagCompareResponse,
    RagDeleteResponse,
    RagSearchRequest,
    RagSearchResponse,
    VectorDbConnectorInfo,
)
from app.services.vector_databases.connectors import vector_db_registry


class RagService:
    """Application service orchestrating read-only vector DB connectors, chunk inspection, and retrieval comparison."""

    def list_connectors(self) -> list[VectorDbConnectorInfo]:
        return vector_db_registry.list_connectors()

    def list_collections(
        self,
        connector_type: ConnectorType = "local_rag",
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionListResponse:
        connector = vector_db_registry.get(connector_type)
        collections = connector.list_collections(connection_config=connection_config)
        return RagCollectionListResponse(collections=collections, total=len(collections))

    def inspect_collection(
        self,
        collection_id: str,
        connector_type: ConnectorType = "local_rag",
        doc_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 50,
        connection_config: ExternalConnectionConfig | None = None,
    ) -> RagCollectionInspectResponse:
        connector = vector_db_registry.get(connector_type)
        return connector.inspect_collection(
            collection_id=collection_id,
            doc_id=doc_id,
            search=search,
            offset=offset,
            limit=limit,
            connection_config=connection_config,
        )

    def create_sandbox_collection(self, request: CreateRagSandboxRequest) -> RagCollectionSummary:
        docs = [doc.model_dump() for doc in request.documents]
        return vector_db_registry.local_rag.save_collection(
            name=request.name,
            documents=docs,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            model_id=request.model_id,
            is_sample=False,
        )

    def delete_sandbox_collection(self, collection_id: str) -> RagDeleteResponse:
        deleted = vector_db_registry.local_rag.delete_sandbox_collection(collection_id)
        return RagDeleteResponse(
            id=collection_id,
            deleted=deleted,
            message=f"RAG sandbox collection '{collection_id}' deleted successfully.",
        )

    def search(self, request: RagSearchRequest) -> RagSearchResponse:
        connector_type: ConnectorType = (
            request.connection_config.connector_type if request.connection_config else "local_rag"
        )
        connector = vector_db_registry.get(connector_type)
        summary, effective_model, query_vec, total_candidates, results = (
            connector.search_collection(
                collection_id=request.collection_id,
                query=request.query,
                top_k=request.top_k,
                metric=request.metric,
                model_id=request.model_id,
                filter_key=request.filter_key,
                filter_value=request.filter_value,
                connection_config=request.connection_config,
            )
        )

        preview_len = min(16, int(query_vec.size))
        return RagSearchResponse(
            collection_id=summary.id,
            query=request.query,
            metric=request.metric,
            model_id=effective_model,
            query_vector_dimension=int(query_vec.size),
            query_vector_preview=[round(float(v), 5) for v in query_vec[:preview_len]],
            total_candidates=total_candidates,
            results=results,
            similarity_basis="original_high_dimensional_vectors",
        )

    def compare(self, request: RagCompareRequest) -> RagCompareResponse:
        run_a = self.search(
            RagSearchRequest(
                collection_id=request.strategy_a.collection_id,
                query=request.query,
                top_k=request.strategy_a.top_k,
                metric=request.strategy_a.metric,
                model_id=request.strategy_a.model_id,
            )
        )
        run_b = self.search(
            RagSearchRequest(
                collection_id=request.strategy_b.collection_id,
                query=request.query,
                top_k=request.strategy_b.top_k,
                metric=request.strategy_b.metric,
                model_id=request.strategy_b.model_id,
            )
        )

        map_a = {item.chunk_id: item for item in run_a.results}
        map_b = {item.chunk_id: item for item in run_b.results}

        ordered_ids: list[str] = []
        for item in run_a.results:
            if item.chunk_id not in ordered_ids:
                ordered_ids.append(item.chunk_id)
        for item in run_b.results:
            if item.chunk_id not in ordered_ids:
                ordered_ids.append(item.chunk_id)

        overlap_ids = set(map_a.keys()) & set(map_b.keys())
        union_ids = set(map_a.keys()) | set(map_b.keys())
        jaccard = round(len(overlap_ids) / len(union_ids), 4) if union_ids else 0.0

        comparison_items: list[RagChunkComparisonItem] = []
        for cid in ordered_ids:
            hit_a = map_a.get(cid)
            hit_b = map_b.get(cid)
            ref = hit_a or hit_b
            assert ref is not None

            if hit_a and hit_b:
                status_val = "both"
                rank_delta = hit_a.rank - hit_b.rank
            elif hit_a:
                status_val = "only_a"
                rank_delta = None
            else:
                status_val = "only_b"
                rank_delta = None

            comparison_items.append(
                RagChunkComparisonItem(
                    chunk_id=cid,
                    doc_title=ref.doc_title,
                    chunk_index=ref.chunk_index,
                    rank_a=hit_a.rank if hit_a else None,
                    rank_b=hit_b.rank if hit_b else None,
                    rank_delta=rank_delta,
                    score_a=hit_a.score if hit_a else None,
                    score_b=hit_b.score if hit_b else None,
                    status=status_val,
                )
            )

        return RagCompareResponse(
            query=request.query,
            run_a=run_a,
            run_b=run_b,
            overlap_count=len(overlap_ids),
            jaccard_overlap=jaccard,
            comparison_items=comparison_items,
        )


rag_service = RagService()
