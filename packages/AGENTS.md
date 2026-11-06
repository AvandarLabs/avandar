# Packages

Rules for every `@avandar/*` workspace package under `packages/`.

## Keep the README in sync with the public API

Each package's `README.md` is the canonical list of what it exports. Agents
and engineers check it before writing a helper, so a missing entry leads to
a hand-rolled duplicate.

- When you add, rename, or remove a public export (anything exported from the
  package's entry point, such as `src/index.ts`), update the package's
  `README.md` in the same change.
- Add the export to the section and table that match its kind (for example a
  guard under "Guards", a utility type under "Utility types"), following the
  format of the rows already there.
- A change that touches a package's public exports is not finished until its
  README matches them.
