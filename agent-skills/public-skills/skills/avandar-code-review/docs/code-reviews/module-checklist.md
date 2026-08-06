# Module Checklist

Use this checklist only when the diff includes TypeScript or TSX files.

- Keep one module per file.
- The only exception is a file that intentionally groups a collection of
  related utility functions.
- If a file has exactly one non-type, non-constant export (a function, class,
  enum, or module object), its file name must match that export exactly. Ignore
  `export type` / other type-only exports AND exported constants when counting:
  a file may also export supporting constants and still take the name of its
  single main export. Name the file after what a reader would consider the main
  export (the function or the module object). For example, a file that exports
  `detectBias` plus a supporting `MAX_BIAS_SCORE` constant and some exported
  types should be named `detectBias.ts`. (A file whose exports are *only*
  constants follows the `*.constants.ts` rule below instead.)
- If a file exports a collection of helper or utility functions, its name must
  describe the collection or shared purpose and end with either `Helpers.ts` or
  `Utils.ts`.
- If a helper collection is more idiomatically called through a module, such as
  `ModuleName.utilFnName()`, do not export the individual helpers. Export only a
  single module object or `@modules` module, and name the file exactly after
  that exported module.

  **Find candidates** (changed `.ts` / `.tsx` files whose single main runtime
  export does not match the file base name). Count only main exports (functions,
  classes, enums, and module objects declared with a `create*Module(...)`
  builder); supporting `export const` constants are ignored, so they no longer
  disqualify the file name:

  ```bash
  for f in <files-under-review-ending-in-.ts-or-.tsx>; do
    base="$(basename "$f" | sed -E 's/\.(test|types|constants|module)\.[^.]+$//; s/\.[^.]+$//')"
    exports="$(grep -Eho '^export +(function|class|enum) +[A-Za-z0-9_]+|^export +const +[A-Za-z0-9_]+ *= *create[A-Za-z]*Module\b' "$f" \
      | sed -E 's/^export +(function|class|enum|const) +//; s/ *=.*//' | sort -u)"
    count="$(printf '%s\n' "$exports" | sed '/^$/d' | wc -l | tr -d ' ')"
    if [ "$count" = 1 ] && [ "$exports" != "$base" ]; then
      printf '%s main export %s (supporting constants ignored)\n' "$f" "$exports"
    fi
  done
  ```
- If a module cannot be encapsulated in a single file, represent it as a
  directory module instead of continuing to grow one file.
- Use a directory module when a module has a companion `.test` file,
  tightly-coupled helper files, or React sub-components in separate files.
- **A unit split across two or more same-base-name files MUST live in its own
  directory, never loose alongside unrelated modules.** As soon as a single
  unit is represented by more than one file that shares its base name, group
  those files into a `<Name>/` directory and colocate them there. This covers
  every split, including:
  - `X.ts` + `X.test.ts`  →  `X/X.ts` + `X/X.test.ts`
  - `X.tsx` + `X.test.tsx` + `X.module.css`  →  `X/X.tsx` + `X/X.test.tsx` +
    `X/X.module.css`
  - `X.tsx` + `X.module.css`  →  `X/X.tsx` + `X/X.module.css`
  - `X.ts` + `X.types.ts` (or `X.constants.ts`)  →  `X/X.ts` + `X/X.types.ts`

  **Why:** a directory that holds many such pairs loose (e.g. `a.ts`,
  `a.test.ts`, `b.ts`, `b.test.ts`, `c.tsx`, `c.module.css`, …) reads as a wall
  of near-duplicate basenames and hides where one module ends and the next
  begins. One `<Name>/` directory per unit makes the parent listing one row per
  module again. The directory and its primary file both take the unit's name
  (`X/X.ts`), per the naming rule below.

  **Does not trigger** for a standalone file with no same-base-name sibling:
  that stays flat. The rule fires only once a *second* file for the same unit
  exists in the directory.

  **Find candidates** (base names that recur across suffixes in a directory but
  are not yet in their own directory):

  ```bash
  # For each directory under review, collapse test/module/types/constants
  # suffixes + the extension to the unit "stem", then flag stems with 2+ files.
  for dir in $(git diff --name-only <base> | xargs -n1 dirname | sort -u); do
    ls "$dir" 2>/dev/null \
      | sed -E 's/\.(test|module|types|constants|stories)\.[a-z]+$//;
                s/\.(ts|tsx|css|scss)$//' \
      | sort | uniq -d | sed "s|^|$dir/|"
  done
  ```

  Each printed stem is a split unit that should be moved into its own `<stem>/`
  directory (unless it already is one).
- For multi-file modules, prefer a directory module whose directory name and
  primary file name both match the module or component name.
- Keep directory and file casing aligned with the module naming rules. For
  example, React components should stay in `PascalCase`.
- **No `-`-prefixed route components under `src/routes/`.** TanStack Router
  drops any file or directory whose name starts with `-` from the route tree
  (`routeFileIgnorePrefix: "-"`), so a `-DisplayNameSection.tsx` colocated next
  to a route file is a hidden, non-route component and is not allowed. Route
  files stay thin (`createFileRoute` wiring a `component`); the view and its
  sub-components belong in `src/views/<Name>View/`, named without any `-`
  prefix, and the route file imports and renders that view.

  **Find candidates** (route-tree-ignored components colocated under
  `src/routes/`):

  ```bash
  git diff --name-only <base> | grep -E '/routes/.*/-[^/]+\.tsx?$'
  ```
- Never allow a file named just `constants.ts` or `types.ts`. These must be
  qualified with what they represent: the module/component name
  (`MyModule.constants.ts`, `MyComponent.types.ts`), or, when broader than a
  single module, the parent directory name (`csvParse.constants.ts`), or an
  app-level scope name when there is no meaningful parent
  (`app.constants.ts`). This applies to both `*.constants.ts` and `*.types.ts`
  (and their `.tsx` equivalents).

  **Find candidates:**

  ```bash
  grep -rEln '/(constants|types)\.(ts|tsx)$' <files-under-review>
  ```

  (or scan the changed file list for basenames of exactly `constants.ts`,
  `constants.tsx`, `types.ts`, or `types.tsx`.)
