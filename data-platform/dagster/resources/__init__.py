"""Dagster resource definitions."""

from .database import postgres_resource

__all__ = ["postgres_resource"]
