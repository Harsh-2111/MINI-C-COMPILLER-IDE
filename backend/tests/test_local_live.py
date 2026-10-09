"""Live local integration checks for the OptiLexis AI compiler API."""

from pathlib import Path

from fastapi.testclient import TestClient

from main import app


BACKEND = Path(__file__).resolve().parents[1]
client = TestClient(app)


def _sample(name: str) -> str:
    return (BACKEND / "samples" / name).read_text(encoding="utf-8")


def test_live_fibonacci_compilation_symbols_and_optimization_diff():
    response = client.post("/compile", json={"code": _sample("fibonacci.c")})

    assert response.status_code == 200
    result = response.json()
    assert result["errors"] == []
    assert result["ast"]["type"] == "Program"
    assert result["ast"]["children"]
    assert result["symbols"]
    fib_parameter = next(
        symbol for symbol in result["symbols"] if symbol["name"] == "n"
    )
    fib_local = next(
        symbol
        for symbol in result["symbols"]
        if symbol["name"] == "a" and symbol["scope"] == "fib()"
    )
    assert fib_parameter["scope"] == "fib()"
    assert fib_parameter["offset"] == 0
    assert fib_local["offset"] == 4
    assert result["tac"]
    assert isinstance(result["optimized_tac"], list)
    assert all(isinstance(instruction, str) for instruction in result["optimized_tac"])

    folded = client.post(
        "/compile",
        json={"code": _sample("constant_folding.c")},
    )
    assert folded.status_code == 200
    optimized = folded.json()
    assert optimized["errors"] == []
    assert optimized["tac"] != optimized["optimized_tac"]


def test_live_syntax_error_reports_missing_semicolon_on_expected_line():
    response = client.post("/compile", json={"code": _sample("syntax_error.c")})

    assert response.status_code == 200
    errors = response.json()["errors"]
    syntax_errors = [error for error in errors if error["phase"] == "syntax"]
    assert syntax_errors
    assert syntax_errors[0]["line"] == 3
    assert "Expected ';' before 'return'" in syntax_errors[0]["message"]


def test_live_semantic_error_reports_undeclared_identifier():
    response = client.post("/compile", json={"code": _sample("semantic_error.c")})

    assert response.status_code == 200
    errors = response.json()["errors"]
    assert {
        "phase": "semantic",
        "line": 2,
        "message": "Undeclared identifier 'missing_value'",
    } in errors


def test_live_explain_and_advise_fallback_payloads():
    compile_response = client.post("/compile", json={"code": _sample("fibonacci.c")})
    compiled = compile_response.json()
    error = {
        "phase": "semantic",
        "line": 2,
        "message": "Undeclared identifier 'missing_value'",
    }

    explain_response = client.post(
        "/explain",
        json={"code": _sample("semantic_error.c"), "error": error},
    )
    assert explain_response.status_code == 200
    explanation = explain_response.json()
    assert set(explanation) == {"explanation", "fix", "fixed_code"}
    assert "missing_value" in explanation["explanation"]
    assert explanation["fix"]

    advise_response = client.post(
        "/advise",
        json={
            "code": _sample("fibonacci.c"),
            "tac": compiled["tac"],
            "optimized_tac": compiled["optimized_tac"],
        },
    )
    assert advise_response.status_code == 200
    advice = advise_response.json()
    assert set(advice) == {"suggestions"}
    assert advice["suggestions"]
    assert {"title", "detail", "line"} <= set(advice["suggestions"][0])


def test_live_health_and_compile_never_return_server_error():
    health_response = client.get("/health")
    invalid_response = client.post("/compile", json={"code": "@@@"})

    assert health_response.status_code == 200
    assert health_response.json() == {"status": "ok"}
    assert invalid_response.status_code == 200
    assert invalid_response.json()["errors"]
