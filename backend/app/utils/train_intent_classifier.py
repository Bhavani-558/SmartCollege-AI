"""Train and evaluate TF-IDF + Logistic Regression student intent classifier."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import matplotlib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.intent_classifier import (  # noqa: E402
    DEFAULT_CONFIDENCE_THRESHOLD,
    clear_classifier_cache,
    normalize_query,
    predict_intent,
)

DATASET_PATH = PROJECT_ROOT / "dataset" / "processed" / "student_intents.json"
MODELS_DIR = PROJECT_ROOT / "backend" / "app" / "models"
DOCS_DIR = PROJECT_ROOT / "docs"
CONFUSION_IMAGE_PATH = DOCS_DIR / "confusion_matrix.png"
REPORT_PATH = DOCS_DIR / "model_evaluation_report.md"

RANDOM_STATE = 42
TEST_SIZE = 0.20
TFIDF_PARAMS: dict[str, Any] = {
    "lowercase": True,
    "analyzer": "char_wb",
    "ngram_range": [3, 5],
    "sublinear_tf": True,
}
LOGREG_PARAMS: dict[str, Any] = {
    "C": 10.0,
    "max_iter": 1000,
    "random_state": RANDOM_STATE,
}


def load_intent_dataset(dataset_path: Path) -> tuple[list[str], list[str], dict[str, int]]:
    """Load patterns and intent labels strictly read-only from student_intents.json."""
    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    texts: list[str] = []
    labels: list[str] = []
    class_counts: dict[str, int] = {}

    for entry in raw["intents"]:
        intent_name = entry["intent"]
        patterns = [normalize_query(p) for p in entry["patterns"] if normalize_query(p)]
        class_counts[intent_name] = len(patterns)
        for pat in patterns:
            texts.append(pat)
            labels.append(intent_name)

    return texts, labels, class_counts


def build_vectorizer() -> TfidfVectorizer:
    """Create configured TfidfVectorizer instance."""
    params = dict(TFIDF_PARAMS)
    params["ngram_range"] = tuple(params["ngram_range"])
    return TfidfVectorizer(**params)


def build_classifier() -> LogisticRegression:
    """Create configured LogisticRegression instance."""
    return LogisticRegression(**LOGREG_PARAMS)


def save_confusion_matrix_plot(
    cm: np.ndarray, labels: list[str], output_path: Path
) -> None:
    """Render and save a labeled 30x30 confusion matrix heatmap."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(14, 12))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)

    ticks = np.arange(len(labels))
    ax.set_xticks(ticks)
    ax.set_yticks(ticks)
    ax.set_xticklabels(labels, rotation=90, fontsize=8)
    ax.set_yticklabels(labels, fontsize=8)
    ax.set_ylabel("True Intent", fontsize=10)
    ax.set_xlabel("Predicted Intent", fontsize=10)
    ax.set_title("Student Intent Classifier Confusion Matrix (Hold-out Test Split)", fontsize=12)

    thresh = cm.max() / 2.0 if cm.size else 0.5
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            if cm[i, j] > 0:
                ax.text(
                    j,
                    i,
                    str(cm[i, j]),
                    ha="center",
                    va="center",
                    fontsize=7,
                    color="white" if cm[i, j] > thresh else "black",
                )

    fig.tight_layout()
    fig.savefig(output_path, dpi=180)
    plt.close(fig)


