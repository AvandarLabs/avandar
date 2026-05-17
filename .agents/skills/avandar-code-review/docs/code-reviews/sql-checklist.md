# SQL Checklist

Use this checklist only when the diff includes SQL files.

- Use `snake_case` consistently.
- Table names should be plural.
- SQL function names should be namespace-prefixed.
- Use `util__*` for shared utility functions.
- Use `table_name__*` for table-specific functions.
- Trigger names should follow `tr__table_name__*`.
