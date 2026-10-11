"""Load trained advisory models once and provide bounded predictions."""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from .generate_dataset import (
    DATA_DIR,
    FEATURE_COLUMNS,
    _optimization_features,
)

_logger = logging.getLogger(__name__)
_MODEL_DIR = Path(__file__).with_name("models")


class MLAdvisor:
    """Optional prediction layer that never participates in compilation."""

    def __init__(
        self,
        model_dir: Path | str = _MODEL_DIR,
        data_dir: Path | str = DATA_DIR,
    ) -> None:
        self.model_dir = Path(model_dir)
        self.data_dir = Path(data_dir)
        self.error_classifier: Any | None = None
        self.optimization_classifier: Any | None = None
        self.optimization_regressor: Any | None = None
        self.metrics: dict[str, Any] = {}
        self.load_error: str | None = None
        self._load_models()

    @property
    def loaded(self) -> bool:
        return all(
            model is not None
            for model in (
                self.error_classifier,
                self.optimization_classifier,
                self.optimization_regressor,
            )
        )

    @property
    def model_types(self) -> dict[str, str | None]:
        return {
            "error_classifier": type(self.error_classifier).__name__
            if self.error_classifier is not None
            else None,
            "optimization_classifier": type(self.optimization_classifier).__name__
            if self.optimization_classifier is not None
            else None,
            "optimization_regressor": type(self.optimization_regressor).__name__
            if self.optimization_regressor is not None
            else None,
        }

    @property
    def dataset_sizes(self) -> dict[str, int]:
        return {
            "errors": _csv_row_count(self.data_dir / "errors.csv"),
            "optimization": _csv_row_count(self.data_dir / "optimization.csv"),
        }

    def _load_models(self) -> None:
        artifacts = {
            "error_classifier": self.model_dir / "error_classifier.joblib",
            "optimization_classifier": self.model_dir
            / "optimization_classifier.joblib",
            "optimization_regressor": self.model_dir
            / "optimization_regressor.joblib",
        }
        missing = [path.name for path in artifacts.values() if not path.is_file()]
        if missing:
            self.load_error = f"Missing model artifact(s): {', '.join(missing)}"
            _logger.info("%s; ML advice is disabled", self.load_error)
            return
        try:
            self.error_classifier = joblib.load(artifacts["error_classifier"])
            self.optimization_classifier = joblib.load(
                artifacts["optimization_classifier"]
            )
            self.optimization_regressor = joblib.load(
                artifacts["optimization_regressor"]
            )
            metrics_file = self.model_dir / "metrics.json"
            if metrics_file.is_file():
                self.metrics = json.loads(metrics_file.read_text(encoding="utf-8"))
        except Exception as exception:
            self.error_classifier = None
            self.optimization_classifier = None
            self.optimization_regressor = None
            self.load_error = f"Unable to load ML model artifacts: {exception}"
            _logger.exception("%s", self.load_error)

    def predict_error(self, diagnostic: dict[str, Any] | str) -> dict[str, Any] | None:
        if self.error_classifier is None:
            return None
        if isinstance(diagnostic, str):
            text = diagnostic
        else:
            text = f"{diagnostic.get('phase', '')} {diagnostic.get('message', '')}"
        probabilities = self.error_classifier.predict_proba([text])[0]
        class_index = int(probabilities.argmax())
        category = str(self.error_classifier.classes_[class_index])
        return {
            "category": category,
            "confidence": float(probabilities[class_index]),
        }

    def predict_optimization(
        self, features: dict[str, int | float]
    ) -> dict[str, Any] | None:
        if self.optimization_classifier is None or self.optimization_regressor is None:
            return None
        vector = pd.DataFrame(
            [[float(features.get(name, 0)) for name in FEATURE_COLUMNS]],
            columns=FEATURE_COLUMNS,
        )
        probabilities = self.optimization_classifier.predict_proba(vector)[0]
        class_index = int(probabilities.argmax())
        has_reduction = int(self.optimization_classifier.classes_[class_index])
        estimated_reduction = float(self.optimization_regressor.predict(vector)[0])
        tac_length = max(0, int(features.get("tac_length", 0)))
        return {
            "category": "optimization_reduction" if has_reduction else "no_reduction",
            "confidence": float(probabilities[class_index]),
            "estimated_reduction": max(0.0, min(float(tac_length), estimated_reduction)),
        }

    def predict_program_optimization(
        self,
        code: str,
        tac: list[str],
        optimized_tac: list[str],
    ) -> dict[str, Any] | None:
        features = _optimization_features(code, tac, optimized_tac)
        return self.predict_optimization(features)


def _csv_row_count(path: Path) -> int:
    if not path.is_file():
        return 0
    with path.open("r", encoding="utf-8", newline="") as dataset:
        return max(0, sum(1 for _ in csv.reader(dataset)) - 1)
