"""Optional machine-learning advice for the deterministic compiler pipeline."""

__all__ = ["MLAdvisor"]


def __getattr__(name: str):
    if name == "MLAdvisor":
        from .predict import MLAdvisor

        return MLAdvisor
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
