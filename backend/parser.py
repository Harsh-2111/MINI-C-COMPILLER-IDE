"""PLY parser for the OptiLexis AI mini language."""

import ply.lex as lex
import ply.yacc as yacc

try:
    from . import ast_nodes, lexer as lexer_module
    from .ast_nodes import (
        AssignStmt,
        BinaryExpr,
        Block,
        CallExpr,
        ExprStmt,
        FunctionDecl,
        Identifier,
        IfStmt,
        Literal,
        Param,
        Program,
        ReturnStmt,
        UnaryExpr,
        VarDecl,
        WhileStmt,
    )
except ImportError:
    import ast_nodes
    import lexer as lexer_module
    from ast_nodes import (
        AssignStmt,
        BinaryExpr,
        Block,
        CallExpr,
        ExprStmt,
        FunctionDecl,
        Identifier,
        IfStmt,
        Literal,
        Param,
        Program,
        ReturnStmt,
        UnaryExpr,
        VarDecl,
        WhileStmt,
    )

tokens = lexer_module.tokens

precedence = (
    ("left", "OR"),
    ("left", "AND"),
    ("left", "EQ", "NE"),
    ("left", "LT", "GT", "LE", "GE"),
    ("left", "PLUS", "MINUS"),
    ("left", "TIMES", "DIVIDE", "MODULO"),
    ("right", "NOT", "UMINUS"),
)


