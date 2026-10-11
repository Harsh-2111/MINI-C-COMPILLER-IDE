from pathlib import Path

from fastapi.testclient import TestClient

from main import app


BACKEND_DIR = Path(__file__).resolve().parents[1]
SAMPLES = [
    ("fibonacci.c", None),
    ("func_params.c", None),
    ("bool_if_else.c", None),
    ("constant_folding.c", None),
    ("syntax_error.c", "syntax"),
    ("semantic_error.c", "semantic"),
    ("lexical_error.c", "lexical"),
]
client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_localhost_frontend_origin_is_allowed_by_cors():
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "GET" in response.headers["access-control-allow-methods"]


def test_vercel_frontend_origin_is_allowed_by_cors():
    response = client.options(
        "/health",
        headers={
            "Origin": "https://cdcompiler.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://cdcompiler.vercel.app"
    assert "GET" in response.headers["access-control-allow-methods"]


def test_all_seven_samples_compile_through_pipeline_and_ai_routes():
    for filename, expected_error_phase in SAMPLES:
        code = (BACKEND_DIR / "samples" / filename).read_text(encoding="utf-8")
        compile_response = client.post("/compile", json={"code": code})

        assert compile_response.status_code == 200, filename
        result = compile_response.json()
        assert {"tokens", "ast", "symbols", "tac", "optimized_tac", "errors"} <= set(
            result
        )
        assert result["ast"]["type"] == "Program"

        if expected_error_phase is None:
            assert result["errors"] == [], filename
            assert result["tac"], filename
        else:
            assert expected_error_phase in {
                error["phase"] for error in result["errors"]
            }, filename

        error = result["errors"][0] if result["errors"] else {
            "phase": "semantic",
            "line": 1,
            "message": "No compilation errors were found.",
        }
        explain_response = client.post(
            "/explain",
            json={"code": code, "error": error},
        )
        assert explain_response.status_code == 200, filename
        explanation = explain_response.json()
        assert {"explanation", "fix", "fixed_code"} <= set(explanation)
        assert explanation["explanation"]
        assert explanation["fix"]

        advise_response = client.post(
            "/advise",
            json={
                "code": code,
                "tac": result["tac"],
                "optimized_tac": result["optimized_tac"],
            },
        )
        assert advise_response.status_code == 200, filename
        suggestions = advise_response.json()["suggestions"]
        assert isinstance(suggestions, list)
        assert suggestions
        assert {"title", "detail", "line"} <= set(suggestions[0])


def test_invalid_program_still_returns_compile_contract_without_server_error():
    response = client.post("/compile", json={"code": "@@@"})

    assert response.status_code == 200
    body = response.json()
    assert body["errors"]
    assert all(
        error["phase"] in {"lexical", "syntax", "semantic"}
        for error in body["errors"]
    )


def test_valid_c_printf_program_compiles_and_generates_tac():
    response = client.post(
        "/compile",
        json={
            "code": (
                '#include <stdio.h>\n'
                'int main() {\n'
                '    printf("Try clicking the Run button.");\n'
                '    return 0;\n'
                '}\n'
            )
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["errors"] == []
    assert any(token["type"] == "string" for token in result["tokens"])
    assert 'param "Try clicking the Run button."' in result["tac"]
    assert "t1 = call printf, 1" in result["tac"]


def test_unquoted_printf_text_gets_a_targeted_syntax_diagnostic():
    response = client.post(
        "/compile",
        json={
            "code": (
                "int main() {\n"
                "    printf(Try clicking the Run button.);\n"
                "    return 0;\n"
                "}\n"
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["errors"] == [
        {
            "phase": "syntax",
            "line": 2,
            "message": "Expected a quoted string literal as printf's first argument",
        }
    ]


def test_int_main_with_empty_return_gets_valid_explanation_fix():
    code = 'int main() {\nprintf("Hello world");\nreturn ;\n}'
    compile_result = client.post("/compile", json={"code": code}).json()
    error = next(
        error
        for error in compile_result["errors"]
        if "returns 'int' but got 'void'" in error["message"]
    )

    response = client.post(
        "/explain",
        json={"code": code, "error": error},
    )

    assert response.status_code == 200
    explanation = response.json()
    assert explanation["fixed_code"] == (
        'int main() {\nprintf("Hello world");\nreturn 0;\n}'
    )

    fixed_compile = client.post(
        "/compile",
        json={"code": explanation["fixed_code"]},
    ).json()
    assert fixed_compile["errors"] == []


def test_non_c_source_is_rejected_with_compiler_diagnostics():
    response = client.post(
        "/compile",
        json={"code": 'print("not C")'},
    )

    assert response.status_code == 200
    assert response.json()["errors"]


def test_empty_source_is_rejected_for_missing_main():
    response = client.post("/compile", json={"code": ""})

    assert response.status_code == 200
    assert {
        "phase": "semantic",
        "line": 1,
        "message": "Program must define 'int main()'",
    } in response.json()["errors"]
