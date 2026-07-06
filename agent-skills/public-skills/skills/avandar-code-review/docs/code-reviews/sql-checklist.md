# SQL Checklist

Use this checklist only when the diff includes SQL files.

- Use `snake_case` consistently.

  **Find candidates** (identifiers containing a lowercase → uppercase
  transition):

  ```bash
  grep -rEn '\b[a-z]+[A-Z][a-zA-Z]*\b' --include="*.sql" .
  ```

  Filter out hits inside string literals (those are application-domain
  text) before flagging.

- Table names should be plural.

  **Find candidates** (each `create table ...` statement):

  ```bash
  grep -rEin '^\s*create (or replace )?table ' --include="*.sql" .
  ```

  Inspect each table name in the output and flag any that are singular.

- SQL function names should be namespace-prefixed.
- Use `util__*` for shared utility functions.
- Use `table_name__*` for table-specific functions.

  **Find candidates** (function declarations whose name lacks the
  `__` namespace separator):

  ```bash
  grep -rEin '^\s*create (or replace )?function ' --include="*.sql" . \
    | grep -v '__'
  ```

- Trigger names should follow `tr__table_name__*`.

  **Find candidates** (triggers whose name does not start with `tr__`):

  ```bash
  grep -rEin '^\s*create (or replace )?trigger ' --include="*.sql" . \
    | grep -v 'tr__'
  ```