def generate_evaluation_report(
    metadata: dict[str, Any],
    labels: list[str],
    cm: np.ndarray,
    report_dict: dict[str, Any],
    probe_results: list[dict[str, Any]],
) -> str:
    """Build docs/model_evaluation_report.md strictly from observed evaluation outputs."""
    holdout = metadata["holdout_evaluation"]
    cv = metadata["cross_validation_5fold"]
    misclassified = metadata["misclassified_test_samples"]

    lines: list[str] = [
        "# NLP Intent Classifier Model Evaluation Report",
        "",
        "**Project:** AI-Powered Multi-College Chatbot for Student Queries  ",
        "**Dataset:** `dataset/processed/student_intents.json`  ",
        "**Model Architecture:** Scikit-learn `TfidfVectorizer` (`char_wb`, n-grams `3–5`, `sublinear_tf=True`) + `LogisticRegression` (`C=10.0`, `max_iter=1000`)  ",
        f"**Saved Artifacts:** `backend/app/models/tfidf_vectorizer.joblib`, `backend/app/models/intent_classifier.joblib`, `backend/app/models/model_metadata.json`  ",
        f"**Confidence Threshold:** `{metadata['default_confidence_threshold']}` (predictions below threshold return `intent = \"unknown\"`)  ",
        f"**Evaluated On:** {metadata['trained_at_utc']}",
        "",
        "> **Scope Note:** The intent classifier predicts student query intents independently of college FAQ availability. Categories such as `fees`, `scholarships`, `placements`, `internships`, and `hostel` remain preserved in the classifier while their college-specific answers stay `PENDING_VERIFICATION` until verified institutional sources are added. `dataset/raw/model.h5` was not used.",
        "",
        "---",
        "",
        "## 1. Dataset & Stratified Split Summary",
        "",
        "| Metric | Value |",
        "| --- | ---: |",
        f"| **Total Intents (Classes)** | {metadata['num_classes']} |",
        f"| **Total Cleaned Patterns** | {metadata['total_samples']} |",
        f"| **Training Split (80% Stratified)** | {metadata['train_samples']} |",
        f"| **Hold-Out Test Split (20% Stratified)** | {metadata['test_samples']} |",
        f"| **Random Seed** | {RANDOM_STATE} |",
        "",
        "---",
        "",
        "## 2. Overall Evaluation Metrics",
        "",
        "### 2.1 Hold-Out Test Split Metrics (Unseen 20%, `n = " + str(metadata['test_samples']) + "`)",
        "",
        "| Metric | Score |",
        "| --- | ---: |",
        f"| **Accuracy** | **{holdout['accuracy']:.4f}** ({holdout['accuracy']*100:.2f}%) |",
        f"| **Precision (Macro Avg)** | {holdout['precision_macro']:.4f} |",
        f"| **Precision (Weighted Avg)** | {holdout['precision_weighted']:.4f} |",
        f"| **Recall (Macro Avg)** | {holdout['recall_macro']:.4f} |",
        f"| **Recall (Weighted Avg)** | {holdout['recall_weighted']:.4f} |",
        f"| **F1-Score (Macro Avg)** | **{holdout['f1_macro']:.4f}** |",
        f"| **F1-Score (Weighted Avg)** | **{holdout['f1_weighted']:.4f}** |",
        "",
        "### 2.2 5-Fold Stratified Cross-Validation (`n = " + str(metadata['total_samples']) + "`)",
        "",
        "| Metric | Mean | Std Dev |",
        "| --- | ---: | ---: |",
        f"| **CV Accuracy** | {cv['accuracy_mean']:.4f} | ± {cv['accuracy_std']:.4f} |",
        f"| **CV Precision (Macro)** | {cv['precision_macro_mean']:.4f} | ± {cv['precision_macro_std']:.4f} |",
        f"| **CV Recall (Macro)** | {cv['recall_macro_mean']:.4f} | ± {cv['recall_macro_std']:.4f} |",
        f"| **CV F1-Score (Macro)** | {cv['f1_macro_mean']:.4f} | ± {cv['f1_macro_std']:.4f} |",
        "",
        "---",
        "",
        "## 3. Per-Class Classification Report (Hold-Out Test Split)",
        "",
        "| Intent | Precision | Recall | F1-Score | Support |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]

    for lbl in labels:
        row = report_dict[lbl]
        lines.append(
            f"| `{lbl}` | {row['precision']:.4f} | {row['recall']:.4f} | {row['f1-score']:.4f} | {int(row['support'])} |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 4. Confusion Matrix & Error Analysis",
        "",
        "Visual heatmap saved to `docs/confusion_matrix.png`.",
        "",
    ])

    if misclassified:
        lines.extend([
            f"### 4.1 Misclassified Hold-Out Test Samples ({len(misclassified)} of {metadata['test_samples']})",
            "",
            "| Test Pattern | True Intent | Predicted Intent | Confidence |",
            "| --- | --- | --- | ---: |",
        ])
        for item in misclassified:
            lines.append(
                f"| `{item['text']}` | `{item['true_intent']}` | `{item['predicted_intent']}` | {item['confidence']:.4f} |"
            )
    else:
        lines.append("All hold-out test samples were classified correctly (0 misclassifications).")

    short_labels = [f"C{i+1:02d}" for i in range(len(labels))]
    lines.extend([
        "",
        "### 4.2 Full 30x30 Confusion Matrix (Hold-Out Test Split)",
        "",
        "Class index legend: " + ", ".join(f"`{short_labels[i]}`={labels[i]}" for i in range(len(labels))),
        "",
        "| True \\ Pred | " + " | ".join(short_labels) + " |",
        "| --- | " + " | ".join(["---:"] * len(short_labels)) + " |",
    ])

    for i, lbl in enumerate(labels):
        row_vals = " | ".join(str(int(cm[i, j])) for j in range(len(labels)))
        lines.append(f"| `{short_labels[i]}` (`{lbl}`) | {row_vals} |")

    lines.extend([
        "",
        "---",
        "",
        "## 5. Confidence Threshold Verification (`predict_intent`)",
        "",
        f"Threshold configured at **`{metadata['default_confidence_threshold']}`** in `backend/app/services/intent_classifier.py`.",
        "",
        "| Input Query | Expected Behavior | Predicted `intent` | Raw Candidate | Confidence | `is_unknown` |",
        "| --- | --- | --- | --- | ---: | --- |",
    ])

    for pr in probe_results:
        cand = pr["candidate_intent"] if pr["candidate_intent"] else "None"
        lines.append(
            f"| `{pr['query']}` | {pr['expected_kind']} | `{pr['intent']}` | `{cand}` | {pr['confidence']:.4f} | `{pr['is_unknown']}` |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 6. Artifacts Produced",
        "",
        "- `backend/app/models/tfidf_vectorizer.joblib` — Final fitted TF-IDF vectorizer",
        "- `backend/app/models/intent_classifier.joblib` — Final fitted Logistic Regression classifier",
        "- `backend/app/models/model_metadata.json` — Model configuration, labels, threshold, and evaluation metrics",
        "- `backend/app/services/intent_classifier.py` — Reusable `IntentClassifier` and `predict_intent()` service",
        "- `backend/app/utils/train_intent_classifier.py` — Reproducible training and evaluation script",
        "- `docs/confusion_matrix.png` — Confusion matrix visualization",
        "- `docs/model_evaluation_report.md` — This evaluation report",
        "",
    ])

    return "\n".join(lines)


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    texts, labels, class_counts = load_intent_dataset(DATASET_PATH)
    unique_labels = sorted(class_counts.keys())

    # 1. Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=labels,
    )

    # 2. Fit ONLY on X_train for unbiased hold-out evaluation
    eval_vectorizer = build_vectorizer()
    X_train_vec = eval_vectorizer.fit_transform(X_train)
    X_test_vec = eval_vectorizer.transform(X_test)

    eval_clf = build_classifier()
    eval_clf.fit(X_train_vec, y_train)

    y_pred = eval_clf.predict(X_test_vec)
    y_probs = eval_clf.predict_proba(X_test_vec)
    pred_confidences = y_probs.max(axis=1)

    holdout_metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_weighted": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
    }

    report_dict = classification_report(
        y_test, y_pred, labels=unique_labels, output_dict=True, zero_division=0
    )
    report_text = classification_report(
        y_test, y_pred, labels=unique_labels, zero_division=0
    )
    cm = confusion_matrix(y_test, y_pred, labels=unique_labels)

    misclassified = []
    for txt, truth, pred, conf in zip(X_test, y_test, y_pred, pred_confidences):
        if truth != pred:
            misclassified.append({
                "text": txt,
                "true_intent": truth,
                "predicted_intent": pred,
                "confidence": round(float(conf), 4),
            })

    # 3. 5-Fold Stratified Cross-Validation across all 367 patterns
    cv_pipeline = Pipeline([
        ("tfidf", build_vectorizer()),
        ("clf", build_classifier()),
    ])
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_validate(
        cv_pipeline,
        texts,
        labels,
        cv=skf,
        scoring={
            "accuracy": "accuracy",
            "precision_macro": "precision_macro",
            "recall_macro": "recall_macro",
            "f1_macro": "f1_macro",
        },
    )

    cv_metrics = {
        "accuracy_mean": float(np.mean(cv_scores["test_accuracy"])),
        "accuracy_std": float(np.std(cv_scores["test_accuracy"])),
        "precision_macro_mean": float(np.mean(cv_scores["test_precision_macro"])),
        "precision_macro_std": float(np.std(cv_scores["test_precision_macro"])),
        "recall_macro_mean": float(np.mean(cv_scores["test_recall_macro"])),
        "recall_macro_std": float(np.std(cv_scores["test_recall_macro"])),
        "f1_macro_mean": float(np.mean(cv_scores["test_f1_macro"])),
        "f1_macro_std": float(np.std(cv_scores["test_f1_macro"])),
    }

    # 4. Save confusion matrix plot
    save_confusion_matrix_plot(cm, unique_labels, CONFUSION_IMAGE_PATH)

    # 5. Fit final production vectorizer and classifier on full cleaned dataset
    final_vectorizer = build_vectorizer()
    X_all_vec = final_vectorizer.fit_transform(texts)
    final_clf = build_classifier()
    final_clf.fit(X_all_vec, labels)

    joblib.dump(final_vectorizer, MODELS_DIR / "tfidf_vectorizer.joblib")
    joblib.dump(final_clf, MODELS_DIR / "intent_classifier.joblib")

    metadata = {
        "model_type": "TfidfVectorizer + LogisticRegression",
        "dataset_path": "dataset/processed/student_intents.json",
        "trained_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "num_classes": len(unique_labels),
        "classes": unique_labels,
        "class_pattern_counts": class_counts,
        "total_samples": len(texts),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "stratified_split": {"test_size": TEST_SIZE, "random_state": RANDOM_STATE},
        "hyperparameters": {
            "tfidf": TFIDF_PARAMS,
            "logistic_regression": LOGREG_PARAMS,
        },
        "default_confidence_threshold": DEFAULT_CONFIDENCE_THRESHOLD,
        "holdout_evaluation": holdout_metrics,
        "cross_validation_5fold": cv_metrics,
        "misclassified_test_samples": misclassified,
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict,
    }
    (MODELS_DIR / "model_metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )

    # 6. Verify reusable prediction function & confidence threshold handling
    clear_classifier_cache()
    test_probes = [
        ("What is the semester tuition fee?", "In-domain (`fees`)"),
        ("Are scholarships available for BTech students?", "In-domain (`scholarships`)"),
        ("Which companies visit for placements?", "In-domain (`placements`)"),
        ("Does the college offer summer internships?", "In-domain (`internships`)"),
        ("Do you have hostel facilities?", "In-domain (`hostel`)"),
        ("How do I apply for admission?", "In-domain (`admissions`)"),
        ("Where is the college located?", "In-domain (`college_location`)"),
        ("Hello there", "In-domain (`greeting`)"),
        ("What is the weather in Hyderabad today?", "Out-of-domain (`unknown`)"),
        ("Tell me a funny joke about cats", "Out-of-domain (`unknown`)"),
        ("Who won the cricket world cup?", "Out-of-domain (`unknown`)"),
        ("asdfghjkl qwerty", "Gibberish (`unknown`)"),
        ("", "Empty input (`unknown`)"),
    ]
    probe_results = []
    for query, expected_kind in test_probes:
        res = predict_intent(query)
        res["expected_kind"] = expected_kind
        probe_results.append(res)

    # 7. Generate evaluation report
    report_md = generate_evaluation_report(
        metadata=metadata,
        labels=unique_labels,
        cm=cm,
        report_dict=report_dict,
        probe_results=probe_results,
    )
    REPORT_PATH.write_text(report_md, encoding="utf-8")

    # 8. Print concise evaluation summary to stdout
    print("=== TRAINING & EVALUATION COMPLETE ===")
    print(f"Samples: total={len(texts)}, train={len(X_train)}, test={len(X_test)}, classes={len(unique_labels)}")
    print("Hold-out Metrics:")
    for k, v in holdout_metrics.items():
        print(f"  {k}: {v:.4f}")
    print("5-Fold CV Metrics:")
    print(f"  accuracy: {cv_metrics['accuracy_mean']:.4f} +/- {cv_metrics['accuracy_std']:.4f}")
    print(f"  f1_macro: {cv_metrics['f1_macro_mean']:.4f} +/- {cv_metrics['f1_macro_std']:.4f}")
    print("\nClassification Report (Hold-out):")
    print(report_text)
    print(f"Misclassified ({len(misclassified)}/{len(X_test)}):")
    for m in misclassified:
        print(f"  {m}")
    print("\nSample Inference & Threshold Checks:")
    for pr in probe_results:
        print(
            f"  [{pr['expected_kind']}] {pr['query']!r} -> intent={pr['intent']!r} "
            f"(cand={pr['candidate_intent']!r}, conf={pr['confidence']:.4f}, unknown={pr['is_unknown']})"
        )


if __name__ == "__main__":
    main()

