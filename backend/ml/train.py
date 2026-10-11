"""Train and evaluate the optional compiler-advisory models."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from .generate_dataset import (
    DATA_DIR,
    FEATURE_COLUMNS,
    RANDOM_SEED,
    generate_datasets,
)

MODEL_DIR = Path(__file__).with_name("models")


def train_models(
    data_dir: Path | str = DATA_DIR,
    model_dir: Path | str = MODEL_DIR,
) -> dict[str, float | int]:
    dataset_dir = Path(data_dir)
    output_dir = Path(model_dir)
    error_path = dataset_dir / "errors.csv"
    optimization_path = dataset_dir / "optimization.csv"
    if not error_path.is_file() or not optimization_path.is_file():
        generate_datasets(dataset_dir)

    errors = pd.read_csv(error_path)
    optimization = pd.read_csv(optimization_path)
    if errors["category"].nunique() < 2 or optimization["has_reduction"].nunique() < 2:
        raise ValueError("Training requires multiple error categories and reduction classes")

    error_train, error_test = train_test_split(
        errors,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=errors["category"],
    )
    error_model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True),
            ),
            (
                "classifier",
                LogisticRegression(max_iter=1_000, random_state=RANDOM_SEED),
            ),
        ]
    )
    error_model.fit(error_train["text"], error_train["category"])
    error_accuracy = float(
        accuracy_score(error_test["category"], error_model.predict(error_test["text"]))
    )

    features = optimization[FEATURE_COLUMNS]
    labels = optimization["has_reduction"]
    train_indices, test_indices = train_test_split(
        optimization.index,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=labels,
    )
    feature_train = features.loc[train_indices]
    feature_test = features.loc[test_indices]
    label_train = labels.loc[train_indices]
    label_test = labels.loc[test_indices]
    reduction_train = optimization.loc[train_indices, "reduction"]
    reduction_test = optimization.loc[test_indices, "reduction"]

    optimization_classifier = RandomForestClassifier(
        n_estimators=160,
        random_state=RANDOM_SEED,
        class_weight="balanced",
    )
    optimization_classifier.fit(feature_train, label_train)
    optimization_accuracy = float(
        accuracy_score(label_test, optimization_classifier.predict(feature_test))
    )
    optimization_regressor = RandomForestRegressor(
        n_estimators=160,
        random_state=RANDOM_SEED,
    )
    optimization_regressor.fit(feature_train, reduction_train)
    reduction_mae = float(
        mean_absolute_error(
            reduction_test,
            optimization_regressor.predict(feature_test),
        )
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(error_model, output_dir / "error_classifier.joblib")
    joblib.dump(optimization_classifier, output_dir / "optimization_classifier.joblib")
    joblib.dump(optimization_regressor, output_dir / "optimization_regressor.joblib")
    metrics: dict[str, float | int] = {
        "error_classifier_accuracy": error_accuracy,
        "optimization_classifier_accuracy": optimization_accuracy,
        "optimization_regressor_mae": reduction_mae,
        "error_samples": int(len(errors)),
        "optimization_samples": int(len(optimization)),
        "random_seed": RANDOM_SEED,
        "error_train_fraction": 0.8,
        "error_test_fraction": 0.2,
    }
    (output_dir / "metrics.json").write_text(
        json.dumps(metrics, indent=2) + "\n",
        encoding="utf-8",
    )
    return metrics


def main() -> None:
    metrics = train_models()
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
