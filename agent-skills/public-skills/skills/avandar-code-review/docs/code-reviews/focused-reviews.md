# Focused review packs

## Focused Reviews

A focused review is a concatenatable subset of this skill. It still
reviews the **entire** eligible diff, but applies **only** the named
packs. Use it when the user wants comments, file layout, naming, or
test quality in isolation instead of a full review.

### Invocation

Parse the words after `avandar-code-review` (or an equivalent "run this
skill" invocation). Matching is case-insensitive. Order does not matter.
Duplicate tokens collapse. The recognized pack tokens are:

| Token | Pack |
|-------|------|
| `comments` | every comment: docstrings, comment blocks, and inline comments |
| `docstrings` | alias for `comments`, kept so the older token still works |
| `files` | file hierarchy, directories, coupling, file names, single main export |
| `naming` | variable, function, and module-object naming |
| `tests` | test quality: tautologies, placeholders, observable behavior, e2e UI vs DB |

Examples:

- `avandar-code-review comments`
- `avandar-code-review files`
- `avandar-code-review naming`
- `avandar-code-review tests`
- `avandar-code-review files naming`
- `avandar-code-review files naming comments`
- `avandar-code-review files naming comments tests`

If at least one pack token is present, this is a focused review:

1. **Skip every phase and every bullet that is not in the selected
   packs.** That includes Most Common Mistakes and General Checks except
   the bullets listed below, every other language-specific phase, every
   library-gated phase, and the repo-local `extra-checklist.md` phases.
   Exclusive means exclusive.
2. Still apply **Base Branch Detection**, **Files To Skip**, **Review
   Scope** (`+` lines only), and the **Finish protocol**. Re-verify only
   the selected packs. Do not run `react-doctor` or any other phase that
   was not selected.

If no pack token is present, this is a full review. Follow **How The
Review Runs** and **Review Order** as written.

Unknown extra words that are not pack tokens or an explicit base branch
do not start a focused review on their own. Ignore them, including the
retired mode words `auto`, `report`, and `pair review`: the skill has
only one way of running.

## Deterministic IDs by pack

After the core handoff, select only the uncovered capabilities for these IDs:
`comments`: AF-06/07/11/20; `naming`: AF-10/12/13;
`files` and `tests`: none. Retain every contextual bullet in selected packs. Load selected
IDs from `deterministic-fallback-checklist.md`; the focused lane receives the
partition without loading omitted detector prose. AF-21 SQL comment forms
remain in the comments pack. All unrelated phases stay excluded.

### Pack: `comments`

Gate: the diff includes any source file that supports a block comment
and a line comment (same gate as Phase: comments), which includes `.sql`.
Plain CSS comments also select AF-20, independent of the CSS-module gate.

Apply **only**:

- The entire **Phase: comments** checklist
  (`comments-checklist.md`).
- For a `.sql` file, the **Comments** section of
  `sql-checklist.md`, which is where the SQL comment
  forms (`/** ... */` for declaration docstrings, `--` everywhere else)
  are defined.
- **Most Common Mistakes:** Planning comments.
- **General Checks:** comments should not use em dashes; exported or
  public interfaces, constants, objects, functions, and classes should
  have block comments or docstrings; function docstrings should explain
  the function's purpose and output, not its interior implementation.
- From `typescript-checklist.md`, only the comment and
  docstring bullets: JSDoc for public classes and methods; comment and
  docstring lines at 80 characters or fewer; all exported classes,
  objects, and functions need docstrings; if an exported object defines
  top-level methods inline, those methods need docstrings too; function
  docstrings should explain purpose and output, not interior
  implementation.

Do not apply any other TypeScript, module, naming, React, SQL, or
library rule.

### Pack: `files`

Gate: the diff includes at least one `.ts` or `.tsx` file (same gate as
Phase: module hierarchy).

Apply **only**:

- The entire **Phase: module hierarchy** checklist
  (`module-checklist.md`): one module per file, file
  name matches the single main non-type export, `Helpers`/`Utils`
  collections, directory modules, same-base-name grouping, and directory
  coupling.
- **General Checks:** treat a source file over 400 lines as monolithic
  and split it into a directory module (the 400/500-line thresholds, the
  migration and generated-file exceptions, and the "directory module,
  never a sibling file" fix).
- From `typescript-checklist.md`, only the file-layout
  bullets: do not add barrel files except in repo-approved directories;
  files that export only types use the `.types.ts` filename suffix;
  acronyms in **file and directory names** use PascalCase, whatever their
  length (`Url`, `Sql`, `Cli`, `Io`, not `URL`, `SQL`, `CLI`, `IO`).
  Identifier acronyms belong to `naming`, not this pack.

Do not apply variable or function identifier naming, comment rules, or
any other TypeScript / React / SQL / library rule.

### Pack: `naming`

Gate: the diff includes at least one `.ts` or `.tsx` file.

Apply **only**:

- **Most Common Mistakes:** Variable naming (no vague `matrix`,
  `count`, `next`, `prev`, `val`, or `n`; use a business noun; `idx` is
  the one acceptable short form).
- **General Checks:** follow language naming conventions; descriptive
  variable names with auxiliary verbs (`isLoading`, `hasError`); avoid
  abbreviations; avoid vague placeholders; a function that turns one
  value into another must name both sides (`to` / `get` / `from` /
  `make{Target}From{Source}`).
- From `typescript-checklist.md`, only the identifier
  naming bullets: PascalCase for React components, classes, singleton
  instances, and module objects; camelCase for variables, functions, and
  methods; UPPERCASE for environment variables and hard-coded constants;
  event handlers named `on...`, not `handle...`; conversion-function
  shapes including the retired `resolve` / `compute` / `build` /
  `create` prefixes and the copy-function exemption; acronyms in **identifiers and type names**
  use PascalCase, whatever their length and with no exceptions (`Url`,
  `Cli`, `Id`, `Db`, `Ci`, `Io`), while `UPPERCASE` constants and
  env var names are unaffected. File-name acronyms and the `.types.ts`
  suffix belong to `files`, not this pack.

Test names are not identifiers and belong to the `tests` pack, which
judges them against what the test asserts. Do not flag them here.

"Module naming" here means the identifier of an exported module object
(PascalCase, `create*Module` builders, conversion methods on the
receiver). The file that holds that export matching the export name is
the `files` pack.

Do not apply comment rules, directory-module rules, function-shape
rules, import/export form, or any other phase.

### Pack: `tests`

Gate: the diff adds or modifies a test file (`*.test.ts`, `*.test.tsx`,
`*.spec.ts`, `*.spec.tsx`, or the repo's equivalent unit/integration
test naming). Same gate as Phase: tests.

Apply **only**:

- The entire **Phase: tests** checklist
  (`tests-checklist.md`): test names that describe
  activity instead of the claim the test asserts, tautological and
  assertion-free tests, observable-behavior assertions, placeholder
  tests, runtime assertions that restate the type system, e2e specs
  that write the behavior under test through the database instead of
  the UI, test files named after no module beside them, aspect labels on
  a module's only test file, `__tests__/` layout once a module has two or
  more test files, integration-test placement in a `__tests__/`
  directory, and the `.integration` label on integration tests.

This pack does not pull extra bullets from Most Common Mistakes,
General Checks, or the TypeScript checklist. Running the tests
themselves stays in the **Finish protocol**
("Testing At The End Of Review"); this pack reviews test *code*.

Do not apply comment rules, directory-module rules, identifier naming,
or any other TypeScript / React / SQL / library rule.

### Focused-review find lanes

Each selected pack is one phase and one find lane. Do not load
`common-and-general`, `comments-and-module`, `typescript`, or any other
full-review lane.

| Lane | Pack | Gate |
|------|------|------|
| `focused-comments` | `comments` | comments gate |
| `focused-files` | `files` | `.ts` / `.tsx` in the diff |
| `focused-naming` | `naming` | `.ts` / `.tsx` in the diff |
| `focused-tests` | `tests` | test-file gate (`*.test.*` / `*.spec.*`) |

Fan-out uses the same threshold: fewer than 3 selected packs run
inline; 3 or more selected packs fan out. Repo-local extra-checklist
phases do **not** count (they do not run).
