"""Scope-aware semantic analysis and symbol-table generation."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


_TYPE_SIZES = {"int": 4, "bool": 4, "float": 8}
_NUMERIC_TYPES = {"int", "float"}


@dataclass
class _Scope:
    name: str
    symbols: dict[str, str] = field(default_factory=dict)


class SemanticAnalyzer:
    """Analyze an AST object or the serialized AST returned by ``parser.parse``."""

    def __init__(self) -> None:
        self.symbol_table: list[dict[str, Any]] = []
        self.errors: list[dict[str, Any]] = []
        self.global_scope: dict[str, dict[str, Any]] = {}
        self.scope_stack: list[_Scope] = []
        self.current_function: dict[str, Any] | None = None
        self.next_offset = 0
        self.block_counter = 0

    def analyze(self, tree: Any) -> dict[str, Any]:
        if isinstance(tree, dict) and "ast" in tree:
            tree = tree["ast"]
        program = _node_dict(tree)
        declarations = program.get("children", [])
        functions = [
            node for node in declarations if node.get("type") == "FunctionDecl"
        ]
        self._declare_functions(functions)

        if not functions:
            self._error(1, "Program must define 'int main()'")

        for function in functions:
            self._analyze_function(function)

        return {"symbol_table": self.symbol_table, "errors": self.errors}

    def _declare_functions(self, functions: list[dict[str, Any]]) -> None:
        for function in functions:
            name, ret_type = _function_name_and_return_type(function)
            params = [
                child
                for child in function.get("children", [])
                if child.get("type") == "Param"
            ]
            param_types = [_param_type(param) for param in params]
            signature = f"{ret_type}({', '.join(param_types)})"
            entry = {
                "name": name,
                "type": signature,
                "scope": "global",
                "offset": 0,
                "line": _line(function),
            }
            self.symbol_table.append(entry)
            if name in self.global_scope:
                self._error(_line(function), f"Redeclaration of function '{name}'")
            else:
                self.global_scope[name] = {
                    "return_type": ret_type,
                    "param_types": param_types,
                    "line": _line(function),
                }

    def _analyze_function(self, function: dict[str, Any]) -> None:
        name, return_type = _function_name_and_return_type(function)
        params = [
            child
            for child in function.get("children", [])
            if child.get("type") == "Param"
        ]
        body = next(
            (
                child
                for child in function.get("children", [])
                if child.get("type") == "Block"
            ),
            {"type": "Block", "line": _line(function), "children": []},
        )

        self.current_function = {
            "name": name,
            "return_type": return_type,
        }
        self.next_offset = 0
        self.block_counter = 0
        self.scope_stack = [_Scope(f"{name}()")]
        for param in params:
            self._declare_variable(
                _param_name(param),
                _param_type(param),
                _line(param),
            )

        definitely_returns = self._analyze_block(body, create_scope=False)
        if return_type != "void" and not definitely_returns:
            self._error(
                _line(function),
                f"Missing return in non-void function '{name}'",
            )
        self.scope_stack.clear()
        self.current_function = None

    def _analyze_block(
        self, block: dict[str, Any], *, create_scope: bool = True
    ) -> bool:
        if create_scope:
            self.block_counter += 1
            self.scope_stack.append(
                _Scope(f"{self.current_function['name']}()#block{self.block_counter}")
            )
        definitely_returns = False
        for statement in block.get("children", []):
            statement_returns = self._analyze_statement(statement)
            if statement_returns:
                definitely_returns = True
        if create_scope:
            self.scope_stack.pop()
        return definitely_returns

    def _analyze_statement(self, node: dict[str, Any]) -> bool:
        kind = node.get("type")
        line = _line(node)
        children = node.get("children", [])

        if kind == "VarDecl":
            var_type, name = _var_type_and_name(node)
            initializer = children[0] if children else None
            self._declare_variable(name, var_type, line)
            if initializer is not None:
                actual_type = self._expression_type(initializer)
                self._check_assignment(var_type, actual_type, name, line)
            return False

        if kind == "AssignStmt":
            target = children[0] if children else {}
            value = children[1] if len(children) > 1 else {}
            name = _identifier_name(target)
            expected_type = self._lookup_variable(name, _line(target))
            actual_type = self._expression_type(value)
            if expected_type is not None:
                self._check_assignment(expected_type, actual_type, name, line)
            return False

        if kind == "ReturnStmt":
            expression = children[0] if children else None
            actual_type = self._expression_type(expression) if expression else "void"
            expected_type = self.current_function["return_type"]
            if not self._assignable(expected_type, actual_type):
                self._error(
                    line,
                    f"Type mismatch: function '{self.current_function['name']}' "
                    f"returns '{expected_type}' but got '{actual_type}'",
                )
            return True

        if kind == "IfStmt":
            condition, then_block, *else_parts = children
            self._check_condition(condition)
            then_returns = self._analyze_block(then_block)
            else_returns = (
                self._analyze_block(else_parts[0]) if else_parts else False
            )
            return bool(else_parts) and then_returns and else_returns

        if kind == "WhileStmt":
            condition, body = children
            self._check_condition(condition)
            self._analyze_block(body)
            return False

        if kind == "Block":
            return self._analyze_block(node)

        if kind == "ExprStmt":
            if children:
                self._expression_type(children[0])
        return False

    def _declare_variable(self, name: str, var_type: str, line: int) -> None:
        scope = self.scope_stack[-1]
        if name in scope.symbols:
            self._error(line, f"Redeclaration of '{name}' in the same scope")
            return
        scope.symbols[name] = var_type
        self.symbol_table.append(
            {
                "name": name,
                "type": var_type,
                "scope": scope.name,
                "offset": self.next_offset,
                "line": line,
            }
        )
        self.next_offset += _TYPE_SIZES.get(var_type, 4)

    def _lookup_variable(self, name: str, line: int) -> str | None:
        for scope in reversed(self.scope_stack):
            if name in scope.symbols:
                return scope.symbols[name]
        self._error(line, f"Undeclared identifier '{name}'")
        return None

    def _expression_type(self, node: dict[str, Any] | None) -> str:
        if not node:
            return "void"
        kind = node.get("type")
        line = _line(node)
        children = node.get("children", [])

        if kind == "Literal":
            value = _literal_value(node)
            if value.startswith('"') and value.endswith('"'):
                return "string"
            if value in {"true", "false"}:
                return "bool"
            return "float" if "." in value else "int"

        if kind == "Identifier":
            return self._lookup_variable(_identifier_name(node), line) or "error"

        if kind == "CallExpr":
            name = _call_name(node)
            if name == "printf":
                return self._printf_type(children, line)
            signature = self.global_scope.get(name)
            args = [self._expression_type(argument) for argument in children]
            if signature is None:
                self._error(line, f"Call to undefined function '{name}'")
                return "error"
            expected = signature["param_types"]
            if len(args) != len(expected):
                self._error(
                    line,
                    f"Function '{name}' expects {len(expected)} arguments "
                    f"but got {len(args)}",
                )
            for index, (expected_type, actual_type) in enumerate(
                zip(expected, args), start=1
            ):
                if not self._assignable(expected_type, actual_type):
                    self._error(
                        line,
                        f"Type mismatch: argument {index} of function '{name}' "
                        f"expects '{expected_type}' but got '{actual_type}'",
                    )
            return signature["return_type"]

        if kind == "UnaryExpr":
            operand_type = (
                self._expression_type(children[0]) if children else "error"
            )
            operator = _operator(node)
            if operator == "!":
                if operand_type != "bool" and operand_type != "error":
                    self._invalid_operands(operator, line)
                    return "error"
                return "bool"
            if operand_type not in _NUMERIC_TYPES and operand_type != "error":
                self._invalid_operands(operator, line)
                return "error"
            return operand_type

        if kind == "BinaryExpr":
            left_type = self._expression_type(children[0]) if children else "error"
            right_type = self._expression_type(children[1]) if len(children) > 1 else "error"
            operator = _operator(node)
            return self._binary_type(operator, left_type, right_type, line)
        return "error"

    def _printf_type(self, arguments: list[dict[str, Any]], line: int) -> str:
        if not arguments:
            self._error(line, "printf expects a format string as its first argument")
            return "int"

        format_node = arguments[0]
        format_type = self._expression_type(format_node)
        if format_type != "string" or format_node.get("type") != "Literal":
            self._error(line, "printf expects a string literal as its first argument")
            for argument in arguments[1:]:
                self._expression_type(argument)
            return "int"

        format_string = _literal_value(format_node)[1:-1].replace("%%", "")
        specifiers = re.findall(r"%(?:[diufcs])", format_string)
        values = arguments[1:]
        if len(specifiers) != len(values):
            self._error(
                line,
                f"printf format expects {len(specifiers)} value(s) but got {len(values)}",
            )

        for specifier, argument in zip(specifiers, values):
            argument_type = self._expression_type(argument)
            expected_types = {"%s": {"string"}, "%c": {"int"}}
            if specifier in expected_types:
                compatible = argument_type in expected_types[specifier]
            else:
                compatible = argument_type in _NUMERIC_TYPES
            if not compatible and argument_type != "error":
                self._error(
                    _line(argument),
                    f"printf format '{specifier}' is incompatible with '{argument_type}'",
                )
        for argument in values[len(specifiers) :]:
            self._expression_type(argument)
        return "int"

    def _binary_type(
        self, operator: str, left: str, right: str, line: int
    ) -> str:
        if "error" in {left, right}:
            return "error"
        if operator in {"+", "-", "*", "/", "%"}:
            if left not in _NUMERIC_TYPES or right not in _NUMERIC_TYPES:
                self._invalid_operands(operator, line)
                return "error"
            if operator == "%" and (left != "int" or right != "int"):
                self._invalid_operands(operator, line)
                return "error"
            return "float" if "float" in {left, right} else "int"
        if operator in {"&&", "||"}:
            if left != "bool" or right != "bool":
                self._invalid_operands(operator, line)
                return "error"
            return "bool"
        if operator in {"<", ">", "<=", ">="}:
            if left not in _NUMERIC_TYPES or right not in _NUMERIC_TYPES:
                self._invalid_operands(operator, line)
                return "error"
            return "bool"
        if operator in {"==", "!="}:
            if not self._compatible(left, right):
                self._invalid_operands(operator, line)
                return "error"
            return "bool"
        self._invalid_operands(operator, line)
        return "error"

    def _check_condition(self, node: dict[str, Any]) -> None:
        condition_type = self._expression_type(node)
        if condition_type not in {"bool", "error"}:
            self._error(_line(node), "Condition expression must evaluate to 'bool'")

    def _check_assignment(
        self, expected: str, actual: str, name: str, line: int
    ) -> None:
        if not self._assignable(expected, actual):
            self._error(
                line,
                f"Type mismatch: cannot assign '{actual}' to '{expected}' "
                f"variable '{name}'",
            )

    @staticmethod
    def _compatible(left: str, right: str) -> bool:
        return left == right or {left, right} <= _NUMERIC_TYPES

    @classmethod
    def _assignable(cls, expected: str, actual: str) -> bool:
        if "error" in {expected, actual}:
            return True
        if expected == actual:
            return True
        return expected == "float" and actual == "int"

    def _invalid_operands(self, operator: str, line: int) -> None:
        self._error(line, f"Invalid operand types for operator '{operator}'")

    def _error(self, line: int, message: str) -> None:
        self.errors.append({"phase": "semantic", "line": line, "message": message})


def analyze(tree: Any) -> dict[str, Any]:
    """Return ``symbol_table`` entries and semantic ``errors`` for an AST."""
    return SemanticAnalyzer().analyze(tree)


def analyze_semantics(tree: Any) -> dict[str, Any]:
    """Compatibility-named entry point for semantic analysis."""
    return analyze(tree)


def _node_dict(node: Any) -> dict[str, Any]:
    if isinstance(node, dict):
        return node
    if hasattr(node, "to_dict"):
        return node.to_dict()
    raise TypeError("Semantic analysis requires an AST node or serialized AST")


def _line(node: dict[str, Any]) -> int:
    return node.get("line", 1)


def _parts_from_label(node: dict[str, Any], prefix: str) -> str:
    label = node.get("label", "")
    return label[len(prefix) :] if label.startswith(prefix) else ""


def _function_name_and_return_type(node: dict[str, Any]) -> tuple[str, str]:
    label = node.get("label", "")
    signature = label.removeprefix("Function: ")
    name = signature.split("(", 1)[0]
    return_type = signature.rsplit("->", 1)[-1].strip()
    return name, return_type


def _param_type(node: dict[str, Any]) -> str:
    value = _parts_from_label(node, "Param: ")
    return value.split(" ", 1)[0] if value else "error"


def _param_name(node: dict[str, Any]) -> str:
    value = _parts_from_label(node, "Param: ")
    return value.split(" ", 1)[1] if " " in value else ""


def _var_type_and_name(node: dict[str, Any]) -> tuple[str, str]:
    value = _parts_from_label(node, "VarDecl: ")
    pieces = value.split(" ", 1)
    return (pieces[0], pieces[1]) if len(pieces) == 2 else ("error", "")


def _identifier_name(node: dict[str, Any]) -> str:
    return _parts_from_label(node, "Identifier: ")


def _literal_value(node: dict[str, Any]) -> str:
    return _parts_from_label(node, "Literal: ")


def _call_name(node: dict[str, Any]) -> str:
    return _parts_from_label(node, "Call: ")


def _operator(node: dict[str, Any]) -> str:
    label = node.get("label", "")
    return {
        "+ (Add)": "+",
        "- (Sub)": "-",
        "* (Mul)": "*",
        "/ (Div)": "/",
        "% (Mod)": "%",
        "< (Lt)": "<",
        "> (Gt)": ">",
        "<= (Le)": "<=",
        ">= (Ge)": ">=",
        "== (Eq)": "==",
        "- (Neg)": "-",
        "! (Not)": "!",
    }.get(label, label)
