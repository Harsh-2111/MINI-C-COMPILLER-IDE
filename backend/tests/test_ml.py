from pathlib import Path

from fastapi.testclient import TestClient

import main
from ml.generate_dataset import FEATURE_COLUMNS
from ml.predict import MLAdvisor

BACKEND_DIR = Path(__file__).resolve().parents[1]
client = TestClient(main.app)


def test_trained_models_load_once_and_report_status():
    advisor = MLAdvisor()

    assert advisor.loaded
    assert advisor.model_types == {
        "error_classifier": "Pipeline",
        "optimization_classifier": "RandomForestClassifier",
        "optimization_regressor": "RandomForestRegressor",
    }
    response = client.get("/ml/status")
    assert response.status_code == 200
    status = response.json()
    assert status["loaded"] is True
    assert status["dataset_sizes"]["errors"] >= 2_500
    assert status["dataset_sizes"]["optimization"] >= 1_500


def test_held_out_error_classifier_accuracy_meets_target():
    response = client.get("/ml/status")

    assert response.json()["metrics"]["error_classifier_accuracy"] >= 0.90


def test_classifier_identifies_errors_from_real_sample_programs():
    samples = {
        "syntax_error.c": "missing_semicolon",
        "semantic_error.c": "undeclared_identifier",
        "lexical_error.c": "illegal_character",
    }
    for filename, category in samples.items():
        code = (BACKEND_DIR / "samples" / filename).read_text(encoding="utf-8")
        errors = client.post("/compile", json={"code": code}).json()["errors"]
        assert errors
        prediction = main.ml_advisor.predict_error(errors[0])
        assert prediction is not None
        assert prediction["category"] == category
        assert 0 <= prediction["confidence"] <= 1


def test_optimization_prediction_is_bounded_by_input_tac_length():
    features = {name: 0 for name in FEATURE_COLUMNS}
    features.update(
        tac_length=12,
        constant_ops_count=2,
        unused_assignments_count=1,
        branch_constants=1,
        loop_count=0,
        function_call_count=1,
        nesting_depth=2,
    )

    prediction = main.ml_advisor.predict_optimization(features)

    assert prediction is not None
    assert 0 <= prediction["estimated_reduction"] <= features["tac_length"]
    assert 0 <= prediction["confidence"] <= 1


def test_missing_model_artifacts_disable_advice_without_crashing(tmp_path):
    advisor = MLAdvisor(model_dir=tmp_path, data_dir=tmp_path)

    assert advisor.loaded is False
    assert advisor.predict_error("semantic Undeclared identifier 'item'") is None
    assert advisor.predict_optimization({"tac_length": 1}) is None


def test_compiler_output_is_identical_with_ml_available_or_disabled(monkeypatch, tmp_path):
    code = "int main() { int value = 1 + 2; return value; }"
    enabled = client.post("/compile", json={"code": code}).json()
    monkeypatch.setattr(
        main,
        "ml_advisor",
        MLAdvisor(model_dir=tmp_path / "missing", data_dir=tmp_path / "missing"),
    )
    disabled = client.post("/compile", json={"code": code}).json()

    assert enabled == disabled


def test_explain_and_advise_include_advisory_metadata():
    code = (BACKEND_DIR / "samples" / "semantic_error.c").read_text(encoding="utf-8")
    error = client.post("/compile", json={"code": code}).json()["errors"][0]
    explanation = client.post(
        "/explain",
        json={"code": code, "error": error},
    ).json()
    valid_code = "int main() { int value = 1 + 2; return value; }"
    compiled = client.post("/compile", json={"code": valid_code}).json()
    advice = client.post(
        "/advise",
        json={
            "code": valid_code,
            "tac": compiled["tac"],
            "optimized_tac": compiled["optimized_tac"],
        },
    ).json()

    for payload in (explanation, advice):
        assert "ml_category" in payload
        assert "ml_confidence" in payload
        assert payload["source"] in {"gemini+ml", "ml", "rule-based"}
    assert explanation["ml_category"] == "undeclared_identifier"
    assert isinstance(advice["ml_category"], str)
    assert isinstance(advice["ml_predicted_reduction"], float)
    assert advice["actual_reduction"] == max(
        0, len(compiled["tac"]) - len(compiled["optimized_tac"])
    )