class _ParserGrammar:
    tokens = tokens
    precedence = (("nonassoc", "IFX"),) + precedence

    def __init__(self):
        self.syntax_errors = []
        self.parser = None

    def p_program(self, production):
        "program : function_list"
        production[0] = Program(production[1] or [], line=1)

    def p_function_list_empty(self, production):
        "function_list :"
        production[0] = []

    def p_function_list_append(self, production):
        "function_list : function_list function_decl"
        production[0] = production[1] + [production[2]]

    def p_function_decl(self, production):
        "function_decl : type IDENTIFIER LPAREN params_opt RPAREN block"
        production[0] = FunctionDecl(
            production[2],
            production[4],
            production[1],
            production[6],
            line=production.lineno(1),
        )

    def p_type(self, production):
        """type : INT
                | FLOAT
                | BOOL
                | VOID"""
        production[0] = production[1]

    def p_params_opt(self, production):
        """params_opt : param_list
                      |"""
        production[0] = production[1] if len(production) == 2 else []

    def p_param_list_single(self, production):
        "param_list : param"
        production[0] = [production[1]]

    def p_param_list_append(self, production):
        "param_list : param_list COMMA param"
        production[0] = production[1] + [production[3]]

    def p_param(self, production):
        "param : type IDENTIFIER"
        production[0] = Param(
            production[1], production[2], line=production.lineno(1)
        )

    def p_block(self, production):
        "block : LBRACE statement_list RBRACE"
        production[0] = Block(production[2], line=production.lineno(1))

    def p_block_recovered(self, production):
        "block : LBRACE statement_list error RBRACE"
        production[0] = Block(production[2], line=production.lineno(1))

    def p_statement_list_empty(self, production):
        "statement_list :"
        production[0] = []

    def p_statement_list_append(self, production):
        "statement_list : statement_list statement"
        production[0] = production[1]
        if production[2] is not None:
            production[0].append(production[2])

    def p_statement_var_decl(self, production):
        "statement : type IDENTIFIER initializer_opt SEMICOLON"
        production[0] = VarDecl(
            production[1],
            production[2],
            production[3],
            line=production.lineno(1),
        )

    def p_initializer_opt(self, production):
        """initializer_opt : ASSIGN expression
                           |"""
        production[0] = production[2] if len(production) == 3 else None

    def p_statement_assignment(self, production):
        "statement : IDENTIFIER ASSIGN expression SEMICOLON"
        production[0] = AssignStmt(
            Identifier(production[1], line=production.lineno(1)),
            production[3],
            line=production.lineno(1),
        )

    def p_statement_if(self, production):
        "statement : IF LPAREN expression RPAREN block %prec IFX"
        production[0] = IfStmt(
            production[3],
            production[5],
            line=production.lineno(1),
        )

    def p_statement_if_else(self, production):
        "statement : IF LPAREN expression RPAREN block ELSE block"
        production[0] = IfStmt(
            production[3],
            production[5],
            production[7],
            line=production.lineno(1),
        )

    def p_statement_while(self, production):
        "statement : WHILE LPAREN expression RPAREN block"
        production[0] = WhileStmt(
            production[3],
            production[5],
            line=production.lineno(1),
        )

    def p_statement_return(self, production):
        "statement : RETURN return_expression_opt SEMICOLON"
        production[0] = ReturnStmt(
            production[2],
            line=production.lineno(1),
        )

    def p_return_expression_opt(self, production):
        """return_expression_opt : expression
                                |"""
        production[0] = production[1] if len(production) == 2 else None

    def p_statement_expression(self, production):
        "statement : expression SEMICOLON"
        production[0] = ExprStmt(production[1], line=production.lineno(1))

    def p_statement_block(self, production):
        "statement : block"
        production[0] = production[1]

    def p_statement_recovered(self, production):
        "statement : error SEMICOLON"
        production[0] = None

    def p_expression_binary(self, production):
        """expression : expression OR expression
                      | expression AND expression
                      | expression EQ expression
                      | expression NE expression
                      | expression LT expression
                      | expression GT expression
                      | expression LE expression
                      | expression GE expression
                      | expression PLUS expression
                      | expression MINUS expression
                      | expression TIMES expression
                      | expression DIVIDE expression
                      | expression MODULO expression"""
        production[0] = BinaryExpr(
            production[2],
            production[1],
            production[3],
            line=production.lineno(2),
        )

    def p_expression_unary(self, production):
        """expression : NOT expression
                      | MINUS expression %prec UMINUS"""
        operator = "!" if production.slice[1].type == "NOT" else "-"
        production[0] = UnaryExpr(
            operator,
            production[2],
            line=production.lineno(1),
        )

    def p_expression_group(self, production):
        "expression : LPAREN expression RPAREN"
        production[0] = production[2]

    def p_expression_call(self, production):
        "expression : IDENTIFIER LPAREN arguments_opt RPAREN"
        production[0] = CallExpr(
            production[1],
            production[3],
            line=production.lineno(1),
        )

    def p_arguments_opt(self, production):
        """arguments_opt : argument_list
                         |"""
        production[0] = production[1] if len(production) == 2 else []

    def p_argument_list_single(self, production):
        "argument_list : expression"
        production[0] = [production[1]]

    def p_argument_list_append(self, production):
        "argument_list : argument_list COMMA expression"
        production[0] = production[1] + [production[3]]

    def p_expression_identifier(self, production):
        "expression : IDENTIFIER"
        production[0] = Identifier(production[1], line=production.lineno(1))

    def p_expression_number(self, production):
        "expression : NUMBER"
        production[0] = Literal(production[1], line=production.lineno(1))

    def p_expression_string(self, production):
        "expression : STRING"
        production[0] = Literal(production[1], line=production.lineno(1))

    def p_expression_boolean(self, production):
        """expression : TRUE
                      | FALSE"""
        production[0] = Literal(production[1], line=production.lineno(1))

    def p_error(self, token):
        if token is None:
            line = self.parser.lexer.lineno if self.parser else 1
            message = "Unexpected end of input"
        else:
            line = token.lineno
            state = self.parser.state if self.parser else None
            expected = self.parser.action.get(state, {}) if state is not None else {}
            if "SEMICOLON" in expected:
                message = f"Expected ';' before '{token.value}'"
                previous_source = self.parser.lexer.lexdata[: token.lexpos].rstrip()
                if previous_source:
                    line = previous_source.count("\n") + 1
            else:
                message = f"Unexpected token '{token.value}'"
        self.syntax_errors.append(
            {"phase": "syntax", "line": line, "message": message}
        )


def parse(code: str) -> dict:
    """Parse source and return serialized AST, original tokens, and errors."""
    tokens_out, lexical_errors = lexer_module.tokenize(code)
    grammar = _ParserGrammar()
    parser = yacc.yacc(
        module=grammar,
        start="program",
        write_tables=False,
        debug=False,
        errorlog=yacc.NullLogger(),
    )
    lexer = lex.lex(module=lexer_module)
    lexer.lineno = 1
    lexer.lexical_errors = []
    grammar.parser = parser
    parser.lexer = lexer
    ast = parser.parse(code, lexer=lexer, tracking=True)

    if not isinstance(ast, Program):
        ast = Program(line=1)

    return {
        "tokens": tokens_out,
        "errors": lexical_errors + grammar.syntax_errors,
        "ast": ast.to_dict(),
    }
