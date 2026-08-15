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
  single module object or `@avandar/modules` module, and name the file exactly
  after that exported module.

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

  **A directory couples only the one unit it is named after.** This is the
  case reviews miss, because being inside a `<Name>/` directory looks like the
  rule is already satisfied for everything in it. It is not: `Name.ts` +
  `Name.test.ts` are coupled by the directory itself and stay flat inside it,
  while every *other* same-base-name pair sitting beside them is its own unit
  and needs its own directory. Judge each stem separately rather than judging
  the directory once.

  Two kinds of file legitimately stay flat next to the pairs: a lone file with
  no same-base-name sibling, and a `<Dir>.types.ts` / `<Dir>.constants.ts` that
  belongs to the directory as a whole rather than to any one unit in it. The
  latter is why a grouping directory may carry `<Dir>.types.ts` with no
  `<Dir>.ts` beside it at all.

  This is bad (four units share one directory, so the listing is a wall of
  near-duplicate basenames and `Panel.types.ts` is buried among them):

  ```text
  Panel/
    Panel.tsx
    Panel.test.tsx
    Panel.types.ts
    useRowData.ts
    useRowData.test.ts
    formatCell.ts
    formatCell.test.ts
    EmptyState.tsx
  ```

  This is good (the directory couples `Panel`; the other two pairs get their
  own directories; the lone component and the directory-level types stay flat):

  ```text
  Panel/
    Panel.tsx
    Panel.test.tsx
    Panel.types.ts
    EmptyState.tsx
    useRowData/
      useRowData.ts
      useRowData.test.ts
    formatCell/
      formatCell.ts
      formatCell.test.ts
  ```

  **Find candidates** (base names that recur across suffixes in a directory but
  are not yet in their own directory):

  ```bash
  # For each directory under review, collapse test/module/types/constants
  # suffixes + the extension to the unit "stem", then flag stems with 2+ files.
  # The stem matching the directory's own name is skipped: that unit is already
  # coupled by the directory it sits in, and its siblings are the findings.
  for dir in $(git diff --name-only <base> | xargs -n1 dirname | sort -u); do
    ls "$dir" 2>/dev/null \
      | sed -E 's/\.(test|module|types|constants|stories)\.[a-z]+$//;
                s/\.(ts|tsx|css|scss)$//' \
      | sort | uniq -d \
      | grep -vx "$(basename "$dir")" \
      | sed "s|^|$dir/|"
  done
  ```

  Every printed stem is a finding: a split unit sitting loose that must move
  into its own `<stem>/` directory. Skipping the directory's own stem is what
  keeps the output actionable, since that stem is always printed otherwise and
  is never a finding.
- **Flag a `<Name>/` directory whose only content is `<Name>.<ext>`.** This is
  the converse of the rule above, and it is a violation in its own right, not
  merely the absence of one: a directory groups siblings, so a directory with a
  single child groups nothing while costing a redundant segment on every import
  (`.../MyHook/MyHook`). Collapse it, leaving the file beside its parent, and
  recreate the directory when a second co-named file actually appears. Applies
  to components, hooks, and plain `.ts` modules alike.

  Exceptions: 1) the directory also contains subdirectories, so it is a real
  grouping node; 2) a framework assigns the directory meaning (a route segment,
  for example), so the path is not free to change.

  This is bad:

  ```text
  DataExplorerDrawer/
    DataExplorerDrawer.tsx
    useDrawerResize/
      useDrawerResize.ts
  ```

  This is good:

  ```text
  DataExplorerDrawer/
    DataExplorerDrawer.tsx
    useDrawerResize.ts
  ```

  **Find candidates** (directories touched by the diff holding no subdirectory
  and exactly one file, whose stem matches the directory name):

  ```bash
  git diff --name-only <base> | xargs -n1 dirname | sort -u |
    while read -r dir; do
      [ -d "$dir" ] || continue
      [ -n "$(find "$dir" -maxdepth 1 -mindepth 1 -type d)" ] && continue
      files=$(find "$dir" -maxdepth 1 -type f)
      [ "$(printf '%s\n' "$files" | wc -l | tr -d ' ')" = 1 ] || continue
      stem=$(basename "$files"); stem=${stem%%.*}
      [ "$stem" = "$(basename "$dir")" ] && echo "$dir"
    done
  ```

  The stem comparison is what keeps a category directory (`auth/useAuth.ts`)
  out of the results: those group by topic, not by unit, and their single child
  is not named after them. Each printed directory should be collapsed.
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
