# TypeScript Checklist

Use this checklist only when the diff includes TypeScript or TSX files.

For every **Find candidates** block below, scope the grep to the files
under review (pass them as arguments instead of recursing the whole
repo) so the output stays small and tied to the diff.

- In Deno-reachable code, imports **that name a file** must include the
  file extension (e.g. `.ts`). Repos that use Deno usually pin a few
  specific directories as Deno-reachable. The repo-local
  `docs/code-reviews/extra-checklist.md` should enumerate the exact
  directories that count as Deno-reachable for that repo; check there
  before flagging. If the repo-local checklist does not define
  Deno-reachable paths, skip this rule.

  This applies to relative imports and to directory-style aliases (an
  alias mapped with a trailing slash, such as `@utils/` -> `src/`, where
  the rest of the specifier is a path). It does **not** apply to bare
  package specifiers such as `@avandar/utils` or `@avandar/utils/sql`.
  Those name a package entry point, not a file: Node resolves them
  through `exports`, and Deno resolves them through an exact import-map
  entry. Adding an extension to one is wrong and will fail to resolve.

  **Find candidates** (replace `<deno-dir>` with each Deno-reachable
  directory from the repo-local checklist):

  ```bash
  grep -rEn 'from "(\.|\.\.)/[^"]+"' <deno-dir> --include="*.ts" \
    | grep -Ev '\.(ts|tsx|js|jsx|json|css)"$'
  ```

  Misses imports under non-relative path aliases (`@something/foo`) that
  resolve to Deno-reachable code, so still scan those imports by eye.
  When you do, first decide whether the specifier is a package name or a
  file path; only flag the latter.

- Use JSDoc for public classes and methods.
- Prefer functional and declarative programming.
- Avoid classes and imperative patterns unless a real constraint requires them.

  **Find candidates:**

  ```bash
  grep -rEn '^(export )?(abstract )?class ' --include="*.ts" --include="*.tsx" .
  ```

- Prefer higher-order functions over manual loops.

  **Find candidates:**

  ```bash
  grep -rEn '^\s*(for|while) *\(' --include="*.ts" --include="*.tsx" .
  ```

  Apply the documented exceptions (char-by-char string loops; early-break
  performance loops) before flagging.

- Use named exports instead of default exports.

  **Find candidates:**

  ```bash
  grep -rEn '^export default ' --include="*.ts" --include="*.tsx" .
  ```

- Keep comment and docstring lines at 80 characters or fewer.

  **Find candidates** (lines starting with `//` or inside `/* ... */`
  that exceed 80 cols):

  ```bash
  awk 'length>80 && /^\s*(\/\/|\*|\/\*)/ {print FILENAME":"NR": "$0}' \
    path/to/file.ts ...
  ```

- If a docstring fits on one line within 80 characters, keep it single-line.
- Never use single-line `if` statements: always keep braces.

  **Find candidates** (heuristic; non-exhaustive):

  ```bash
  grep -rEn '^\s*if *\(.*\)[^{]*[a-zA-Z]' --include="*.ts" --include="*.tsx" . \
    | grep -v '{$'
  ```

  Flags lines like `if (cond) doThing();` and `if (cond) return foo;`.
  Multi-line `if (...)\n  doThing();` patterns are missed; still scan by
  eye for those.

- Prefer string interpolation over string concatenation.

  **Find candidates** (string literal concatenated with `+`):

  ```bash
  grep -rEn '"[^"]*" *\+|\+ *"[^"]*"' --include="*.ts" --include="*.tsx" .
  ```

- Use PascalCase for React components, classes, singleton instances, and module
  objects.
- Use camelCase for variables, functions, and methods.
- Use UPPERCASE for environment variables and hard-coded constants.
- Event handlers should be named `on...`, not `handle...`.

  **Find candidates:**

  ```bash
  grep -rEn '\bhandle[A-Z][a-zA-Z]*\b' --include="*.ts" --include="*.tsx" .
  ```

- Non-exported top-level helper functions should be prefixed with `_`.
- React component prop types should always be named `Props`.

  **Find candidates** (prop type aliases whose name is not literally
  `Props`):

  ```bash
  grep -rEn '^(export )?type [A-Z][a-zA-Z]*Props\b' --include="*.tsx" . \
    | grep -Ev '\btype Props\b'
  ```

- Preserve `e2e` or `E2E` casing exactly; do not invent mixed variants.

  **Find candidates:**

  ```bash
  grep -rEn '\b(E2e|e2E|E_2e|e_2E)\b' --include="*.ts" --include="*.tsx" .
  ```

- Never use `any`.

  **Find candidates:**

  ```bash
  grep -rEn '(: |<|\()any\b|\bas any\b|\bArray<any>|\bRecord<[^,]+, *any>' \
    --include="*.ts" --include="*.tsx" .
  ```

