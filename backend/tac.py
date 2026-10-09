"""Three-address-code generation for the OptiLexis AI AST."""

from __future__ import annotations

from typing import Any


class TACGenerator:
    def __init__(self, symbol_table: list[dict[str, Any]] | None = None) -> None:
        self.symbol_table = symbol_table or []
        self.instructions: list[str] = []
        self._temporary_number = 0
        self._label_number = 0

    def generate(self, tree: Any) -> list[str]:
        """Generate TAC from AST nodes, serialized ASTs, or parser output."""
        if isinstance(tree, dict) and "ast" in tree:
            tree = tree["ast"]
        program = _as_node_dict(tree)
        if program.get("type") != "Program":
            raise TypeError("TAC generation requires a Program AST")

        self.instructions = []
        for function in program.get("children", []):
            if function.get("type") == "FunctionDecl":
                self._function(function)
        return self.instructions.copy()

    def _function(self, node: dict[str, Any]) -> None:
        name = _function_name(node)
        self.instructions.append(f"label {name}:")
        params = [child for child in node.get("children", []) if child.get("type") == "Param"]
        for index, param in enumerate(params):
            self.instructions.append(f"param {_param_name(param)}")
        body = next(
            (child for child in node.get("children", []) if child.get("type") == "Block"),
            None,
        )
        if body is not None:
            self._statement(body)

    def _statement(self, node: dict[str, Any]) -> None:
        kind = node.get("type")
        children = node.get("children", [])

        if kind == "Block":
            for statement in children:
                self._statement(statement)
            return

        if kind == "VarDecl":
            name = _var_name(node)
            if children:
                value = self._expression(children[0])
                self.instructions.append(f"{name} = {value}")
            return

        if kind == "AssignStmt":
            if len(children) >= 2:
                target = _identifier_name(children[0])
                value = self._expression(children[1])
                self.instructions.append(f"{target} = {value}")
            return

        if kind == "ExprStmt":
            if children:
                self._expression(children[0])
            return

        if kind == "ReturnStmt":
            if children:
                self.instructions.append(f"return {self._expression(children[0])}")
            else:
                self.instructions.append("return")
            return

        if kind == "IfStmt":
            condition, then_block, *else_blocks = children
            else_label = self._new_label()
            if else_blocks:
                end_label = self._new_label()
                self._condition(condition, None, else_label)
                self._statement(then_block)
                self.instructions.append(f"goto {end_label}")
                self.instructions.append(f"label {else_label}:")
                self._statement(else_blocks[0])
                self.instructions.append(f"label {end_label}:")
            else:
                self._condition(condition, None, else_label)
                self._statement(then_block)
                self.instructions.append(f"label {else_label}:")
            return

        if kind == "WhileStmt":
            condition, body = children
            begin_label = self._new_label()
            end_label = self._new_label()
            self.instructions.append(f"label {begin_label}:")
            self._condition(condition, None, end_label)
            self._statement(body)
            self.instructions.append(f"goto {begin_label}")
            self.instructions.append(f"label {end_label}:")

    def _expression(self, node: dict[str, Any]) -> str:
        kind = node.get("type")
        children = node.get("children", [])

        if kind == "Identifier":
            return _identifier_name(node)
        if kind == "Literal":
            return _literal_value(node)
        if kind == "BinaryExpr":
            operator = _operator(node)
            if operator in {"&&", "||"}:
                return self._boolean_value(node)
            left = self._expression(children[0])
            right = self._expression(children[1])
            temporary = self._new_temporary()
            self.instructions.append(f"{temporary} = {left} {operator} {right}")
            return temporary
        if kind == "UnaryExpr":
            operand = self._expression(children[0])
            operator = _operator(node)
            temporary = self._new_temporary()
            self.instructions.append(f"{temporary} = {operator}{operand}")
            return temporary
        if kind == "CallExpr":
            name = _call_name(node)
            arguments = [self._expression(argument) for argument in children]
            for argument in arguments:
                self.instructions.append(f"param {argument}")
            temporary = self._new_temporary()
            self.instructions.append(f"{temporary} = call {name}, {len(arguments)}")
            return temporary
        raise ValueError(f"Unsupported expression node '{kind}'")

    def _condition(
        self, node: dict[str, Any], true_label: str | None, false_label: str
    ) -> None:
        kind = node.get("type")
        children = node.get("children", [])
        if kind == "BinaryExpr" and _operator(node) == "&&":
            self._condition(children[0], None, false_label)
            self._condition(children[1], true_label, false_label)
            return
        if kind == "BinaryExpr" and _operator(node) == "||":
            next_label = self._new_label()
            fallthrough_label = true_label or self._new_label()
            self._condition(children[0], fallthrough_label, next_label)
            self.instructions.append(f"label {next_label}:")
            self._condition(children[1], true_label, false_label)
            if true_label is None:
                self.instructions.append(f"label {fallthrough_label}:")
            return
        if kind == "UnaryExpr" and _operator(node) == "!":
            if true_label is None:
                value = self._expression(node)
                self.instructions.append(f"if_false {value} goto {false_label}")
            else:
                self._condition(children[0], false_label, true_label)
            return

        value = self._expression(node)
        if true_label is not None:
            self.instructions.append(f"if {value} goto {true_label}")
            self.instructions.append(f"goto {false_label}")
        else:
            self.instructions.append(f"if_false {value} goto {false_label}")

    def _boolean_value(self, node: dict[str, Any]) -> str:
        result = self._new_temporary()
        true_label = self._new_label()
        false_label = self._new_label()
        end_label = self._new_label()
        self._condition(node, true_label, false_label)
        self.instructions.extend(
            [
                f"label {true_label}:",
                f"{result} = 1",
                f"goto {end_label}",
                f"label {false_label}:",
                f"{result} = 0",
                f"label {end_label}:",
            ]
        )
        return result

    def _new_temporary(self) -> str:
        self._temporary_number += 1
        return f"t{self._temporary_number}"

    def _new_label(self) -> str:
        self._label_number += 1
        return f"L{self._label_number}"


def generate_tac(
    tree: Any, symbol_table: list[dict[str, Any]] | None = None
) -> list[str]:
    """Convenience function for generating a TAC instruction sequence."""
    return TACGenerator(symbol_table).generate(tree)


def generate(
    tree: Any, symbol_table: list[dict[str, Any]] | None = None
) -> list[str]:
    """Alias for ``generate_tac``."""
    return generate_tac(tree, symbol_table)


def _as_node_dict(node: Any) -> dict[str, Any]:
    if isinstance(node, dict):
        return node
    if hasattr(node, "to_dict"):
        return node.to_dict()
    raise TypeError("TAC generation requires an AST node or serialized AST")


def _name_from_label(node: dict[str, Any], prefix: str) -> str:
    label = node.get("label", "")
    return label[len(prefix) :] if label.startswith(prefix) else ""


def _function_name(node: dict[str, Any]) -> str:
    signature = _name_from_label(node, "Function: ")
    return signature.split("(", 1)[0]


def _param_name(node: dict[str, Any]) -> str:
    parameter = _name_from_label(node, "Param: ")
    return parameter.rsplit(" ", 1)[-1]


def _var_name(node: dict[str, Any]) -> str:
    declaration = _name_from_label(node, "VarDecl: ")
    return declaration.rsplit(" ", 1)[-1]


def _identifier_name(node: dict[str, Any]) -> str:
    return _name_from_label(node, "Identifier: ")


def _literal_value(node: dict[str, Any]) -> str:
    return _name_from_label(node, "Literal: ")


def _call_name(node: dict[str, Any]) -> str:
    return _name_from_label(node, "Call: ")


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
