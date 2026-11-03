import math
import re
from dataclasses import dataclass
from typing import Dict, List, Set


@dataclass
class EvaluationReport:
    faithfulness_score: float     # Grounding in retrieved context (0.0 - 1.0)
    answer_relevancy_score: float # Direct alignment to user query (0.0 - 1.0)
    context_recall_score: float   # Information coverage (0.0 - 1.0)
    composite_score: float        # Weighted average (0.0 - 1.0)
    is_grounded: bool             # Threshold >= 0.70
    evaluation_metadata: Dict[str, float]


def _extract_keywords(text: str) -> Set[str]:
    """Extracts non-stopword tokens for factual grounding evaluation."""
    stopwords = {
        "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "of", "for",
        "it", "with", "as", "that", "this", "by", "from", "be", "are", "was", "were",
        "or", "if", "not", "but", "what", "how", "when", "where", "who", "data", "dataset"
    }
    words = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', text.lower())
    return {w for w in words if w not in stopwords}


class AIEvaluator:
    """Automated evaluation framework for assessing LLM factual grounding, hallucination,
    and response quality without external cloud API dependencies."""

    def evaluate_faithfulness(self, answer: str, context: str) -> float:
        """Calculates factual grounding: proportion of key claims in the answer that appear
        or are supported by the reference context."""
        ans_keywords = _extract_keywords(answer)
        if not ans_keywords:
            return 1.0

        ctx_keywords = _extract_keywords(context)
        if not ctx_keywords:
            # If no context was provided, pure guessing is ungrounded unless answer acknowledges it
            if any(phrase in answer.lower() for phrase in ["no data", "not available", "cannot find", "no context"]):
                return 1.0
            return 0.2

        supported_tokens = ans_keywords.intersection(ctx_keywords)
        score = len(supported_tokens) / len(ans_keywords)
        return round(min(1.0, max(0.0, score)), 4)

    def evaluate_relevancy(self, question: str, answer: str) -> float:
        """Measures whether the answer directly addresses keywords and entities in the question."""
        q_keywords = _extract_keywords(question)
        if not q_keywords:
            return 1.0

        ans_keywords = _extract_keywords(answer)
        overlap = q_keywords.intersection(ans_keywords)
        ratio = len(overlap) / len(q_keywords)
        return round(min(1.0, max(0.0, ratio)), 4)

    def evaluate_context_recall(self, question: str, context: str) -> float:
        """Measures whether the retrieved context contains the necessary information for the question."""
        q_keywords = _extract_keywords(question)
        if not q_keywords:
            return 1.0

        ctx_keywords = _extract_keywords(context)
        overlap = q_keywords.intersection(ctx_keywords)
        ratio = len(overlap) / len(q_keywords)
        return round(min(1.0, max(0.0, ratio)), 4)

    def evaluate(self, question: str, answer: str, context: str) -> EvaluationReport:
        faithfulness = self.evaluate_faithfulness(answer, context)
        relevancy = self.evaluate_relevancy(question, answer)
        context_recall = self.evaluate_context_recall(question, context)

        # Weighted composite: 50% Faithfulness, 30% Relevancy, 20% Context Recall
        composite = round(0.50 * faithfulness + 0.30 * relevancy + 0.20 * context_recall, 4)

        return EvaluationReport(
            faithfulness_score=faithfulness,
            answer_relevancy_score=relevancy,
            context_recall_score=context_recall,
            composite_score=composite,
            is_grounded=faithfulness >= 0.60,
            evaluation_metadata={
                "faithfulness": faithfulness,
                "relevancy": relevancy,
                "context_recall": context_recall,
                "composite": composite,
            },
        )


ai_evaluator = AIEvaluator()
