# Types Checklist

Use this checklist only when the diff includes TypeScript or TSX files.
It covers the type system itself: type declarations, assertions and
escape hatches, absence, literal unions, and readonly/variance
contracts. Naming, module structure, comments, and function shape live in
`typescript-checklist.md`.

- Never use `any`.

  **Find candidates:**

  ```bash
  grep -rEn '(: |<|\()any\b|\bas any\b|\bArray<any>|\bRecord<[^,]+, *any>' \
    --include="*.ts" --include="*.tsx" .
  ```

- Never write `as unknown as T`. The double cast silences every
  assignability check between the source and the target type, so a real
  mismatch (a renamed field, a widened union, a changed generic argument)
  compiles cleanly and fails at runtime instead. Most occurrences are
  unnecessary: the value already satisfies the target type and the cast was
  added defensively. Delete it, and if a type error appears, fix the
  underlying type rather than restoring the cast.

  Exception: keep the cast only when TypeScript genuinely cannot resolve the
  relationship safely, which in practice means a generic boundary where a
  runtime value cannot be proven to match a computed type (a dotted path
  string checked against `Paths<T>`, for example). Structure the code to
  avoid it first; a cast is the fallback for code that is already
  well-structured. When you keep one, comment which type cannot be proven
  and why.

  **Find candidates:**

  ```bash
  grep -rEn '\bas unknown as\b' --include="*.ts" --include="*.tsx" .
  ```

  Verify a hit by deleting the cast and re-running `tsc`: report a finding
  when the file still type-checks without it.

  This is bad (the erased view is already assignable, so the double cast
  only hides future drift):

  ```ts
  const DESCRIPTORS = {
    fields: [{ key: "name", control: "text" }],
  } as const satisfies FieldDescriptors<UserConfig>;

  export const UserForm = {
    descriptors: DESCRIPTORS as unknown as AnyFieldDescriptors,
  };
  ```

  This is good:

  ```ts
  export const UserForm = {
    descriptors: DESCRIPTORS,
  };
  ```

- Avoid `as unknown as T`. Routing a value through `unknown` disables every
  assignability check between the two types, so the cast keeps compiling after
  the shapes drift apart and the mismatch surfaces at runtime. Flag the cast
  and ask for the underlying type to be fixed instead; the real problem is
  usually a parameter or field typed `unknown` that should carry a real type.

  Exceptions: 1) the relationship is genuinely unresolvable by the compiler,
  which in practice means complicated generics (a typed dotted path such as
  `Paths<TConfig>` cannot be satisfied by a runtime `string`); 2) an existing
  cast that a comment already justifies on those grounds. A cast that merely
  saves the author from typing a field properly is not an exception. When a
  cast is unavoidable, the narrowest one that compiles (`as T`) is preferred
  over `as unknown as T`.

  This is bad:

  ```ts
  type Props = { tooltipProps?: unknown };
  <Chart tooltipProps={tooltipProps as unknown as TooltipProps} />;
  ```

  This is good:

  ```ts
  type Props = {
    tooltipProps?: ComponentProps<typeof Chart>["tooltipProps"];
  };
  <Chart tooltipProps={tooltipProps} />;
  ```

  **Find candidates:**

  ```bash
  grep -rEn '\bas unknown as\b' --include="*.ts" --include="*.tsx" .
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
