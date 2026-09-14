# TypeScript Checklist

Use this checklist only when the diff includes TypeScript or TSX files.
It covers naming, module and file structure, function shape, and
import/export form. The type system itself (declarations, assertions and
escape hatches, absence, literal unions, readonly contracts) lives in
`types-checklist.md`.

A focused `naming` or `files` review applies only the subset of this
file listed under **Focused Reviews** in `SKILL.md`, not every bullet
here. A full TypeScript phase applies the whole file.

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

- Flag indirection that the inline form does not need. A named binding used in
  exactly one place makes the reader jump to a second location to learn
  something the use site could have shown outright, so when the value is small
  the inline form is the more readable one and is what the code should use.

  Flag only when all three hold, which keeps the check decidable from the added
  lines alone:
  1) the binding is referenced exactly once in the file; 2) it is a top-level
  `const` or a `_`-prefixed helper, not an import or a parameter; 3) inlined it
  would add 5 lines or fewer at the use site, which an object literal of 4 or
  fewer properties and a function body of a single statement both satisfy.

  Exceptions: 1) referenced more than once, including by a test that imports
  it; 2) inlining would add more than 5 lines, where the extra nesting costs
  the reader more than the jump; 3) the name is the only thing explaining an
  otherwise opaque value, such as a magic number or a regular expression;
  4) it exists to give a value a stable identity, such as a module-level empty
  array used as a default for a prop or a hook dependency, where inlining would
  build a new value on every call and defeat the reference check; 5) the
  binding is recursive, or a `const` whose use would precede its declaration.

  This rule takes precedence over the two helper rules below. Those govern how
  to write a helper that should exist; this one asks whether it should exist.
  Do not ask for a `_` prefix or a move above the caller on a helper that this
  rule says to inline.

  This is bad:

  ```ts
  const metadata = {
    custom: {
      isDiscoveryContinuation: true,
    },
  } as const;

  function _isInternal(messageMetadata: MessageMetadata): boolean {
    return messageMetadata?.custom?.isDiscoveryContinuation === true;
  }

  export const DiscoveryContinuationMessage = {
    metadata,
    isInternal: _isInternal,
  };
  ```

  This is good:

  ```ts
  export const DiscoveryContinuationMessage = {
    metadata: {
      custom: {
        isDiscoveryContinuation: true,
      },
    } as const,

    isInternal: (messageMetadata: MessageMetadata): boolean => {
      return messageMetadata?.custom?.isDiscoveryContinuation === true;
    },
  };
  ```

  **Find candidates** (top-level `const` and `_` helpers, with a count of how
  often each name appears in its own file; a total of 2 means one declaration
  plus one use):

  ```bash
  for f in <files-under-review-ending-in-.ts-or-.tsx>; do
    grep -Eho '^(const|function|async function) _?[A-Za-z0-9_]+' "$f" \
      | sed -E 's/^(const|(async )?function) //' \
      | while read -r name; do
          n="$(grep -Ecw "$name" "$f")"
          [ "$n" = 2 ] && printf '%s %s used once\n' "$f" "$name"
        done
  done
  ```

  Each hit is a candidate, not a finding. Open it and apply the 5-line test and
  the exceptions before flagging.

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

