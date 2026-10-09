"""PLY-based lexer for the OptiLexis AI mini language."""

import ply.lex as lex

tokens = (
    "IDENTIFIER",
    "NUMBER",
    "OPERATOR",
    "PUNCTUATION",
    "INT",
    "FLOAT",
    "BOOL",
    "VOID",
    "IF",
    "ELSE",
    "WHILE",
    "RETURN",
    "TRUE",
    "FALSE",
    "PLUS",
    "MINUS",
    "TIMES",
    "DIVIDE",
    "MODULO",
    "LT",
    "GT",
    "LE",
    "GE",
    "EQ",
    "NE",
    "AND",
    "OR",
    "NOT",
    "ASSIGN",
    "LPAREN",
    "RPAREN",
    "LBRACE",
    "RBRACE",
    "COMMA",
    "SEMICOLON",
)

reserved = {
    "int": ("keyword", "INT"),
    "float": ("keyword", "FLOAT"),
    "bool": ("keyword", "BOOL"),
    "void": ("keyword", "VOID"),
    "if": ("keyword", "IF"),
    "else": ("keyword", "ELSE"),
    "while": ("keyword", "WHILE"),
    "return": ("keyword", "RETURN"),
    "true": ("keyword", "TRUE"),
    "false": ("keyword", "FALSE"),
}

operator_tokens = {
    "+": "PLUS",
    "-": "MINUS",
    "*": "TIMES",
    "/": "DIVIDE",
    "%": "MODULO",
    "<": "LT",
    ">": "GT",
    "<=": "LE",
    ">=": "GE",
    "==": "EQ",
    "!=": "NE",
    "&&": "AND",
    "||": "OR",
    "!": "NOT",
    "=": "ASSIGN",
}

punctuation_tokens = {
    "(": "LPAREN",
    ")": "RPAREN",
    "{": "LBRACE",
    "}": "RBRACE",
    ",": "COMMA",
    ";": "SEMICOLON",
}


def t_IDENTIFIER(token):
    r"[A-Za-z_][A-Za-z0-9_]*"
    category_and_type = reserved.get(token.value)
    if category_and_type is None:
        token.category = "identifier"
    else:
        token.category, token.type = category_and_type
    return token


def t_NUMBER(token):
    r"(?:\d+\.\d+|\d+)"
    token.category = "number"
    return token


def t_COMMENT(token):
    r"//[^\n]*"
    pass


def t_OPERATOR(token):
    r"<=|>=|==|!=|&&|\|\||[+\-*/%<>!=]"
    token.category = "operator"
    token.type = operator_tokens[token.value]
    return token


def t_PUNCTUATION(token):
    r"[(){};,]"
    token.category = "punctuation"
    token.type = punctuation_tokens[token.value]
    return token


def t_newline(token):
    r"\n+"
    token.lexer.lineno += len(token.value)


t_ignore = " \t\r"


def t_error(token):
    lexer = token.lexer
    lexer.lexical_errors.append(
        {
            "phase": "lexical",
            "line": lexer.lineno,
            "message": f"Illegal character '{token.value[0]}'",
        }
    )
    lexer.skip(1)


def tokenize(code: str) -> tuple[list[dict], list[dict]]:
    """Return categorized tokens and recoverable lexical errors for source code."""
    lexer = lex.lex()
    lexer.lineno = 1
    lexer.lexical_errors = []
    lexer.input(code)

    result = []
    while token := lexer.token():
        result.append(
            {
                "type": token.category,
                "value": token.value,
                "line": token.lineno,
            }
        )

    return result, lexer.lexical_errors
