from lexer import tokenize


def test_basic_tokens():
    tokens, errors = tokenize("int count = 12 + value;")

    assert errors == []
    assert tokens == [
        {"type": "keyword", "value": "int", "line": 1},
        {"type": "identifier", "value": "count", "line": 1},
        {"type": "operator", "value": "=", "line": 1},
        {"type": "number", "value": "12", "line": 1},
        {"type": "operator", "value": "+", "line": 1},
        {"type": "identifier", "value": "value", "line": 1},
        {"type": "punctuation", "value": ";", "line": 1},
    ]


def test_include_directive_is_ignored_and_keeps_source_line_numbers():
    tokens, errors = tokenize("#include <stdio.h>\nint main() { return 0; }")

    assert errors == []
    assert all(token["line"] == 2 for token in tokens)
    assert tokens[0] == {"type": "keyword", "value": "int", "line": 2}


def test_all_keywords_and_identifier_categories():
    source = "int float bool void if else while return true false _name name2"
    tokens, errors = tokenize(source)

    assert errors == []
    assert [token["type"] for token in tokens] == ["keyword"] * 10 + [
        "identifier",
        "identifier",
    ]


def test_operators_and_punctuation():
    tokens, errors = tokenize("+-*/% < > <= >= == != && || ! = ( ) { } , ;")

    assert errors == []
    assert [token["value"] for token in tokens] == [
        "+",
        "-",
        "*",
        "/",
        "%",
        "<",
        ">",
        "<=",
        ">=",
        "==",
        "!=",
        "&&",
        "||",
        "!",
        "=",
        "(",
        ")",
        "{",
        "}",
        ",",
        ";",
    ]
    assert [token["type"] for token in tokens] == ["operator"] * 15 + [
        "punctuation"
    ] * 6


def test_comments_are_ignored_and_line_numbers_are_tracked():
    source = "int x; // ignored\n// whole line\nreturn x;"
    tokens, errors = tokenize(source)

    assert errors == []
    assert [(token["value"], token["line"]) for token in tokens] == [
        ("int", 1),
        ("x", 1),
        (";", 1),
        ("return", 3),
        ("x", 3),
        (";", 3),
    ]


def test_floating_point_and_signed_integer_tokens():
    tokens, errors = tokenize("3.14 -42 +7 0")

    assert errors == []
    assert [(token["type"], token["value"]) for token in tokens] == [
        ("number", "3.14"),
        ("operator", "-"),
        ("number", "42"),
        ("operator", "+"),
        ("number", "7"),
        ("number", "0"),
    ]


def test_illegal_characters_are_reported_and_lexing_continues():
    tokens, errors = tokenize("int x @ 1;\nfloat y # 2;")

    assert tokens[-1] == {"type": "punctuation", "value": ";", "line": 2}
    assert errors == [
        {"phase": "lexical", "line": 1, "message": "Illegal character '@'"},
        {"phase": "lexical", "line": 2, "message": "Illegal character '#'"},
    ]


def test_sample_g_snippet():
    source = "int main() { int x = 42; int y = x @ 10; return y; }"
    tokens, errors = tokenize(source)

    assert errors == [
        {"phase": "lexical", "line": 1, "message": "Illegal character '@'"}
    ]
    assert [token["value"] for token in tokens] == [
        "int",
        "main",
        "(",
        ")",
        "{",
        "int",
        "x",
        "=",
        "42",
        ";",
        "int",
        "y",
        "=",
        "x",
        "10",
        ";",
        "return",
        "y",
        ";",
        "}",
    ]
