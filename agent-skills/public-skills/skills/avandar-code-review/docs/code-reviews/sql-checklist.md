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

## Comments

- Use a `/** ... */` block for a docstring on a declaration, never a run of
  `--` lines. A declaration here is `create type`, `create table`,
  `create view`, `create function`, or `create schema`. SQL has no
  intellisense to lose, so the reason is uniformity with the rest of the
  codebase: one comment shape means "this documents the thing below it", and
  a reader (or a grep) can tell a docstring from an inline note without
  reading either. Flag a `--` run of two or more lines sitting directly above
  a declaration.

  This is bad:

  ```sql
  -- Publication state of a dashboard. `dashboards.is_public` is generated
  -- from this column for read-side compatibility.
  create type public.dashboard_visibility as enum('draft', 'workspace', 'public');
  ```

  This is good:

  ```sql
  /**
   * Publication state of a dashboard. `dashboards.is_public` is generated
   * from this column for read-side compatibility.
   */
  create type public.dashboard_visibility as enum('draft', 'workspace', 'public');
  ```

- Use `--` line comments for every comment that is not a declaration
  docstring, even when it spans several lines. That covers comments inside a
  statement (a column, a constraint, a `case` arm, a policy predicate) and
  notes attached to `grant`, `revoke`, `alter`, `create index`,
  `create trigger`, and `create policy`. This is the SQL form of the
  block-comments-document-identifiers rule in
  `comments-checklist.md`: a statement body is the SQL analogue of a function
  body. Exception: a file with no single main object (a collection of RLS
  policies, a set of sibling helpers) may open with one `/** ... */` file
  header, matching the file-level-comment exception in that same checklist.

  This is bad:

  ```sql
  create table public.dashboards (
    /**
     * Derived from `visibility` rather than stored, so the anon RLS policy
     * keeps working with no edit.
     */
    is_public boolean generated always as (visibility = 'public') stored not null
  );
  ```

  This is good:

  ```sql
  create table public.dashboards (
    -- Derived from `visibility` rather than stored, so the anon RLS policy
    -- keeps working with no edit.
    is_public boolean generated always as (visibility = 'public') stored not null
  );
  ```

  **Find candidates** (a `--` run directly above a declaration, and any block
  comment in a `.sql` file, to be checked against the two rules above):

  ```bash
  grep -rEn -B2 '^\s*create (or replace )?(type|table|view|function|schema)' \
    --include="*.sql" . | grep -E '^\S+-[0-9]+-\s*--'
  grep -rn '/\*\*' --include="*.sql" .
  ```

- Document an enum's values in its docstring when the value names are not
  self-explanatory, one paragraph per value under an `Enum values:` heading,
  and put any caveat about changing the type under a trailing `Note:`. Enum
  values are the one case where the reader needs a per-member gloss and SQL
  gives nowhere else to put it.

  This is good:

  ```sql
  /**
   * How a PDF table's structure was determined.
   *
   * Enum values:
   *
   * `tagged` - Read from the PDF's own logical structure tree. Ground truth
   *  rather than inference, because the generator recorded the cell grid.
   *
   * `manual` - A region the user drew themselves.
   *
   * Note: Keep new values at the end. Moving one is not a rename, it forces
   * a full rebuild of the type and a rewrite of every column using it.
   */
  create type public.datasets__pdf_detection_mode as enum('tagged', 'manual');
  ```
