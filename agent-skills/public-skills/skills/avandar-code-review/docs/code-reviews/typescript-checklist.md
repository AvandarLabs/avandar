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
- Declare local helper functions above the exported function that uses them,
  so a file reads helpers first and its public entry point last. A reader
  scrolling from the top meets each helper before the call that depends on
  it, and a reviewer never has to jump downward to learn what a call does.
  Function declarations hoist, so this is about readability rather than
  correctness, except for `const` arrow helpers where a use before the
  declaration is a runtime TDZ error.

  Applies only to helpers defined in the same file as their caller. Types,
  constants, and a file's `Props` alias stay at the top, above the helpers.

  Exceptions: 1) a file with several exports and no single entry point, where
  each helper belongs beside the export it serves; 2) a helper used by more
  than one export, which may sit above the first of them; 3) mutual
  recursion, where no order satisfies the rule.

  This is bad:

  ```ts
  export function formatInvoice(invoice: Invoice): string {
    return `${invoice.id}: ${_formatTotal(invoice)}`;
  }

  function _formatTotal(invoice: Invoice): string {
    return invoice.total.toFixed(2);
  }
  ```

  This is good:

  ```ts
  function _formatTotal(invoice: Invoice): string {
    return invoice.total.toFixed(2);
  }

  export function formatInvoice(invoice: Invoice): string {
    return `${invoice.id}: ${_formatTotal(invoice)}`;
  }
  ```

  **Find candidates** (files whose first exported function is declared before
  a later non-exported top-level function):

  ```bash
  for f in <files-under-review-ending-in-.ts-or-.tsx>; do
    exp="$(grep -nE '^export (async )?function ' "$f" | head -1 | cut -d: -f1)"
    helper="$(grep -nE '^(async )?function _' "$f" | tail -1 | cut -d: -f1)"
    if [ -n "$exp" ] && [ -n "$helper" ] && [ "$exp" -lt "$helper" ]; then
      printf '%s exports at line %s, helper still below at %s\n' \
        "$f" "$exp" "$helper"
    fi
  done
  ```

  Confirm each hit by checking that the trailing helper is actually called by
  the earlier export; an unrelated helper serving a second export is one of
  the exceptions above.
- Name a function that turns one value into another with one of exactly four
  shapes, so the name states both the source and the target:
  `[Receiver].to{Target}` when the receiver names the source,
  `[Receiver].from{Source}` when the receiver names the target,
  `make{Target}From{Source}` for a free function returning a new value, and
  `get{Target}From{Source}` for a free function returning something logically
  contained in the source (a nested value, a display label, a derived
  property). A name that states only one side leaves the reader guessing what
  goes in, which is the whole cost of `resolve...`: it names neither side.

  A method takes the missing half from its receiver and must not repeat it. A
  free function has no receiver, so it spells out both halves and never uses
  `To`.

  Flag `resolve...` on **any** function, exported or not, including a
  `_resolve...` helper: the word carries no information inside a file either,
  and `_build...` says the same thing better. The one `resolve` that is not a
  finding is the promise sense, where the function settles a pending promise
  (`_resolveCompletionWaiters`, a `resolve` callback), because there it names a
  real action rather than a conversion. Also flag `compute...`,
  `build...`, and `create...` on an exported function that is really one of the
  four shapes: a smaller prefix vocabulary where each prefix carries
  information beats a wide set of near-synonyms.

  The four shapes are required only for exported functions. A non-exported
  `_`-prefixed helper has callers in its own file that can see its source, so
  `_build...` is the right name for one that assembles a piece of a value
  (`_buildCircleRadius`, `_buildDropReports`), and the verbose form is not
  wanted there.

  Exceptions: 1) an action (`syncMap`, `applyMapStyles`); 2) a predicate
  (`isMapLayerQueryable`); 3) a constructor with no source (`makeEmpty`,
  `createClient`); 4) a non-exported `_build...` helper as described above;
  5) a name fixed by an external contract (`toJSON`, `toString`); 6) a copy
  function, see the separate rule below.

  This is bad:

  ```ts
  MapLayer.resolveGeoBinding(layer);
  toFeatureCollection({ rows, binding });
  computeBounds(featureCollection);
  createMapSpec(layerSpecs);
  ```

  This is good:

  ```ts
  MapLayer.toGeoBinding(layer);
  makeFeatureCollectionFromRows({ rows, binding });
  getBoundsFromFeatureCollection(featureCollection);
  makeMapSpecFromLayerSpecs(layerSpecs);
  ```

  **Find candidates** (`resolve` at any visibility, then exported functions and
  module methods using a retired prefix or a sourceless free `to...`):

  ```bash
  # `resolve` is banned exported or not, including a private `_resolve...`:
  grep -rEn '^(export )?(async )?function _?resolve[A-Z]|^ +resolve[A-Z][a-zA-Z]*: ' \
    --include="*.ts" --include="*.tsx" .
  # retired prefixes on exported functions and module methods:
  grep -rEn '^export (async )?function (compute|build|create)[A-Z]|^ +(compute|build|create)[A-Z][a-zA-Z]*: ' \
    --include="*.ts" --include="*.tsx" .
  # exported `to...` free functions that never name their source:
  grep -rEn '^export (async )?function to[A-Z][a-zA-Z]*\(' \
    --include="*.ts" --include="*.tsx" . \
    | grep -v 'From'
  ```

  Copy functions are the one conversion exempted here, so do not flag them, and
  do flag a prefix that has crept onto one. See the copy-function rule below.

  Check each hit against the exception list before flagging: a non-exported
  `_build...` hit and a predicate hit are expected, a `_resolve...` hit is a
  finding, and a method whose receiver supplies the other half is already
  correct.
- Name a function that returns user-facing copy after the copy itself, with no
  prefix: `appLabel(app)`, `vizTypeLabel(vizType)`. This is the one conversion
  exempt from the naming rule above, so flag `getAppLabelFromAppType` or
  `makeAppLabel` rather than accepting them. A prefix announces a data
  conversion, when the function is really naming a string of translated text,
  and the call site is usually inline in JSX where the extra words only add
  noise. The missing prefix is what tells a reader this returns copy.

  The exemption is only for a function that returns copy and nothing else. One
  that takes copy as an input among several and returns data still follows the
  four shapes. Repos that keep copy in a dedicated module should say where in
  their repo-local checklist.

  This is bad:

  ```tsx
  <Text>{getAppLabelFromAppType(app)}</Text>
  ```

  This is good:

  ```tsx
  <Text>{appLabel(app)}</Text>
  ```

  **Find candidates** (prefixed functions that return a label or other copy):

  ```bash
  grep -rEn '^(export )?function (get|make)[A-Z][a-zA-Z]*(Label|Copy|Text|Title|Message)[a-zA-Z]*\(' \
    --include="*.ts" --include="*.tsx" .
  ```

  Confirm a hit really returns only copy: a function returning a structured
  object that happens to contain a label is a conversion, not a copy function.
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
