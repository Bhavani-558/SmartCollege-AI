"""Reusable TF-IDF + Logistic Regression intent classifier service."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

DEFAULT_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DEFAULT_VECTORIZER_NAME = "tfidf_vectorizer.joblib"
DEFAULT_MODEL_NAME = "intent_classifier.joblib"
DEFAULT_METADATA_NAME = "model_metadata.json"
DEFAULT_CONFIDENCE_THRESHOLD = 0.25


def normalize_query(text: str) -> str:
    """Normalize student query text consistently for TF-IDF vectorization."""
    if not isinstance(text, str):
        return ""
    cleaned = text.strip().lower()
    cleaned = re.sub(r"[,;:!?()\"']+", " ", cleaned)
    cleaned = re.sub(r"\.+(?=\s|$)", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class IntentClassifier:
    """Loads persisted TF-IDF vectorizer and Logistic Regression model for inference."""

    def __init__(
        self,
        models_dir: Path | str = DEFAULT_MODELS_DIR,
        confidence_threshold: float | None = None,
    ) -> None:
        self.models_dir = Path(models_dir)
        vectorizer_path = self.models_dir / DEFAULT_VECTORIZER_NAME
        model_path = self.models_dir / DEFAULT_MODEL_NAME
        metadata_path = self.models_dir / DEFAULT_METADATA_NAME

        if not vectorizer_path.exists():
            raise FileNotFoundError(f"Vectorizer artifact not found: {vectorizer_path}")
        if not model_path.exists():
            raise FileNotFoundError(f"Classifier artifact not found: {model_path}")

        self.vectorizer = joblib.load(vectorizer_path)
        self.model = joblib.load(model_path)

        metadata_threshold = DEFAULT_CONFIDENCE_THRESHOLD
        if metadata_path.exists():
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            metadata_threshold = float(
                metadata.get("default_confidence_threshold", DEFAULT_CONFIDENCE_THRESHOLD)
            )
        self.confidence_threshold = (
            float(confidence_threshold)
            if confidence_threshold is not None
            else metadata_threshold
        )

    def predict(
        self,
        query: str,
        threshold: float | None = None,
        top_k: int = 3,
    ) -> dict[str, Any]:
        """Predict student intent and confidence, flagging low-confidence queries as unknown."""
        active_threshold = self.confidence_threshold if threshold is None else float(threshold)
        normalized = normalize_query(query)

        if not normalized:
            return {
                "query": query,
                "normalized_query": "",
                "intent": "unknown",
                "candidate_intent": None,
                "confidence": 0.0,
                "is_unknown": True,
                "threshold": active_threshold,
                "top_candidates": [],
                "reason": "empty_query",
            }

        features = self.vectorizer.transform([normalized])
        probs = self.model.predict_proba(features)[0]
        classes = self.model.classes_

        sorted_indices = probs.argsort()[::-1]
        best_idx = int(sorted_indices[0])
        best_intent = str(classes[best_idx])
        best_prob = float(probs[best_idx])

        top_candidates = [
            {"intent": str(classes[int(idx)]), "confidence": round(float(probs[int(idx)]), 4)}
            for idx in sorted_indices[: max(1, top_k)]
        ]

        is_unknown = best_prob < active_threshold
        return {
            "query": query,
            "normalized_query": normalized,
            "intent": "unknown" if is_unknown else best_intent,
            "candidate_intent": best_intent,
            "confidence": round(best_prob, 4),
            "is_unknown": is_unknown,
            "threshold": active_threshold,
            "top_candidates": top_candidates,
            "reason": "below_confidence_threshold" if is_unknown else "matched",
        }


@lru_cache(maxsize=4)
def _get_cached_classifier(models_dir_str: str) -> IntentClassifier:
    return IntentClassifier(models_dir=models_dir_str)


def predict_intent(
    query: str,
    threshold: float | None = None,
    models_dir: Path | str = DEFAULT_MODELS_DIR,
    top_k: int = 3,
) -> dict[str, Any]:
    """Reusable module-level helper to predict intent with confidence threshold handling."""
    classifier = _get_cached_classifier(str(Path(models_dir).resolve()))
    return classifier.predict(query=query, threshold=threshold, top_k=top_k)


def clear_classifier_cache() -> None:
    """Clear the cached IntentClassifier instances."""
    _get_cached_classifier.cache_clear()