- Use `as const` for literals that never change.
- Prefer `type` over `interface`, except for class-style OOP interfaces.

  **Find candidates:**

  ```bash
  grep -rEn '^(export )?interface ' --include="*.ts" --include="*.tsx" .
  ```

  Class-style interfaces (used with `implements`) are the documented
  exception; verify before flagging.

- Prefer `undefined` over `null`. The **only** exception is when an
  external type signature forces `null` into your code *at the exact
  position in question*: a framework callback whose parameter is typed
  with `null` (for example Supabase's `onAuthStateChange((event, session:
  Session | null) => ...)`), or a value whose type you do not control (a
  database row column typed `x | null`, a third-party return type).

  Merely *receiving* a `T | null` value from an external call does **not**
  license `null` in your own declarations, parameters, or return types.
  Normalize it at the boundary with `?? undefined` and keep everything
  downstream `undefined`-based. "The value came from an API that returns
  `null`" is not sufficient justification on its own.

  **Per-hit decision** (apply to every candidate below): ask *is the
  `null` in a type signature I own, or am I only receiving it from
  something external?* If it is in a signature you own, such as a local
  variable, a parameter, a return type, or module state, it must be `undefined`
  unless an external signature at that same position forces `null`.
  Otherwise, normalize.

  **Find candidates:**

  ```bash
  grep -rEn '\bnull\b' --include="*.ts" --include="*.tsx" . \
    | grep -Ev '(json|jsonb|\| *null|: *null *,|= *null *;|return null)' \
    || true
  grep -rEn '(: *null\b|\| *null\b|= *null\b|return null\b)' \
    --include="*.ts" --include="*.tsx" .
  ```

  This is bad (a wrapper we own propagates the external `null` instead of
  normalizing it, and module state defaults to `null`):

  ```ts
  // We own this return type, so the `| null` is our choice, not the SDK's.
  async function refreshSession(): Promise<Session | null> {
    const { data } = await client.auth.refreshSession();
    return data.session; // Session | null straight through
  }

  let onExpired: (() => void) | null = null; // our module state
  ```

  This is good (normalize at the boundary; every signature we own uses
  `undefined`):

  ```ts
  async function refreshSession(): Promise<Session | undefined> {
    const { data } = await client.auth.refreshSession();
    return data.session ?? undefined;
  }

  let onExpired: (() => void) | undefined = undefined;
  ```

  The `null` that is genuinely forced stays. If a library types a callback
  parameter as `Session | null`, a handler written against that signature
  keeps `null`, because the position is not one you own:

  ```ts
  client.auth.onAuthStateChange((_event, session: Session | null) => {
    // ...
  });
  ```

- Prefer string literal unions over enums.

  **Find candidates:**

  ```bash
  grep -rEn '^(export )?enum ' --include="*.ts" --include="*.tsx" .
  ```

- Reuse composite types when they are genuinely shared.
- Avoid extracting one-off type aliases unless the type is reused. `Props` is
  the explicit exception.
- If an object shape has 4 or more properties, extract it to a named type for
  readability.
- Add explicit types at module boundaries, top-level declarations, and function
  parameters. Avoid unnecessary annotations for local variables and inline
  callbacks.
- Prefer default parameter values over nullish guard logic.
- Use RO-RO for multiple parameters and multiple return values.
- If a function takes only one parameter, do not wrap it in an object.
- When using an object parameter, prefer the name `options` unless `params` or
  `config` is more accurate.
- Keep small object parameter types inline. Only extract them when reused.
- Top-level functions should use the `function` keyword.

  **Find candidates** (top-level arrow-function consts; heuristic):

  ```bash
  grep -rEn '^(export )?const [a-z][a-zA-Z0-9_]* *(:[^=]*)?= *(async )?\(' \
    --include="*.ts" --include="*.tsx" .
  ```

  Many hits will be true single-expression utilities or factory results;
  flag only ones that are real top-level function declarations.

- Nested functions and object methods should use arrow functions.
- Type imports and type exports should always use the `type` keyword.

  **Find candidates** (imports/exports of clearly type-only names, by
  convention `T`, `I`, or names ending in `Props` / `Type` / `Id` /
  `Config`, without the `type` keyword; heuristic):

  ```bash
  grep -rEn '^import \{[^}]*\b([A-Z][a-zA-Z]*Props|[A-Z][a-zA-Z]*Type|[A-Z][a-zA-Z]*Id|[A-Z][a-zA-Z]*Config)\b' \
    --include="*.ts" --include="*.tsx" . \
    | grep -v '^[^:]*:import type '
  ```

  Heuristic only; still scan import lists manually for type-only names
  this regex doesn't anticipate.

- Do not add barrel files, except in repo-approved directories documented
  by the repo-local checklist.

  **Find candidates** (new `index.ts` files):

  ```bash
  find . -name "index.ts" \
    -not -path "*/node_modules/*"
  ```

  Compare each hit against the repo-local allow-list, if one exists. If no
  repo-local allow-list exists, treat newly added barrel files as findings.

- Do not use namespace exports such as `export * from`.

  **Find candidates:**

  ```bash
  grep -rEn '^export \* from' --include="*.ts" --include="*.tsx" .
  ```

- All exported classes, objects, and functions need docstrings.
- If an exported object defines top-level methods inline, those methods need
  docstrings too.
- Function docstrings should explain the function's purpose and output, not
  its interior implementation details. Use `//` comments inside the function
  body for how the function works. Exception: mention complex or unconventional
  architectural/design decisions in the docstring only when developers using
  the function need that context.
