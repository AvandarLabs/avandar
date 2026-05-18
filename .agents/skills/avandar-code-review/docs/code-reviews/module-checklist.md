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
