"""AST node classes and frontend-compatible serialization."""


class ASTNode:
    def __init__(self, line: int = 1) -> None:
        self.line = line

    @property
    def label(self) -> str:
        raise NotImplementedError

    @property
    def children(self) -> list["ASTNode"]:
        return []

    def to_dict(self) -> dict:
        return {
            "type": type(self).__name__,
            "label": self.label,
            "line": self.line,
            "children": [child.to_dict() for child in self.children],
        }


class Program(ASTNode):
    def __init__(self, declarations: list[ASTNode] | None = None, line: int = 1):
        super().__init__(line)
        self.declarations = declarations or []

    @property
    def label(self) -> str:
        return "Program"

    @property
    def children(self) -> list[ASTNode]:
        return self.declarations


class Param(ASTNode):
    def __init__(self, param_type: str, name: str, line: int = 1):
        super().__init__(line)
        self.param_type = param_type
        self.name = name

    @property
    def label(self) -> str:
        return f"Param: {self.param_type} {self.name}"


class FunctionDecl(ASTNode):
    def __init__(
        self,
        name: str,
        params: list[Param],
        ret_type: str,
        body: "Block",
        line: int = 1,
    ):
        super().__init__(line)
        self.name = name
        self.params = params
        self.ret_type = ret_type
        self.body = body

    @property
    def label(self) -> str:
        params = ", ".join(
            f"{param.param_type} {param.name}" for param in self.params
        )
        return f"Function: {self.name}({params}) -> {self.ret_type}"

    @property
    def children(self) -> list[ASTNode]:
        return [*self.params, self.body]


class Block(ASTNode):
    def __init__(self, statements: list[ASTNode] | None = None, line: int = 1):
        super().__init__(line)
        self.statements = statements or []

    @property
    def label(self) -> str:
        return "Block"

    @property
    def children(self) -> list[ASTNode]:
        return self.statements


class VarDecl(ASTNode):
    def __init__(
        self,
        var_type: str,
        name: str,
        initializer: ASTNode | None = None,
        line: int = 1,
    ):
        super().__init__(line)
        self.var_type = var_type
        self.name = name
        self.initializer = initializer

    @property
    def label(self) -> str:
        return f"VarDecl: {self.var_type} {self.name}"

    @property
    def children(self) -> list[ASTNode]:
        return [self.initializer] if self.initializer is not None else []


class AssignStmt(ASTNode):
    def __init__(self, target: "Identifier", value: ASTNode, line: int = 1):
        super().__init__(line)
        self.target = target
        self.value = value

    @property
    def label(self) -> str:
        return "="

    @property
    def children(self) -> list[ASTNode]:
        return [self.target, self.value]


class IfStmt(ASTNode):
    def __init__(
        self,
        condition: ASTNode,
        then_block: Block,
        else_block: Block | None = None,
        line: int = 1,
    ):
        super().__init__(line)
        self.condition = condition
        self.then_block = then_block
        self.else_block = else_block

    @property
    def label(self) -> str:
        return "If"

    @property
    def children(self) -> list[ASTNode]:
        children = [self.condition, self.then_block]
        if self.else_block is not None:
            children.append(self.else_block)
        return children


class WhileStmt(ASTNode):
    def __init__(self, condition: ASTNode, body: Block, line: int = 1):
        super().__init__(line)
        self.condition = condition
        self.body = body

    @property
    def label(self) -> str:
        return "While"

    @property
    def children(self) -> list[ASTNode]:
        return [self.condition, self.body]


class ReturnStmt(ASTNode):
    def __init__(self, expression: ASTNode | None = None, line: int = 1):
        super().__init__(line)
        self.expression = expression

    @property
    def label(self) -> str:
        return "Return"

    @property
    def children(self) -> list[ASTNode]:
        return [self.expression] if self.expression is not None else []


class ExprStmt(ASTNode):
    def __init__(self, expression: ASTNode, line: int = 1):
        super().__init__(line)
        self.expression = expression

    @property
    def label(self) -> str:
        return "ExprStmt"

    @property
    def children(self) -> list[ASTNode]:
        return [self.expression]


class BinaryExpr(ASTNode):
    _operator_labels = {
        "+": "+ (Add)",
        "-": "- (Sub)",
        "*": "* (Mul)",
        "/": "/ (Div)",
        "%": "% (Mod)",
        "<": "< (Lt)",
        ">": "> (Gt)",
        "<=": "<= (Le)",
        ">=": ">= (Ge)",
        "==": "== (Eq)",
        "!=": "!=",
        "&&": "&&",
        "||": "||",
    }

    def __init__(self, operator: str, left: ASTNode, right: ASTNode, line: int = 1):
        super().__init__(line)
        self.operator = operator
        self.left = left
        self.right = right

    @property
    def label(self) -> str:
        return self._operator_labels[self.operator]

    @property
    def children(self) -> list[ASTNode]:
        return [self.left, self.right]


class UnaryExpr(ASTNode):
    _operator_labels = {"-": "- (Neg)", "!": "! (Not)"}

    def __init__(self, operator: str, operand: ASTNode, line: int = 1):
        super().__init__(line)
        self.operator = operator
        self.operand = operand

    @property
    def label(self) -> str:
        return self._operator_labels[self.operator]

    @property
    def children(self) -> list[ASTNode]:
        return [self.operand]


class CallExpr(ASTNode):
    def __init__(self, name: str, args: list[ASTNode] | None = None, line: int = 1):
        super().__init__(line)
        self.name = name
        self.args = args or []

    @property
    def label(self) -> str:
        return f"Call: {self.name}"

    @property
    def children(self) -> list[ASTNode]:
        return self.args


class Identifier(ASTNode):
    def __init__(self, name: str, line: int = 1):
        super().__init__(line)
        self.name = name

    @property
    def label(self) -> str:
        return f"Identifier: {self.name}"


class Literal(ASTNode):
    def __init__(self, value: str, line: int = 1):
        super().__init__(line)
        self.value = value

    @property
    def label(self) -> str:
        return f"Literal: {self.value}"