- Follow input contravariance and output covariance: readonly at module
  boundaries for inputs, mutable outputs for callers.
- Apply readonly wrappers to function parameters, not to local variables,
  internal helpers, or return types.

  **Find candidates** (`Readonly<...>` applied to local vars or return
  types; heuristic):

  ```bash
  grep -rEn '\bReadonly<' --include="*.ts" --include="*.tsx" .
  ```

  Filter hits: only flag the ones applied to local variable
  declarations, internal helper return types, or shared type aliases,
  not to function parameters (which are correct).

- Prefer mutable local variables and intermediate values.
- If a function intentionally mutates its input, the name should make the
  mutation obvious, and returning `void` is usually the clearest contract.
- Acronyms longer than two letters in identifiers, type names, and file
  names use PascalCase, not all-caps. Treat them as words: `Url`, `Sql`,
  `Json`, `Http`, `Api`, `Css`, `Html`. Two-letter forms like `Id` and
  `Db` stay as written. Mixed forms like `useDataExplorerURLSync` or
  `parseSQL` should become `useDataExplorerUrlSync` and `parseSql`.
  Apply the same rule to file names: `DataExplorerURLState.ts` should be
  `DataExplorerUrlState.ts`.

  **Find candidates** (identifiers and file names containing the
  common offenders):

  ```bash
  # Identifiers
  grep -rEn '\b[a-zA-Z_]*(URL|SQL|JSON|HTTP|API|CSS|HTML|UUID|XML|YAML)[a-zA-Z_]*\b' \
    --include="*.ts" --include="*.tsx" .
  # File names
  find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    | grep -E '(URL|SQL|JSON|HTTP|API|CSS|HTML|UUID|XML|YAML)'
  ```

  Allow-list: `ID` and `DB` may stay as written. Hits that are already
  in PascalCase (`Url`, `Sql`, etc.) will not match.

- Files that export only types should use the `.types.ts` filename suffix.
  This makes the file's contents self-evident from the import path and
  lets readers immediately distinguish runtime-bearing modules from
  type-only modules. Rename a file to `.types.ts` if you delete its last
  runtime export, and remove the suffix if you later add runtime code.

  **Find candidates** (`.ts` files in the diff that contain only
  `export type` / `export interface` and no runtime exports):

  ```bash
  for f in <files-in-diff-ending-in-.ts>; do
    case "$f" in
      *.types.ts) continue ;;
    esac
    if ! grep -Eq '^export (const|let|var|function|class|enum|default|\{)' "$f" \
       && grep -Eq '^export (type|interface)' "$f"; then
      echo "type-only candidate: $f"
    fi
  done
  ```

- For string-literal unions that are referenced at runtime (for parsing,
  validation, dropdown options, or `zod` enums), derive the type from an
  `as const` runtime array so the values are written once. Expose the
  runtime array and an `isValid` type guard on the matching module so
  callers don't have to rebuild the `Set` inline.

  **Find candidates** (string-literal unions with 3+ members):

  ```bash
  grep -rEn '^\s*\| *"[^"]+"' --include="*.ts" --include="*.tsx" .
  ```

  Cross-check each hit: if the same literal list is also written as a
  runtime `Set`, array, or `z.enum(...)` somewhere else, the union
  should derive from an `as const` array instead.

  This is bad:

  ```ts
  export type QueryAggregationTypeT =
    | "sum"
    | "avg"
    | "count"
    | "max"
    | "min"
    | "group_by"
    | "none";

  // some other file
  const VALID = new Set([
    "sum", "avg", "count", "max", "min", "group_by", "none",
  ]);
  function isValidAgg(value: string): value is QueryAggregationTypeT {
    return VALID.has(value);
  }
  ```

  This is good:

  ```ts
  export const QUERY_AGGREGATION_TYPES = [
    "sum",
    "avg",
    "count",
    "max",
    "min",
    "group_by",
    "none",
  ] as const;

  export type QueryAggregationTypeT = (typeof QUERY_AGGREGATION_TYPES)[number];

  export const QueryAggregationTypeModule = {
    /** All valid aggregation values. */
    values: QUERY_AGGREGATION_TYPES,

    /** Type guard checking whether a string is a valid aggregation. */
    isValid: (value: string): value is QueryAggregationTypeT => {
      return (QUERY_AGGREGATION_TYPES as readonly string[]).includes(value);
    },
    // ...
  };
  ```
