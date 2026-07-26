# Module Checklist

Use this checklist only when the diff includes TypeScript or TSX files.

- Keep one module per file.
- The only exception is a file that intentionally groups a collection of
  related utility functions.
- If a module cannot be encapsulated in a single file, represent it as a
  directory module instead of continuing to grow one file.
- Use a directory module when a module has a companion `.test` file,
  tightly-coupled helper files, or React sub-components in separate files.
- **A unit split across two or more same-base-name files MUST live in its own
  directory — never loose alongside unrelated modules.** As soon as a single
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

  **Does not trigger** for a standalone file with no same-base-name sibling —
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
