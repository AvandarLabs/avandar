# Module Checklist

Use this checklist only when the diff includes TypeScript or TSX files.

- Keep one module per file.
- The only exception is a file that intentionally groups a collection of
  related utility functions.
- If a module cannot be encapsulated in a single file, represent it as a
  directory module instead of continuing to grow one file.
- Use a directory module when a module has a companion `.test` file,
  tightly-coupled helper files, or React sub-components in separate files.
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