- Name a function that turns one value into another so that the source and the
  target are both named, counting the receiver as part of the name. A name that
  states only one side leaves the reader guessing what goes in, which is the
  whole cost of `resolve...`: it names neither side.

  First decide what the receiver is. The receiver is the module, namespace, or
  object the function hangs off (`MapLayer` in `MapLayer.toGeoBinding`). It
  either **is the source** (the value being converted is a `MapLayer`), **is
  the target** (the value being produced is a `GeoBinding`), or is **neither**,
  meaning a general grouping name such as `MapUtils`, `Formatters`, or
  `DateHelpers`. Only a receiver that is the source or the target supplies a
  half, so only then may the function name drop that half:

  | Shape                                 | Use when                           |
  | ------------------------------------- | ---------------------------------- |
  | `[Source].to{Target}`                 | Receiver is the source, converting |
  | `[Source].get{Target}`                | Receiver is the source, looking up |
  | `[Target].from{Source}`               | Receiver is the target             |
  | `[Receiver].make{Target}From{Source}` | Receiver is neither, new value     |
  | `[Receiver].get{Target}From{Source}`  | Receiver is neither, value inside  |
  | `make{Target}From{Source}`            | Free function, new value           |
  | `get{Target}From{Source}`             | Free function, value inside source |

  A method on a receiver that names a side takes the missing half from that
  receiver and must not repeat it. A method on a receiver that names neither
  side gets nothing from it, so it spells out both halves exactly as a free
  function does: `MapUtils.makeGeoBindingFromMapLayer(layer)` is right and
  `MapUtils.toGeoBinding(layer)` is a finding, because `MapUtils` is not the
  source. A free function has no receiver, so it spells out both halves and
  never uses `To`.

  `to` and `get` are both correct on a receiver that names the source; pick by
  what the function does. `to` converts the receiver into another
  representation of itself (`MapLayer.toGeoBinding`, `Dataset.toCsv`). `get`
  fetches, filters, or looks up something logically contained in the source
  (`MapLayer.getQueryableFields`, `MapLayer.getFieldById`). Do not flag a
  `get{Target}` method as a missing `to{Target}`, or the reverse, when the
  chosen prefix matches the work being done.

  Flag `resolve...` on **any** function, exported or not, including a
  `_resolve...` helper: the word carries no information inside a file either,
  and `_build...` says the same thing better. The one `resolve` that is not a
  finding is the promise sense, where the function settles a pending promise
  (`_resolveCompletionWaiters`, a `resolve` callback), because there it names a
  real action rather than a conversion. Also flag `compute...`,
  `build...`, and `create...` on an exported function that is really one of the
  shapes above: a smaller prefix vocabulary where each prefix carries
  information beats a wide set of near-synonyms.

  These shapes are required only for exported functions. A non-exported
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
  // `MapUtils` names neither side, so the source is missing.
  MapUtils.toGeoBinding(layer);
  computeBounds(featureCollection);
  createMapSpec(layerSpecs);
  ```

  This is good:

  ```ts
  MapLayer.toGeoBinding(layer);
  MapLayer.getQueryableFields(layer);
  MapUtils.makeGeoBindingFromMapLayer(layer);
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

  For a `to{Target}`, `get{Target}`, or `from{Source}` method added in the
  diff, read the receiver's own name before deciding. If the receiver names the
  source or the target, the short form is correct and there is no finding. Only
  flag it when the receiver names neither side, and then ask for the full
  `make{Target}From{Source}` or `get{Target}From{Source}` form.

- Name a function that returns user-facing copy after the copy itself, with no
  prefix: `appLabel(app)`, `vizTypeLabel(vizType)`. This is the one conversion
  exempt from the naming rule above, so flag `getAppLabelFromAppType` or
  `makeAppLabel` rather than accepting them. A prefix announces a data
  conversion, when the function is really naming a string of translated text,
  and the call site is usually inline in JSX where the extra words only add
  noise. The missing prefix is what tells a reader this returns copy.

  The exemption is only for a function that returns copy and nothing else. One
  that takes copy as an input among several and returns data still follows the
  naming shapes above. Repos that keep copy in a dedicated module should say
  where in their repo-local checklist.

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

- Acronyms in identifiers, type names, file names and directory names use
  PascalCase, not all-caps. Treat them as words, whatever their length and
  with no exceptions: `Url`, `Sql`, `Json`, `Http`, `Api`, `Css`, `Html`,
  and equally `Id`, `Db`, `Ci`, `Io`, `E2e`. Mixed forms like
  `useDataExplorerURLSync` or `parseSQL` should become
  `useDataExplorerUrlSync` and `parseSql`. Apply the same rule to file and
  directory names: `DataExplorerURLState.ts` should be
  `DataExplorerUrlState.ts`, and `SupabaseCLI/` should be `SupabaseCli/`.

  This is about camelCase and PascalCase names only. `UPPERCASE` constants
  and environment variable names are unaffected, so `E2E_GOOGLE_SHEET_ID`
  and `PLAYWRIGHT_E2E_THIRD_PARTY` stay as they are, and so does a string
  literal that names something outside this repo.

  **Find candidates** (identifiers and file names containing the
  common offenders):

  ```bash
  # Identifiers
  grep -rEn '[a-z][A-Z_]*(URL|SQL|JSON|HTTP|API|CSS|HTML|UUID|XML|YAML|CLI|E2E|ID|DB|CI|IO)([A-Z]|\b)' \
    --include="*.ts" --include="*.tsx" .
  # File and directory names
  find . \( -name "*.ts" -o -name "*.tsx" -o -type d \) \
    -not -path "*/node_modules/*" \
    | grep -E '(URL|SQL|JSON|HTTP|API|CSS|HTML|UUID|XML|YAML|CLI|E2E|ID|DB|CI|IO)'
  ```

  There is no allow-list: a two-letter acronym is a word like any other.
  Hits that are already in PascalCase (`Url`, `Sql`, etc.) will not match.
  A hit inside an `UPPERCASE` constant or env var name is not a finding.

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
