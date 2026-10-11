import asyncio
import json
import time
from types import SimpleNamespace

from ai import (
    CompileError,
    ExplanationResponse,
    _fallback_explanation,
    explain_error_with_source,
)


class _FakeModels:
    def __init__(self, text, delay=0):
        self.text = text
        self.delay = delay
        self.last_request = None

    def generate_content(self, **request):
        self.last_request = request
        if self.delay:
            time.sleep(self.delay)
        return SimpleNamespace(text=self.text)


class _FakeClient:
    def __init__(self, text, delay=0):
        self.models = _FakeModels(text, delay)


def _explain(client, monkeypatch, *, api_key="mock-key", timeout=0.2):
    import ai

    monkeypatch.setenv("GEMINI_API_KEY", api_key)
    monkeypatch.setattr(ai, "_TIMEOUT_SECONDS", timeout)
    monkeypatch.setattr(ai, "_client", lambda key: client)
    return asyncio.run(
        explain_error_with_source(
            "int main() { return missing; }",
            {
                "phase": "semantic",
                "line": 1,
                "message": "Undeclared identifier 'missing'",
            },
        )
    )


def test_gemini_accepts_valid_schema_constrained_json(monkeypatch):
    client = _FakeClient(
        json.dumps(
            {
                "explanation": "The identifier is not declared.",
                "fix": "Declare it before use.",
                "fixed_code": "int main() { int missing = 1; return missing; }",
            }
        )
    )

    response, gemini_used = _explain(client, monkeypatch)

    assert gemini_used is True
    assert isinstance(response, ExplanationResponse)
    assert response.explanation == "The identifier is not declared."
    assert client.models.last_request["config"].response_mime_type == "application/json"


def test_gemini_invalid_json_uses_deterministic_fallback(monkeypatch):
    response, gemini_used = _explain(_FakeClient("not JSON"), monkeypatch)

    assert gemini_used is False
    assert "missing" in response.explanation
    assert response.fixed_code == "int main() { return missing; }"


def test_gemini_timeout_uses_deterministic_fallback(monkeypatch):
    response, gemini_used = _explain(
        _FakeClient("{}", delay=0.1),
        monkeypatch,
        timeout=0.01,
    )

    assert gemini_used is False
    assert "missing" in response.explanation


def test_missing_gemini_key_uses_deterministic_fallback(monkeypatch):
    import ai

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(
        ai,
        "_client",
        lambda key: (_ for _ in ()).throw(AssertionError("client must not be created")),
    )
    response, gemini_used = asyncio.run(
        explain_error_with_source(
            "int main() { return missing; }",
            {
                "phase": "semantic",
                "line": 1,
                "message": "Undeclared identifier 'missing'",
            },
        )
    )

    assert gemini_used is False
    assert "missing" in response.explanation


def test_unquoted_printf_fallback_suggests_and_applies_string_quotes():
    source = (
        "int main() {\n"
        "    printf(Try clicking the Run button.);\n"
        "    return 0;\n"
        "}"
    )

    response = _fallback_explanation(
        source,
        CompileError(
            phase="syntax",
            line=2,
            message="Expected a quoted string literal as printf's first argument",
        ),
    )

    assert response.fixed_code == source.replace(
        "printf(Try clicking the Run button.);",
        'printf("Try clicking the Run button.");',
    )
    assert "quoted string literal" in response.explanation


def test_int_function_void_return_fallback_applies_integer_return():
    source = 'int main(){\nprintf("Hello world");\nreturn ;\n}'
    error = CompileError(
        phase="semantic",
        line=3,
        message="Type mismatch: function 'main' returns 'int' but got 'void'",
    )

    response = _fallback_explanation(source, error)

    assert response.fixed_code == (
        'int main(){\nprintf("Hello world");\nreturn 0;\n}'
    )
    assert "does not return a value" in response.explanation
    assert "Return an integer value" in response.fix


def test_int_function_void_return_uses_deterministic_fix_instead_of_bad_gemini(
    monkeypatch,
):
    import ai

    source = "int main() {\n  return ;\n}"
    error = {
        "phase": "semantic",
        "line": 2,
        "message": "Type mismatch: function 'main' returns 'int' but got 'void'",
    }
    monkeypatch.setenv("GEMINI_API_KEY", "mock-key")
    monkeypatch.setattr(
        ai,
        "_request_json",
        lambda *_args: (_ for _ in ()).throw(
            AssertionError("use deterministic fix for known return mismatch")
        ),
    )

    response, gemini_used = asyncio.run(ai.explain_error_with_source(source, error))

    assert gemini_used is False
    assert response.fixed_code == "int main() {\n  return 0;\n}"
