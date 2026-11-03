import json
from typing import Any, Dict, List, Optional
from core.rag.store import TenantVectorStore, tenant_vector_store


class RAGRetriever:
    """Orchestrates tenant-partitioned retrieval and synthesis for Agentix AI agents."""

    def __init__(self, store: Optional[TenantVectorStore] = None):
        self.store = store or tenant_vector_store

    def index_pipeline_run(
        self,
        tenant_id: str,
        dataset_name: str,
        eda_stats: Optional[Dict[str, Any]] = None,
        evaluation_data: Optional[Dict[str, Any]] = None,
        training_data: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Converts structured ML pipeline stage results into semantically indexed document passages."""
        indexed_count = 0

        # 1. Index EDA Statistics
        if eda_stats:
            eda_summary = (
                f"Dataset '{dataset_name}' EDA Profile:\n"
                f"Row Count: {eda_stats.get('row_count', 'unknown')}, Column Count: {eda_stats.get('column_count', 'unknown')}.\n"
                f"Missing Values: {eda_stats.get('missing_values', {})}.\n"
                f"Data Types: {eda_stats.get('data_types', {})}.\n"
                f"Summary Statistics: {json.dumps(eda_stats.get('statistics', {}), default=str)}"
            )
            self.store.ingest_text(
                tenant_id=tenant_id,
                text=eda_summary,
                dataset_name=dataset_name,
                metadata={"stage": "EDAAgent", "type": "eda_profile"},
            )
            indexed_count += 1

        # 2. Index Training Summary
        if training_data:
            model_name = training_data.get("model_name", training_data.get("best_model", "Standard Model"))
            train_summary = (
                f"Dataset '{dataset_name}' Model Training Artifacts:\n"
                f"Selected Architecture: {model_name}.\n"
                f"Training Parameters: {json.dumps(training_data.get('hyperparameters', {}), default=str)}.\n"
                f"Feature Importance: {json.dumps(training_data.get('feature_importance', {}), default=str)}."
            )
            self.store.ingest_text(
                tenant_id=tenant_id,
                text=train_summary,
                dataset_name=dataset_name,
                metadata={"stage": "TrainingAgent", "type": "model_training"},
            )
            indexed_count += 1

        # 3. Index Evaluation Metrics
        if evaluation_data:
            eval_summary = (
                f"Dataset '{dataset_name}' Model Evaluation Benchmarks:\n"
                f"Metrics: {json.dumps(evaluation_data.get('metrics', evaluation_data), default=str)}.\n"
                f"Validation Accuracy/R2: {evaluation_data.get('accuracy', evaluation_data.get('r2_score', 'N/A'))}.\n"
                f"Loss/RMSE: {evaluation_data.get('loss', evaluation_data.get('rmse', 'N/A'))}."
            )
            self.store.ingest_text(
                tenant_id=tenant_id,
                text=eval_summary,
                dataset_name=dataset_name,
                metadata={"stage": "EvaluationAgent", "type": "model_evaluation"},
            )
            indexed_count += 1

        return indexed_count

    def retrieve(
        self,
        tenant_id: str,
        query: str,
        dataset_name: Optional[str] = None,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Performs vector search strictly bounded by tenant_id."""
        matches = self.store.search(
            tenant_id=tenant_id,
            query=query,
            dataset_name=dataset_name,
            top_k=top_k,
        )
        results = []
        for doc, score in matches:
            results.append({
                "doc_id": doc.doc_id,
                "text": doc.text,
                "dataset_name": doc.dataset_name,
                "metadata": doc.metadata,
                "similarity_score": round(score, 4),
            })
        return results

    def format_context_block(self, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """Formats retrieved chunks into a clean, structured context string for prompt injection."""
        if not retrieved_chunks:
            return "No relevant context found in index."

        blocks = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            stage = chunk.get("metadata", {}).get("stage", "General")
            score = chunk.get("similarity_score", 0.0)
            blocks.append(
                f"[Passage {i} | Source: {stage} | Relevance: {score:.2f}]\n{chunk['text']}"
            )
        return "\n\n---\n\n".join(blocks)


rag_retriever = RAGRetriever()
