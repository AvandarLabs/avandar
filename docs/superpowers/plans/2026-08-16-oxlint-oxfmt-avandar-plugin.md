# Oxfmt, Oxlint, and Avandar Lint Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Prettier (except SQL) with oxfmt, replace ESLint with oxlint,
then add `eslint-plugin-avandar` so type-2 rules auto-fix and type-1 rules
fail lint before `avandar-code-review` ever runs.

**Architecture:** Four sequential phases, each leaving `pnpm format` and
`pnpm lint` green. Phase 1 swaps the formatter and cages Prettier to
`supabase/schemas/**/*.sql`. Phase 2 swaps the linter and maps today's
`eslint.config.js` onto native oxlint plus a few JS plugins (TanStack,
`eslint-plugin-import-x` for `no-unresolved`, `oxlint-plugin-eslint` for
`max-len`). Phases 3 and 4 each start with a mandatory recategorization
sweep of the live `avandar-code-review` skill: this branch may sit idle
for a long time, and the rule lists frozen in this plan will go stale.
Only after that sweep (and user sign-off if the inventory moved) does
Phase 3 add `eslint-plugin-avandar` with fixers for current type-2 rules
and delete them from the skill, and Phase 4 add current type-1 gates as
errors (justified `oxlint-disable` is the escape hatch; file length uses
400 vs 500) and rewrite the skill so review only audits disables and
remaining type-3 judgement.

**Tech Stack:** oxfmt, oxlint (JS plugins, ESLint v9-compatible), Prettier 3

- `prettier-plugin-sql` (SQL only), Stylelint (unchanged), Vitest, the
  public `avandar-code-review` skill.

## Global Constraints

- Do not write to any Supabase database or remote project.
- Do not commit, push, or merge without user authorization.
- Do not run the full Playwright suite. Plugin tests are Vitest + oxlint on
  fixtures. Format/lint verification is `pnpm format` / `pnpm lint`.
- Keep unused-var checking **off** (today `@typescript-eslint/no-unused-vars`
  and `no-unused-vars` are `"off"`). Oxlint correctness would otherwise flood
  the repo.
- Prettier remains SQL-only after Phase 1. It must not be able to format
  JS/TS/JSON/CSS. Oxfmt must not format SQL.
- Type 2 and type 1 in this plan are a snapshot from 2026-08-16. They are
  **not** authority once Phases 3 or 4 start. Task 9 (before any plugin
  code) and Task 15 (before any type-1 code) must recategorize the live
  skill and patch the remaining tasks. Do not encode a rule this plan
  listed if the live skill no longer has it; do encode a new closed type
  1/2 the live skill gained. Fuzzy type 1s (conversion `resolve`/
  `compute`/`build`/`create`, open-ended abbreviations, `for`/`while`
  exceptions, type-checker exceptions, filesystem directory-module moves,
  SQL, CSS, copy placement) stay in the skill unless the sweep finds a
  newly closed denylist.
- Type 1 severity is **error**, not warn. Agents ignore warnings. The
  escape hatch is `oxlint-disable` / `oxlint-disable-next-line` with a
  required reason. File length >500 must not be disableable except via
  ignore globs (`*.gen.*`, `**/migrations/**`).
- After a rule lands in the plugin, delete its "find candidates" grep and
  (for type 2) its review bullet from
  `agent-skills/public-skills/skills/avandar-code-review/`. Keep type-3
  quality text (JSDoc purpose vs implementation, how to split a directory
  module). Canonical human style guides in `docs/rules/` stay; add a one-line
  "enforced by oxlint" note where a gate now exists.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 4320`. If `pnpm add oxlint`
  or `oxfmt` fails because the latest release is younger than 3 days, pin
  the newest version older than 3 days rather than excluding the package
  from the cooldown.
- JS plugins cannot be type-aware. Do not add custom type-aware rules.
- Context7 library for oxlint/oxfmt docs: `/websites/oxc_rs_guide_usage`.

## File map

| Path                                                                    | Role                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `.oxfmtrc.json`                                                         | oxfmt config (`printWidth: 80`, `sortImports`, `sortTailwindcss`)   |
| `.oxfmtignore`                                                          | same ignore set as today's `.prettierignore`, plus `*.sql`          |
| `.prettierrc`                                                           | SQL plugin + `*.sql` override only                                  |
| `.prettierignore`                                                       | invert to `*` then un-ignore `supabase/schemas/**`                  |
| `.oxlintrc.json`                                                        | oxlint config (native rules, overrides, `jsPlugins`)                |
| `eslint-plugin-avandar/`                                                | local plugin: `index.js`, `rules/*.js`, `rules/*.test.ts`, fixtures |
| `eslint.config.js`                                                      | deleted in Phase 2                                                  |
| `scripts/format-changed-files/format-changed-files.sh`                  | oxfmt → prettier SQL → oxlint --fix → stylelint                     |
| `apps/ava-cli/src/utils/writeFileFromTemplate/writeFileFromTemplate.ts` | oxfmt for non-SQL; prettier for `.sql`                              |
| `agent-skills/public-skills/skills/avandar-code-review/`                | skill + checklists                                                  |

---

## Phase 1 — oxfmt (Prettier except SQL)

Do not touch ESLint in this phase. `pnpm lint` still runs `eslint .`.

### Phase 1 as built (deviations from the text below)

Implemented against oxfmt 0.64.0. Seven places where reality differed from
the plan; Phase 2 has to work with the result, not the text.

1. **oxfmt does not auto-discover `.oxfmtignore`.** It reads `.gitignore` and
   `.prettierignore` from the cwd. Because Task 2 inverts `.prettierignore`
   to `*`, a bare `oxfmt` formats nothing. Every invocation therefore passes
   `--ignore-path .oxfmtignore`, and `pnpm format:oxfmt` wraps it.
   `.gitignore` is honoured regardless of the flag.
2. **`sortImports.internalPattern` takes literal prefixes, not regexes.** The
   plan's `["^@/", "^\$/"]` silently matches nothing; the config uses
   `["@/", "$/"]`.
3. **`sortPackageJson` defaults to on** in oxfmt and reordered every
   `package.json`. It is explicitly `false`.
4. **`.jsonc` needed a `trailingComma: "none"` override**, carried over from
   the old `.prettierrc`. Plain `.json` was already left alone.
5. **`.prettierrc` keeps `expressionWidth: 40`**, not the 8 the plan names,
   which would have reflowed every schema file.
6. **`.oxfmtignore` mirrors ESLint's ignore list** (`agent-skills/**`,
   `.claude/**`, `playwright-report/**`, and so on). Two files under
   `agent-skills/` are deliberate IIFE fragments that no parser reads
   standalone, and vendored skill content should not be restyled.
7. **Losing `experimentalTernaries` broke `max-len` in three files.** Two
   needed comments rewrapped. `AnalyticsEventPayloads` is 29 conditionals
   deep and its tail arms start past column 80 whatever they contain, so it
   carries a scoped `eslint-disable max-len`. Flattening that chain into a
   keyed payload map is open follow-up work, and Phase 4 should expect the
   same class of problem wherever a deep ternary chain survives.

One judgement call left for review: the `groups` list combines
`value-builtin` and `value-external` into one alphabetical group, exactly as
written below, so `node:*` imports no longer lead a file. That is a change
from the old `<BUILTIN_MODULES>` / `<THIRD_PARTY_MODULES>` split. Splitting
them back is a one-line config edit plus a re-run of `pnpm format:oxfmt`.

### Task 1: Install oxfmt and write its config

**Files:**

- Create: `.oxfmtrc.json`
- Create: `.oxfmtignore`
- Modify: `package.json` (root `devDependencies` only)

**Interfaces:**

- Consumes: current `.prettierrc` (`printWidth: 80`, `semi: true`,
  `tabWidth: 2`, import order, Tailwind class sort).
- Produces: oxfmt that formats JS/TS/JSON/CSS/Markdown with width 80.
  `experimentalTernaries` is unsupported; do not try to preserve it.

- [x] **Step 1: Install oxfmt**

```bash
pnpm add -D oxfmt@latest
```

Expected: lockfile updates. If `minimumReleaseAge` rejects the latest
release, install the newest version published more than 3 days ago
(`npm view oxfmt time --json` to pick).

- [x] **Step 2: Generate and hand-tune config**

```bash
pnpm exec oxfmt --migrate=prettier
```

Then edit `.oxfmtrc.json` so it contains at least:

```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 80,
  "semi": true,
  "tabWidth": 2,
  "sortImports": {
    "internalPattern": ["^@/", "^\\$/"],
    "groups": [
      "type-import",
      ["value-builtin", "value-external"],
      "value-internal",
      ["value-parent", "value-sibling", "value-index"],
      "unknown",
    ],
  },
  "sortTailwindcss": {
    "functions": ["clsx", "cn", "cx"],
  },
}
```

Delete any migrated `experimentalTernaries`. Default oxfmt `printWidth` is
100; leaving it unset is a bug.

- [x] **Step 3: Write `.oxfmtignore`**

Copy today's `.prettierignore` and add `*.sql` so oxfmt never touches SQL:

```
node_modules
dist
build
.agents
src/routeTree.gen.ts
LICENSE
shared/types/database.types.ts
src/i18n/locales/*/messages.ts
supabase/tests/**/*.sql
*.sql
```

- [x] **Step 4: Smoke-check one file without writing the repo**

```bash
pnpm exec oxfmt --check src/main.tsx
```

Expected: either "all files formatted" or a list of diffs. Do **not** run
`oxfmt` without `--check` on the whole tree yet.

- [x] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .oxfmtrc.json .oxfmtignore
git commit -m "$(cat <<'EOF'
chore: add oxfmt with printWidth 80

EOF
)"
```

### Task 2: Cage Prettier to SQL schemas

**Files:**

- Modify: `.prettierrc`
- Modify: `.prettierignore`
- Modify: `package.json` (drop `@ianvs/prettier-plugin-sort-imports` and
  `prettier-plugin-tailwindcss`; keep `prettier` and `prettier-plugin-sql`)

**Interfaces:**

- Consumes: current Prettier SQL override (`language: postgresql`, all
  `*Case: lower`).
- Produces: `pnpm exec prettier --write some.ts` is a no-op (ignored);
  `pnpm exec prettier --write supabase/schemas/<file>.sql` still formats.

- [x] **Step 1: Replace `.prettierrc` with SQL-only config**

```json
{
  "plugins": ["prettier-plugin-sql"],
  "overrides": [
    {
      "files": ["*.sql"],
      "options": {
        "language": "postgresql",
        "keywordCase": "lower",
        "dataTypeCase": "lower",
        "functionCase": "lower",
        "identifierCase": "lower",
        "indentStyle": "standard",
        "logicalOperatorNewline": "after",
        "expressionWidth": 8,
        "linesBetweenQueries": 1
      }
    }
  ]
}
```

- [x] **Step 2: Invert `.prettierignore`**

```
*
!supabase/
!supabase/schemas/
!supabase/schemas/**
```

- [x] **Step 3: Drop JS Prettier plugins**

```bash
pnpm remove @ianvs/prettier-plugin-sort-imports prettier-plugin-tailwindcss
```

Keep `prettier` and `prettier-plugin-sql`.

- [x] **Step 4: Verify the cage**

```bash
pnpm exec prettier --write --log-level warn src/main.tsx
pnpm exec prettier --check supabase/schemas
```

Expected: first command does not rewrite `src/main.tsx`. Second command
runs the SQL plugin on schema files (check or already-formatted is fine).

- [x] **Step 5: Commit**

```bash
git add .prettierrc .prettierignore package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: constrain prettier to supabase schema SQL

EOF
)"
```

### Task 3: Retarget format script, editor, and docs

**Files:**

- Modify: `scripts/format-changed-files/format-changed-files.sh`
- Modify: `.vscode/settings.json`
- Modify: `README.md` (the pre-push paragraph around lines 46–52)
- Modify: `.cursor/rules/global.mdc` (Libraries: Formatter line)
- Modify: `AGENTS.md` only if it names Prettier as the JS formatter

**Interfaces:**

- Consumes: changed-file list from git (unchanged).
- Produces: oxfmt on non-SQL files, prettier on `*.sql`, eslint --fix still
  on JS/TS, stylelint --fix on CSS. Exit 2 if any rewriter changed a file.

- [x] **Step 1: Split Stage 6 of the format script**

Replace the single `prettier --write --ignore-unknown` invocation with:

```bash
# Stage 6a: oxfmt on everything except SQL
OXFMT_FILES=()
SQL_FILES=()
for f in "${EXISTING[@]}"; do
  case "$f" in
    *.sql) SQL_FILES+=("$f") ;;
    *) OXFMT_FILES+=("$f") ;;
  esac
done

if [ ${#OXFMT_FILES[@]} -gt 0 ]; then
  pnpm exec oxfmt "${OXFMT_FILES[@]}" >&2 || true
fi

if [ ${#SQL_FILES[@]} -gt 0 ]; then
  pnpm exec prettier --write --log-level warn "${SQL_FILES[@]}" >&2 || true
fi
```

Update the file header comment from "Runs prettier, eslint --fix" to
"Runs oxfmt, prettier (SQL only), eslint --fix, and stylelint --fix".

Leave Stage 8 as `eslint --fix` until Phase 2.

- [x] **Step 2: Point the editor at Oxc, Prettier only for SQL**

In `.vscode/settings.json` set:

```json
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "oxc.oxc-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "oxc.oxc-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "oxc.oxc-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "oxc.oxc-vscode"
  },
  "[jsonc]": {
    "editor.defaultFormatter": "oxc.oxc-vscode"
  },
  "[sql]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

Keep the existing Deno / Stylelint / TypeScript keys.

- [x] **Step 3: Docs**

`README.md` pre-push sentence becomes: oxfmt, prettier on SQL schemas,
eslint --fix, stylelint --fix.

`.cursor/rules/global.mdc`:

```
- Linter: ESLint v9
- Formatter: Oxfmt (Prettier v3 for SQL schemas only)
```

(Linter line stays until Phase 2.)

- [x] **Step 4: Commit**

```bash
git add scripts/format-changed-files/format-changed-files.sh .vscode/settings.json README.md .cursor/rules/global.mdc
git commit -m "$(cat <<'EOF'
chore: run oxfmt from format script and editor

EOF
)"
```

### Task 4: Retarget ava-cli and new-route generators

**Files:**

- Modify: `apps/ava-cli/src/utils/writeFileFromTemplate/writeFileFromTemplate.ts`
- Modify: `apps/ava-cli/src/DevCLI/NewBoilerplateCLI/NewEdgeFunctionCLI/newEdgeFunction.ts`
- Modify: `apps/ava-cli/package.json` (add `oxfmt`; keep `prettier` for SQL)
- Modify: `apps/ava-cli/tsup.config.ts` (`external` list: add `oxfmt`, keep
  `prettier`)
- Modify: `scripts/generators/new-route/new-route.main.ts`

**Interfaces:**

- Consumes: generated file path + contents.
- Produces: JS/TS/JSON/etc formatted with oxfmt; `.sql` still Prettier.

- [x] **Step 1: Add oxfmt to ava-cli**

```bash
pnpm --filter @avandar/ava-cli add oxfmt
```

Keep `prettier` on ava-cli. It still formats SQL.

- [x] **Step 2: Branch `writeFileFromTemplate` on extension**

Replace `_formatFileWithPrettier` with:

```ts
async function _formatGeneratedFile(filePath: string): Promise<void> {
  if (filePath.endsWith(".sql")) {
    await _formatFileWithPrettier(filePath);
    return;
  }

  const { format } = await import("oxfmt");
  const fileContents = await fs.promises.readFile(filePath, "utf8");
  const formatted = await format(filePath, fileContents);
  if (formatted.code === fileContents) {
    return;
  }
  await fs.promises.writeFile(filePath, formatted.code, "utf8");
}
```

Confirm the oxfmt `format()` return shape against Context7
(`/websites/oxc_rs_guide_usage`, query `format(filepath, input, options)`)
if `formatted.code` is wrong; use whatever field the installed version
returns.

Call `_formatGeneratedFile` where `_formatFileWithPrettier` is called
today.

- [x] **Step 3: `formatFileWithRepoPrettier` in newEdgeFunction.ts**

Rename to `formatGeneratedFile` and switch the `execSync` to:

```ts
const formatter = options.filePath.endsWith(".sql")
  ? `pnpm exec prettier --write "${options.filePath}"`
  : `pnpm exec oxfmt "${options.filePath}"`;
execSync(formatter, { cwd: options.projectRoot, stdio: "pipe" });
```

- [x] **Step 4: `scripts/generators/new-route/new-route.main.ts`**

Replace the `prettier` import + `resolveConfig`/`format` block with:

```ts
import { format } from "oxfmt";

const formattedContent = (await format(routeFilePath, processedContent)).code;
```

(Adjust `.code` if the API differs; same check as Step 2.)

- [x] **Step 5: Commit**

```bash
git add apps/ava-cli scripts/generators/new-route/new-route.main.ts pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: format generated files with oxfmt

EOF
)"
```

### Task 5: Format the non-SQL tree once

**Files:**

- Rewrite: whatever oxfmt wants to change (own commit, no logic)

**Interfaces:**

- Consumes: `.oxfmtrc.json` + `.oxfmtignore`.
- Produces: a single formatting commit so later phases do not mix style
  churn with lint/plugin work.

- [x] **Step 1: Write**

```bash
pnpm exec oxfmt
```

Do not pass SQL paths. `.oxfmtignore` already has `*.sql`.

- [x] **Step 2: Sanity**

```bash
pnpm exec oxfmt --check
pnpm exec prettier --check supabase/schemas
```

Expected: both exit 0. If oxfmt wants a second pass, run it again.

- [x] **Step 3: Commit only formatting**

```bash
git add -u
git commit -m "$(cat <<'EOF'
style: apply oxfmt across the repo

EOF
)"
```

If `git status` shows no changes, skip the commit.

---

## Phase 2 — oxlint (replace ESLint)

Do not add `eslint-plugin-avandar` yet. Goal: same policy as
`eslint.config.js`, faster, no ESLint CLI.

### Task 6: Install oxlint and migrate the flat config

**Files:**

- Create: `.oxlintrc.json` (or `.oxlintrc.jsonc` if migrate emits that)
- Modify: `package.json` (add `oxlint`, `oxlint-plugin-eslint`)

**Interfaces:**

- Consumes: `eslint.config.js`.
- Produces: a starting oxlint config. Hand-tune in Task 7; do not delete
  ESLint until Task 8 is green.

- [ ] **Step 1: Install**

```bash
pnpm add -D oxlint@latest oxlint-plugin-eslint
```

Same `minimumReleaseAge` rule as oxfmt.

- [ ] **Step 2: Migrate**

```bash
pnpm exec oxlint --migrate eslint.config.js
```

If the CLI is `npx @oxlint/migrate eslint.config.js` on this version, use
that (Context7 `/websites/oxc_rs_guide_usage`, "Run migration tool").

- [ ] **Step 3: Commit the generated file plus any migrate notes**

```bash
git add .oxlintrc.json package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: add oxlint and migrate eslint.config.js

EOF
)"
```

Do not delete `eslint.config.js` yet.

### Task 7: Hand-tune oxlint to match current policy

**Files:**

- Modify: `.oxlintrc.json`

**Interfaces:**

- Consumes: `eslint.config.js` (source of truth for this task).
- Produces: `pnpm exec oxlint .` with the same _intent_ as `eslint .`,
  including ignores, Deno extension rules, package import walls, and the
  privacy chokepoint.

Native plugins to enable: `import`, `react`, `jsx-a11y`, `typescript`
(and unicorn/react-refresh if migrate pulled them in for rules we use).

`jsPlugins` for gaps that are not native:

```jsonc
{
  "jsPlugins": [
    "oxlint-plugin-eslint",
    "eslint-plugin-import-x",
    "@tanstack/eslint-plugin-query",
    "@tanstack/eslint-plugin-router",
  ],
}
```

Keep those four npm packages as root devDependencies until/unless native
coverage appears. `eslint-plugin-import-x` stays **only** for
`import-js/no-unresolved` (or whatever prefix migrate assigns). Native
`import/extensions` and `import/no-duplicates` stay native.

Required rule mapping (names may differ slightly after migrate; keep the
options):

| Today                                                                         | Oxlint                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `max-len` 80 including comments, ignore import lines/urls/strings/templates   | `eslint-js/max-len` (or `eslint/max-len`) with the same options object from `eslint.config.js` lines 186–198 |
| `arrow-body-style: always`                                                    | native equivalent; keep `always`                                                                             |
| `explicit-module-boundary-types`                                              | native typescript rule                                                                                       |
| `array-type: array-simple`                                                    | native                                                                                                       |
| `@typescript-eslint/no-shadow`                                                | `eslint/no-shadow` (TS-aware in oxlint). Do not enable both.                                                 |
| `no-unused-vars` / `@typescript-eslint/no-unused-vars`                        | **`"off"`**                                                                                                  |
| `react/function-component-definition` named = function-declaration            | native                                                                                                       |
| `react-refresh/only-export-components` allowConstantExport                    | native `react/only-export-components`                                                                        |
| `react-hooks/exhaustive-deps` error                                           | native                                                                                                       |
| `import-x/extensions` never, except Deno paths always                         | native `import/extensions` + override                                                                        |
| `import-x/no-unresolved` ignore `^virtual:`                                   | JS plugin; desktop override ignore `^bun:` and `^duckdb$`; edge `off`                                        |
| `jsx-a11y/anchor-is-valid` / `label-has-associated-control`                   | native with same options                                                                                     |
| `no-restricted-imports` Deno-unsafe packages + no relative in shared/supabase | native                                                                                                       |
| `no-restricted-imports` packages cannot import `@/*` `$/*`                    | native                                                                                                       |
| packages/shared: both Deno + no-app                                           | native (same "later override replaces" ordering as today)                                                    |
| privacy chokepoint `issueAckToken` / `registerAck`                            | native `importNames`                                                                                         |
| e2e: `react-hooks/rules-of-hooks` off                                         | override                                                                                                     |
| e2e fixtures: `no-empty-pattern` off                                          | override                                                                                                     |
| vitest.config.ts: `no-restricted-imports` off                                 | override                                                                                                     |

Ignores must include today's list: `**/dist/**`, `.agents/**`, `.claude/**`,
`agent-skills/**`, desktop build/bundle/cache, `src/i18n/locales/**/messages.ts`,
`shared/types/database.types.ts`.

Also enable, because the review skill already treats them as mechanical and
oxlint has them natively (do not wait for the Avandar plugin):

```jsonc
{
  "rules": {
    "curly": "error",
    "prefer-template": "error",
    "typescript/consistent-type-imports": "error",
    "import/no-default-export": "error",
    "typescript/no-explicit-any": "error",
  },
}
```

`curly` / `prefer-template` / `consistent-type-imports` / `no-default-export`
/ `no-explicit-any` are type 2 (or already-on policy). Turning them on
**will** fail on existing code. Do **not** enable them in this task if the
first `oxlint .` run shows thousands of hits; instead enable them in
Phase 3 Task 13 alongside `--fix` and a dedicated rewrite commit. Record
in the PR which of these five were deferred to Task 13. The Task 9 sweep
may drop or add names on that list if native oxlint coverage changed.

- [ ] **Step 1: Edit `.oxlintrc.json` to the mapping above**

- [ ] **Step 2: Compare**

```bash
pnpm exec eslint . 2>&1 | tee /tmp/eslint-out.txt | tail
pnpm exec oxlint . 2>&1 | tee /tmp/oxlint-out.txt | tail
```

Expected: oxlint is not missing a currently-failing ESLint rule we care
about. New oxlint-only hits: either fix the code (mechanical) or disable
the new rule if it is unused-vars/correctness we agreed to keep off.

- [ ] **Step 3: Commit the config only**

```bash
git add .oxlintrc.json
git commit -m "$(cat <<'EOF'
chore: match oxlint config to eslint policy

EOF
)"
```

Code fixes for new native rules belong in Task 13 or a follow-up commit
in Task 8, not mixed into the config commit if the diff is large.

### Task 8: Switch scripts, drop ESLint, keep the overlay gone

**Files:**

- Modify: `package.json` (`lint`, `lint:ts:fix-changed`; remove ESLint
  stack)
- Modify: `apps/pipeline-server/package.json` (`"lint": "oxlint ."`)
- Modify: `apps/dev-fanout-server/package.json` (`"lint": "oxlint ."`)
- Modify: `scripts/format-changed-files/format-changed-files.sh` Stage 8
- Modify: `vite.config.ts` (remove `@nabla/vite-plugin-eslint`)
- Delete: `eslint.config.js`
- Modify: `.cursor/rules/global.mdc` (Linter line)
- Modify: `README.md`
- Modify: `scripts/verify-packages.sh` comment that names `eslint.config.js`

**Interfaces:**

- Consumes: `.oxlintrc.json` from Task 7.
- Produces: `pnpm lint` = `oxlint . && stylelint ... && react-doctor ...`.
  CI already calls `pnpm lint` (`.github/workflows/pr-develop.yaml`,
  `staging.yaml`, `production.yaml`); no workflow edit unless the script
  name changes.

Remove from root `devDependencies` once `pnpm lint` is green on oxlint:

- `eslint`, `@eslint/js`, `typescript-eslint`, `globals`,
  `eslint-config-prettier`, `eslint-import-resolver-typescript`,
  `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`,
  `eslint-plugin-unused-imports`, `eslint-plugin-tailwindcss`,
  `@nabla/vite-plugin-eslint`

Keep until native replacements exist (Task 7 `jsPlugins`):

- `eslint-plugin-import-x`
- `@tanstack/eslint-plugin-query`
- `@tanstack/eslint-plugin-router`
- `oxlint-plugin-eslint`

Keep `prettier` + `prettier-plugin-sql`. Keep `stylelint*`. Keep
`react-doctor`.

- [ ] **Step 1: Point scripts at oxlint**

Root:

```json
"lint": "oxlint . && stylelint \"src/**/*.css\" && (react-doctor --yes --scope changed --base develop --no-score || true)",
"lint:ts:fix-changed": "git diff --name-only -z --diff-filter=ACMR HEAD | (grep -zE '\\.(js|jsx|ts|tsx|mjs|cjs)$' || true) | xargs -0 oxlint --fix"
```

Format script Stage 8:

```bash
pnpm exec oxlint --fix "${JSTS[@]}" >&2 || true
```

- [ ] **Step 2: Remove the Vite ESLint overlay**

Delete `import eslintPlugin from "@nabla/vite-plugin-eslint"` and
`eslintPlugin()` from `vite.config.ts`. Do not replace it with an oxlint
Vite plugin.

- [ ] **Step 3: Delete `eslint.config.js` and uninstall the ESLint stack**

```bash
pnpm remove eslint @eslint/js typescript-eslint globals eslint-config-prettier eslint-import-resolver-typescript eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y eslint-plugin-unused-imports eslint-plugin-tailwindcss @nabla/vite-plugin-eslint
rm eslint.config.js
```

- [ ] **Step 4: Docs**

`.cursor/rules/global.mdc`: `Linter: Oxlint` (drop "ESLint v9").
`README.md`: pre-push uses oxlint --fix.
`scripts/verify-packages.sh`: the comment about `packages/**` in
`eslint.config.js` should name `.oxlintrc.json`.

- [ ] **Step 5: Verify**

```bash
pnpm lint
```

Expected: exit 0, or a punch list of real violations you fix in this
task if they are small. If `import/no-default-export` (etc.) was deferred
to Task 13, it must still be `"off"` here so this command is green.

- [ ] **Step 6: Commit**

```bash
git add -u package.json pnpm-lock.yaml apps/pipeline-server/package.json apps/dev-fanout-server/package.json scripts/format-changed-files/format-changed-files.sh vite.config.ts .cursor/rules/global.mdc README.md scripts/verify-packages.sh
git commit -m "$(cat <<'EOF'
chore: replace eslint with oxlint

EOF
)"
```

---

## Phase 3 — Plugin type 2 (fixers) and skill deletion

Do **not** scaffold the plugin or encode a rule until Task 9 is done.
The type-2 lists in Tasks 11–14 are a 2026-08-16 snapshot.

### Task 9: Recategorize the live review skill (type 2 sweep)

**Files:**

- Read (do not edit until the inventory is signed off):
  - `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/comments-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/typescript-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/types-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/module-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/functional-style-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/react-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/react-hooks-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/tests-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/css-modules-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/sql-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/extra-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/libraries/avandar-utils-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/libraries/avandar-models-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/libraries/avandar-modules-checklist.md`
  - `agent-skills/public-skills/skills/avandar-code-review/docs/code-reviews/libraries/supabase-checklist.md`
  - repo-local `docs/code-reviews/extra-checklist.md` and every file it
    references under `docs/code-reviews/`
  - `docs/rules/` (canonical human copies; note drift vs the skill)
- Modify: this plan (`docs/superpowers/plans/2026-08-16-oxlint-oxfmt-avandar-plugin.md`)
  Tasks 11–14 rule lists and skill-deletion bullets, **after** sign-off
- Also read: current `.oxlintrc.json` and oxlint docs
  (`/websites/oxc_rs_guide_usage`) so newly-native rules are not
  reimplemented in the plugin

**Interfaces:**

- Consumes: the live skill + checklists as they exist on this date, not
  the snapshot in Tasks 11–14.
- Produces: a type-1 / type-2 / type-3 inventory and a delta against this
  plan. Plugin work in Tasks 10–14 uses the **new** type-2 list.

Categories (same definitions as the 2026-08-16 design):

1. **Type 2:** deterministic gate and deterministic in-file fix. Encode
   with a fixer, then delete from the skill.
2. **Type 1:** deterministic gate, judgement to fix. Do **not** encode in
   Phase 3. List them for Task 15.
3. **Type 3:** gate itself needs judgement. Stay in the skill. Never
   encode.

A rule is only type 1 or 2 if a JS plugin can decide from the current
file's AST/text without the type checker, without walking other files
(except a cheap `fs` stat if already required), and without SQL/CSS
parsers. Native oxlint that already covers a type-2 rule counts as
covered: put it in `.oxlintrc.json`, not the plugin.

- [ ] **Step 1: Read every file in the list above end to end.** Do not
      skim. New bullets, new checklists, and repo-local extra phases all
      count. If `extra-checklist.md` points at more files, follow them.

- [ ] **Step 2: Classify every rule** into type 1, 2, or 3. Closed
      denylists are type 1. Open naming / comment quality / architecture
      splits are type 3. If a planned type-2 fixer would need a better
      identifier or a docstring _written_, it is type 1, not type 2.

- [ ] **Step 3: Diff against this plan's snapshot.** Report to the user,
      before any plugin code:
  - Added since 2026-08-16 (new type 2 to encode / new type 1 to defer
    to Phase 4 / new type 3 to ignore)
  - Removed or rewritten (drop from Tasks 11–14)
  - Reclassified (type 2 → 1, 1 → 2, 1/2 → 3, 3 → 1/2)
  - Now native in oxlint (enable in config; do not write a plugin rule)
  - Still out of scope (SQL, CSS, filesystem moves, type-aware, fuzzy
    conversion prefixes) unless the live skill now gives a closed
    denylist

- [ ] **Step 4: Stop.** If the delta is empty, say so and wait for the
      user to say continue. If the delta is non-empty, patch Tasks 11–14
      (and the Lint Plugin Gate draft in Task 14) to match the live type-2
      list, then wait for the user to approve that patch. Do not start
      Task 10 until they do.

- [ ] **Step 5: Commit only if the plan file changed**

```bash
git add docs/superpowers/plans/2026-08-16-oxlint-oxfmt-avandar-plugin.md
git commit -m "$(cat <<'EOF'
docs: refresh type-2 plugin inventory from live review skill

EOF
)"
```

Skip the commit when Step 4 was "no delta" and the plan file is
unchanged.

### Task 10: Scaffold `eslint-plugin-avandar` and the oxlint fixture harness

**Files:**

- Create: `eslint-plugin-avandar/package.json`
- Create: `eslint-plugin-avandar/index.js`
- Create: `eslint-plugin-avandar/runOxlintFixture.ts`
- Create: `eslint-plugin-avandar/rules/.gitkeep` (removed when first rule
  lands)
- Modify: `.oxlintrc.json` (`jsPlugins` includes
  `./eslint-plugin-avandar/index.js`; no avandar rules enabled yet)

**Interfaces:**

- Consumes: oxlint CLI, fixture source strings.
- Produces: `runOxlintFixture({ rule, code, fix? })` → `{ diagnostics,
output }`. Plugin `meta.name` is `avandar` so rules are `avandar/foo`.

- [ ] **Step 1: Plugin package (not published, not a workspace member)**

`eslint-plugin-avandar/package.json`:

```json
{
  "name": "eslint-plugin-avandar",
  "private": true,
  "type": "module",
  "version": "0.0.0",
  "main": "./index.js",
  "scripts": {
    "test": "vitest run"
  }
}
```

`eslint-plugin-avandar/index.js`:

```js
/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  meta: { name: "avandar", version: "0.0.0" },
  rules: {},
};

export default plugin;
```

- [ ] **Step 2: Fixture runner**

`runOxlintFixture.ts` must spawn the repo's oxlint against a temp file
with a tiny config that enables only the rule under test:

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = fileURLToPath(new URL("./index.js", import.meta.url));

export function runOxlintFixture(options: {
  rule: string;
  code: string;
  filename?: string;
  fix?: boolean;
}): { stdout: string; output: string; exitCode: number } {
  const dir = mkdtempSync(join(tmpdir(), "avandar-oxlint-"));
  const filename = options.filename ?? "fixture.ts";
  const filePath = join(dir, filename);
  writeFileSync(filePath, options.code);
  writeFileSync(
    join(dir, ".oxlintrc.json"),
    JSON.stringify({
      jsPlugins: [PLUGIN],
      rules: { [`avandar/${options.rule}`]: "error" },
    }),
  );
  const args = [filePath, "--format=json"];
  if (options.fix) {
    args.push("--fix");
  }
  try {
    const stdout = execFileSync("pnpm", ["exec", "oxlint", ...args], {
      encoding: "utf8",
      cwd: dir,
    });
    return {
      stdout,
      output: readFileSync(filePath, "utf8"),
      exitCode: 0,
    };
  } catch (error) {
    const err = error as { stdout?: string; status?: number };
    return {
      stdout: err.stdout ?? "",
      output: readFileSync(filePath, "utf8"),
      exitCode: err.status ?? 1,
    };
  }
}
```

Adjust `--format=json` / `pnpm exec oxlint` if this oxlint version uses a
different JSON flag. The contract is: tests can assert on diagnostic rule
ids and on `--fix` output.

- [ ] **Step 3: Wire `jsPlugins` in the repo `.oxlintrc.json`**

```jsonc
"jsPlugins": [
  "./eslint-plugin-avandar/index.js",
  "oxlint-plugin-eslint",
  "eslint-plugin-import-x",
  "@tanstack/eslint-plugin-query",
  "@tanstack/eslint-plugin-router"
]
```

Do not enable any `avandar/*` rules yet.

- [ ] **Step 4: Smoke the harness with a failing test for Task 11**

Add `eslint-plugin-avandar/rules/no-em-dash-in-comments.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runOxlintFixture } from "../runOxlintFixture.ts";

describe("avandar/no-em-dash-in-comments", () => {
  it("flags an em dash in a line comment", () => {
    const result = runOxlintFixture({
      rule: "no-em-dash-in-comments",
      code: "// wait — then continue\n",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toContain("no-em-dash-in-comments");
  });
});
```

Run:

```bash
pnpm exec vitest run eslint-plugin-avandar/rules/no-em-dash-in-comments.test.ts
```

Expected: FAIL (rule not registered).

- [ ] **Step 5: Commit**

```bash
git add eslint-plugin-avandar .oxlintrc.json
git commit -m "$(cat <<'EOF'
chore: scaffold eslint-plugin-avandar for oxlint

EOF
)"
```

### Task 11: Type 2 comment rules (with fixers)

Implement the **Task 9 type-2 comment rules**, not this snapshot if they
disagree. Snapshot below is the 2026-08-16 default.

**Files:**

- Create: `eslint-plugin-avandar/rules/no-em-dash-in-comments.js`
- Create: `eslint-plugin-avandar/rules/no-jsdoc-in-function-body.js`
- Create: `eslint-plugin-avandar/rules/prefer-single-line-jsdoc.js`
- Create: matching `*.test.ts` for each
- Modify: `eslint-plugin-avandar/index.js`
- Modify: `.oxlintrc.json` (enable the three as `"error"`)

**Interfaces:**

- `no-em-dash-in-comments`: report U+2014 in `//` and `/* */` / JSDoc.
  Fixer: replace with `: ` when the dash is mid-clause, else `-`.
  Simplest acceptable fixer: always replace `—` with `: `.
- `no-jsdoc-in-function-body`: `Block` inside a function (not the leading
  JSDoc attached to a nested declaration) that starts with `/**`. Fixer:
  rewrite to `//` lines, same text, no `/** */`.
- `prefer-single-line-jsdoc`: a JSDoc whose trimmed inner text fits in
  `/** ${text} */` at printWidth 80. Fixer: collapse to one line. Skip
  if `@param` / `@returns` / `@example` tags exist.

Every rule object:

```js
export const noEmDashInComments = {
  meta: {
    type: "layout",
    fixable: "code",
    docs: { description: "Disallow em dashes in comments." },
    messages: {
      emDash: "Comments must not use em dashes. Use a colon or a hyphen.",
    },
  },
  create(context) {
    return {
      Program() {
        const source = context.sourceCode ?? context.getSourceCode();
        for (const comment of source.getAllComments()) {
          const index = comment.value.indexOf("\u2014");
          if (index === -1) {
            continue;
          }
          context.report({
            loc: comment.loc,
            messageId: "emDash",
            fix(fixer) {
              const start = comment.range[0];
              const dashStart = start + 2 + index;
              return fixer.replaceTextRange([dashStart, dashStart + 1], ":");
            },
          });
        }
      },
    };
  },
};
```

Register in `index.js`:

```js
import { noEmDashInComments } from "./rules/no-em-dash-in-comments.js";
// ...

rules: {
  "no-em-dash-in-comments": noEmDashInComments,
  "no-jsdoc-in-function-body": noJsdocInFunctionBody,
  "prefer-single-line-jsdoc": preferSingleLineJsdoc,
}
```

- [ ] **Step 1: Keep the Task 10 test failing, then implement
      `no-em-dash-in-comments` until it passes**

Tests required:

1. `// wait — then` → flags, `--fix` removes the em dash
2. `/** hello — world */` on an export → flags
3. `// wait: then` → clean
4. string `"wait — then"` → clean (not a comment)

- [ ] **Step 2: `no-jsdoc-in-function-body`**

Bad:

```ts
function load(id: string) {
  /** bail on empty ids */
  if (id === "") {
    return;
  }
}
```

Good: the same text as `// bail on empty ids`. Nested function with its
own leading JSDoc is **not** a hit (that JSDoc is attached to the inner
declaration, not a free block in the outer body).

- [ ] **Step 3: `prefer-single-line-jsdoc`**

Bad: a 3-line JSDoc whose inner text is `Formats a row.` and fits on one
line. Good: already one line; or a JSDoc with `@param`.

- [ ] **Step 4: Enable in `.oxlintrc.json` and `--fix` the repo**

```jsonc
"avandar/no-em-dash-in-comments": "error",
"avandar/no-jsdoc-in-function-body": "error",
"avandar/prefer-single-line-jsdoc": "error"
```

```bash
pnpm exec oxlint --fix .
pnpm exec vitest run eslint-plugin-avandar
pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add eslint-plugin-avandar .oxlintrc.json
git add -u
git commit -m "$(cat <<'EOF'
feat: add avandar comment lint rules with fixers

EOF
)"
```

### Task 12: Type 2 structure rules (with fixers)

Implement the **Task 9 type-2 structure rules**, not this snapshot if they
disagree.

**Files:**

- Create: `eslint-plugin-avandar/rules/prefer-function-declaration.js`
- Create: `eslint-plugin-avandar/rules/prefer-nested-arrow-functions.js`
- Create: `eslint-plugin-avandar/rules/underscore-private-helpers.js`
- Create: `eslint-plugin-avandar/rules/helpers-before-exports.js`
- Create: `eslint-plugin-avandar/rules/jsdoc-on-exported-key.js`
- Create: matching tests
- Modify: `eslint-plugin-avandar/index.js` and `.oxlintrc.json`

**Interfaces:**

- `prefer-function-declaration`: top-level `const name = () =>` or
  `const name = function` → `function name()`. Skip `export default`.
  If native `react/function-component-definition` already covers
  components, still flag non-component top-level arrows.
- `prefer-nested-arrow-functions`: `FunctionDeclaration` whose parent is
  not `Program` / `ExportNamedDeclaration` → convert to `const name =
() =>`. Object methods that are `ObjectMethod` kind `method` stay
  methods; function properties assigned as `function ()` become arrows.
- `underscore-private-helpers`: non-exported top-level function or const
  function whose name does not start with `_` → rename declaration and
  same-file identifiers. Skip names that are React components (`^[A-Z]`).
- `helpers-before-exports`: a non-exported helper used by a later-declared
  export, but declared after that export → move the helper (and its JSDoc)
  above the first export that references it. One move per report is enough.
- `jsdoc-on-exported-key`: `_foo` has JSDoc, `export const Mod = { foo:
_foo }` has none on the key → move the JSDoc onto `foo`.

If native oxlint already flags a case, do not duplicate; skip that rule
and note it in the commit body.

- [ ] **Step 1: RED tests for each rule (one happy, one sad, one skip)**

- [ ] **Step 2: Implement + `--fix` until tests pass**

- [ ] **Step 3: Enable as error, `oxlint --fix .`, `pnpm lint`**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add avandar structure lint rules with fixers

EOF
)"
```

### Task 13: Type 2 naming, React, utils, modules, types + native leftovers

Implement the **Task 9 type-2 list** for these buckets, not this snapshot
if they disagree. Native leftovers from Task 7 still belong here unless
Task 9 found them already on.

**Files:**

- Create: `eslint-plugin-avandar/rules/prefer-on-event-handler.js`
- Create: `eslint-plugin-avandar/rules/consistent-e2e-casing.js`
- Create: `eslint-plugin-avandar/rules/consistent-acronym-casing.js`
- Create: `eslint-plugin-avandar/rules/prefer-props-type-name.js`
- Create: `eslint-plugin-avandar/rules/no-jsx-and-conditional.js`
- Create: `eslint-plugin-avandar/rules/prefer-prop-helpers.js`
- Create: `eslint-plugin-avandar/rules/no-model-types-deep-import.js`
- Create: `eslint-plugin-avandar/rules/no-stateless-create-module.js`
- Create: `eslint-plugin-avandar/rules/prefer-type-over-interface.js`
- Create: matching tests
- Modify: `eslint-plugin-avandar/index.js`, `.oxlintrc.json`
- Possibly: enable the five native rules deferred in Task 7

**Interfaces (fixer required unless noted):**

- `prefer-on-event-handler`: identifier `/^handle[A-Z]/` used as a
  function → rename to `on` + rest (`handleClick` → `onClick`). Same-file
  only. Skip if the name is already a DOM `handle` from a third-party type
  we cannot see; false positives get a disable.
- `consistent-e2e-casing`: identifier contains `E2e` or `e2E` → `E2E` in
  Pascal/camel segments (`runE2e` → `runE2E`, `E2eTest` → `E2ETest`).
- `consistent-acronym-casing`: in identifiers, replace whole-run `URL`→
  `Url`, `SQL`→`Sql`, `JSON`→`Json`, `HTTP`→`Http`, `API`→`Api`,
  `CSS`→`Css`, `HTML`→`Html`, `UUID`→`Uuid`, `XML`→`Xml`, `YAML`→`Yaml`.
  Allow `Id` and `Db` as-is. Do not touch string literals or comments.
- `prefer-props-type-name`: `type FooProps` / `interface FooProps` →
  `Props` when it is the component props type in that file. Same-file
  rename only.
- `no-jsx-and-conditional`: JSX `{cond && <El />}` / `{cond && el}` where
  the right side is JSX → `{cond ? <El /> : null}`.
- `prefer-prop-helpers`: `.map((x) => x.foo)` / `.map((x) => { return
x.foo; })` → `.map(prop("foo"))`; `.find((x) => x.id === y)` →
  `.find(propEq("id", y))` (same for `filter`/`some`/`every`/`flatMap`).
  Dotted one-level only (`x.a.b` → `prop("a.b")`). Insert
  `import { prop, propEq } from "@avandar/utils"` if missing. Skip files
  under `packages/shared/utils` itself.
- `no-model-types-deep-import`: import source matches
  `/\/[A-Z][A-Za-z0-9]+\/[A-Z][A-Za-z0-9]+\.types(['"]|$)/` from a file
  whose path is **not** inside that model folder → rewrite to the
  `ModelName.ts` namespace entry (drop `.types`). Skip `*.types.ts` files
  that live next to the model.
- `no-stateless-create-module`: `createModule("Name", { builder() { return
{ ... } } })` where the returned object and builder close over no
  mutable state (no `let`, no `this`, no mixin args) → rewrite to
  `export const Name = { ... }`. If the heuristic is unsure, do not flag.
- `prefer-type-over-interface`: `interface Foo` except when it has
  `implements` on a class in this file → `type Foo =`. Keep `extends`
  by converting to intersection.

Then enable any Task 7 deferred natives (`curly`, `prefer-template`,
`typescript/consistent-type-imports`, `import/no-default-export`,
`typescript/no-explicit-any`) and `oxlint --fix .` for the fixable ones.
`no-default-export` and `no-explicit-any` are not always auto-fixable;
fix mechanically where obvious, `oxlint-disable-next-line` with a reason
only for true exceptions (re-export files, third-party `any`).

- [ ] **Step 1: RED tests per rule**

- [ ] **Step 2: Implement fixers**

- [ ] **Step 3: Enable, `--fix` repo, `pnpm lint` green**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add remaining avandar type-2 lint rules with fixers

EOF
)"
```

### Task 14: Delete type 2 from the review skill

Delete whatever **Task 9** classified as type 2 (and whatever Phase 3
actually shipped). The gate block below is the 2026-08-16 snapshot.

**Files:**

- Modify: `agent-skills/public-skills/skills/avandar-code-review/SKILL.md`
- Modify: `docs/code-reviews/*.md` under that skill (comments, typescript,
  react, module, libraries)
- Modify: `docs/rules/typescript.md` (one-line "enforced by oxlint" on
  bullets that are now type 2)

**Interfaces:**

- Consumes: the type-2 inventory from Task 9, as encoded in Tasks 11–13,
  plus native rules now on.
- Produces: skill no longer asks agents to find or report type 2 issues.
  Type 3 text stays (JSDoc _quality_, directory-module _how_,
  `matchLiteral`, etc.).

Add this block near the top of `SKILL.md` (after "Public Core And
Repo-Local Rules"):

```markdown
## Lint Plugin Gate

If the repo under review has oxlint configured with `eslint-plugin-avandar`
(rules prefixed `avandar/`) plus the native oxlint rules listed below, do
**not** search for, report, or restated those conventions. They are
already errors (and type-2 issues are `--fix`ed by `pnpm format`).

Native: `curly`, `prefer-template`,
`typescript/consistent-type-imports`, `import/no-default-export`,
`typescript/no-explicit-any`, `eslint-js/max-len` (comments included).

Plugin type 2 (auto-fixed): `avandar/no-em-dash-in-comments`,
`avandar/no-jsdoc-in-function-body`, `avandar/prefer-single-line-jsdoc`,
`avandar/prefer-function-declaration`,
`avandar/prefer-nested-arrow-functions`,
`avandar/underscore-private-helpers`, `avandar/helpers-before-exports`,
`avandar/jsdoc-on-exported-key`, `avandar/prefer-on-event-handler`,
`avandar/consistent-e2e-casing`, `avandar/consistent-acronym-casing`,
`avandar/prefer-props-type-name`, `avandar/no-jsx-and-conditional`,
`avandar/prefer-prop-helpers`, `avandar/no-model-types-deep-import`,
`avandar/no-stateless-create-module`,
`avandar/prefer-type-over-interface`.

If a disable comment for one of these is in the diff, still read it. A
type-2 disable is almost always wrong; report it unless the reason names
a genuine parser/false-positive.
```

Then delete from checklists (including **Find candidates** greps):

- Em dash in comments (`SKILL.md` General Checks + comments-checklist)
- JSDoc inside function bodies (keep the type-3 "purpose vs
  implementation" section)
- Single-line JSDoc / comment `max-len` 80 find-grep
- `export default` find-grep (`typescript-checklist.md`)
- Top-level arrow vs `function` find-grep
- Nested `function` / `_` helpers / helper order greps
- `handleX` event names
- `E2e` / acronym identifier casing
- `FooProps` vs `Props`
- JSX `cond && <El/>`
- `prop` / `propEq` lambda find-grep in `avandar-utils-checklist.md`
  (keep `matchLiteral`; that is type 3)
- `.types.ts` deep imports in `avandar-models-checklist.md` (keep
  `Model.make` judgement)
- Stateless `createModule` in `avandar-modules-checklist.md` (keep the
  stateful vs mixin explanation as type 3 for _whether_ remaining
  `createModule` calls are justified; the plugin already rewrote the
  obvious stateless ones)
- `interface` vs `type` (keep `implements` exception as a one-liner
  pointing at the plugin)
- `import type` / `any`

Do not delete: JSDoc quality, file-level comment _quality_ (type 1 in
Phase 4), naming judgement beyond closed denylists, functional-style
judgement, tests quality, SQL, CSS, e2e judgement.

- [ ] **Step 1: Add the Lint Plugin Gate**

- [ ] **Step 2: Delete the bullets and greps listed above**

- [ ] **Step 3: Add "enforced by oxlint" one-liners in `docs/rules/` for
      the same bullets**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: drop type-2 review rules now enforced by oxlint

EOF
)"
```

---

## Phase 4 — Plugin type 1 (gates) and skill update

Do **not** encode type-1 rules until Task 15 is done. The type-1 lists in
Tasks 16–19 are a 2026-08-16 snapshot and may disagree with both the live
skill and whatever Phase 3 actually shipped.

All type-1 rules are **error**. No fixer, or only an unsafe one we do not
ship. Agents must split/rename/document or write a reason on
`oxlint-disable-next-line avandar/<rule> -- <reason>`.

### Task 15: Recategorize the live review skill (type 1 sweep)

**Files:**

- Read the same skill / checklist / `docs/rules/` / extra-checklist set
  as Task 9 (live copies, not the Task 9 commit if the skill moved again)
- Read: `eslint-plugin-avandar/index.js` and `.oxlintrc.json` as shipped
  by Phase 3 (rules already encoded must not be re-encoded)
- Modify: this plan, Tasks 16–19, **after** sign-off

**Interfaces:**

- Consumes: live skill + the plugin as it exists after Phase 3.
- Produces: a current type-1 list for Tasks 16–18 and a current skill
  rewrite list for Task 19.

Use the same three categories as Task 9. Extra checks for this sweep:

- Anything Phase 3 already implemented (type 2 or native) is done. Do
  not duplicate it. If the skill still describes it, Task 19 should
  delete that leftover, not Task 16.
- A snapshot type-1 that is now type 2 (someone tightened it to a
  mechanical fix) moves into a new fixer task; do not ship it as a
  gate-only rule.
- A snapshot type-1 that is now type 3 (exceptions ate the denylist)
  stays in the skill; drop it from Tasks 16–18.
- New closed denylists in the skill become new type-1 rules. Add tasks
  or extend Task 18 rather than skipping them because this plan did not
  name them in August.
- File-length 400/500 and `require-disable-reason` stay in unless the
  live skill dropped those policies.
- Still do not encode: conversion `resolve`/`compute`/`build`/`create`
  unless the live skill now has a closed exception list; open
  abbreviations; `for`/`class` with judgement exceptions; type-aware
  gates; SQL; CSS; copy placement; directory-module _moves_.

- [ ] **Step 1: Re-read the live skill and every checklist**, including
      new files added since Task 9. Follow `extra-checklist.md` references.

- [ ] **Step 2: Classify remaining non-type-2 rules** into type 1 vs
      type 3. Cross-check `eslint-plugin-avandar` `rules` keys so the
      inventory does not include already-shipped type 2s.

- [ ] **Step 3: Diff against Tasks 16–19 and against the Task 9 type-1
      holding list.** Report to the user, before any type-1 plugin code:
  - Added / removed / reclassified
  - Already covered by Phase 3 or native oxlint
  - Still deferred (fuzzy / type-aware / filesystem / SQL / CSS)

- [ ] **Step 4: Stop.** Empty delta: say so and wait for continue.
      Non-empty: patch Tasks 16–19 (rule files, denylists, skill-gate ids),
      then wait for approval. Do not start Task 16 until they approve.

- [ ] **Step 5: Commit only if the plan file changed**

```bash
git add docs/superpowers/plans/2026-08-16-oxlint-oxfmt-avandar-plugin.md
git commit -m "$(cat <<'EOF'
docs: refresh type-1 plugin inventory from live review skill

EOF
)"
```

### Task 16: Disable-reason rule + closed identifier denylist

Implement the **Task 15 type-1 list** for this bucket, not this snapshot
if they disagree. `require-disable-reason` stays unless Task 15 dropped
the disable-audit policy.

**Files:**

- Create: `eslint-plugin-avandar/rules/require-disable-reason.js`
- Create: `eslint-plugin-avandar/rules/no-vague-identifiers.js`
- Create: tests
- Modify: `index.js`, `.oxlintrc.json`

**Interfaces:**

- `require-disable-reason`: any `oxlint-disable`,
  `oxlint-disable-next-line`, or `oxlint-disable-line` that mentions an
  `avandar/` rule (or has no rule list) must include `--` and a non-empty
  reason. No fixer.
- `no-vague-identifiers`: report bindings named exactly `next`, `prev`,
  `val`, `n`, `matrix`. Allow `idx`. Do **not** include `count` (too
  many legitimate hits). Skip import specifiers that rename (`import {
next as nextPage }` is fine; `import { next }` is not). No fixer.

- [ ] **Step 1: RED tests**

`const next = 1` fails. `const nextPage = 1` passes. `idx` passes.
`// oxlint-disable-next-line avandar/no-vague-identifiers` without `--`
fails `require-disable-reason`. With `-- pagination cursor is the API
name` passes both.

- [ ] **Step 2: Implement, enable as error**

Existing hits: rename in-file if the better name is obvious from the
next token (`next` of a page → `nextPage`); otherwise add a justified
disable. Do not mass-rename blindly.

- [ ] **Step 3: `pnpm lint` green**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: gate vague identifiers and require oxlint-disable reasons

EOF
)"
```

### Task 17: File length 400 / 500

**Files:**

- Create: `eslint-plugin-avandar/rules/max-file-lines.js`
- Create: tests
- Modify: `index.js`, `.oxlintrc.json`

**Interfaces:**

- Count physical lines in the file (same as `wc -l`).
- 401–500: report `avandar/max-file-lines` (error). Disable allowed if
  `require-disable-reason` is satisfied. Message must say: split into a
  **directory module** of the same name, not a sibling `FooHelpers.ts`.
- 501+: report `avandar/max-file-lines-hard` (separate rule, error).
  `.oxlintrc.json` must not be disableable via inline comments for this
  rule if oxlint supports that; if it does not, the skill (Task 19)
  still treats a disable of `max-file-lines-hard` as a finding.
- Ignore globs (config `overrides` / `ignorePatterns`): `**/*.gen.*`,
  `**/migrations/**`, `shared/types/database.types.ts`,
  `src/i18n/locales/**/messages.ts`, plus the global oxlint ignores.

Options:

```js
meta: {
  schema: [
    {
      type: "object",
      properties: { max: { type: "number" }, hardMax: { type: "number" } },
    },
  ];
}
```

Implement as two rule exports sharing one function
`createMaxFileLines(max)` so 400 and 500 stay independent severities.

- [ ] **Step 1: RED tests** with fixtures of 401 and 501 comment-padded
      lines

- [ ] **Step 2: Implement and enable**

```jsonc
"avandar/max-file-lines": "error",
"avandar/max-file-lines-hard": "error"
```

Do **not** split existing 400+ files in this task unless `pnpm lint`
fails. Prefer justified disables on 401–500 files that are already
known monoliths, and leave >500 as real errors that this task must
either split (directory module) or, if the file is generated, add to
ignore globs. If the repo has many >500 source files, split is out of
scope: add a short punch-list in the commit body and keep the rule on
so new files cannot grow; existing ones get a temporary
file-level disable **only** for 401–500. For >500 existing files, use
`.oxlintrc.json` `overrides` `files` + `rules: { "avandar/max-file-lines-hard": "off" }`
as a denylist you must shrink later — do not silently turn the rule off
globally.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: error on source files over 400 and 500 lines

EOF
)"
```

### Task 18: Remaining closed type-1 AST gates

Encode every closed type-1 AST gate from **Task 15**. The files below are
the 2026-08-16 snapshot; add/remove rule files to match the sweep.

**Files:**

- Create: `eslint-plugin-avandar/rules/require-jsdoc-on-exports.js`
- Create: `eslint-plugin-avandar/rules/no-file-level-comment.js`
- Create: `eslint-plugin-avandar/rules/no-historical-comments.js`
- Create: `eslint-plugin-avandar/rules/no-double-assertion.js`
- Create: `eslint-plugin-avandar/rules/prefer-string-union-over-enum.js`
- Create: `eslint-plugin-avandar/rules/no-export-all.js`
- Create: `eslint-plugin-avandar/rules/no-tautological-tests.js`
- Create: `eslint-plugin-avandar/rules/no-bare-i18n-copy.js`
- Create: matching tests
- Modify: `index.js`, `.oxlintrc.json`

**Interfaces (no fixers):**

- `require-jsdoc-on-exports`: `export function`, `export const` of
  function/object, exported `class` without a leading `/**`. Skip
  `export type` / `export interface`, skip `*.test.ts` / `*.spec.ts` /
  `*.fixture.ts`. The _text_ of the JSDoc is type 3; this only gates
  presence.
- `no-file-level-comment`: detached block comment (closing `*/` followed
  by a blank line) in a file that has a main export (an export whose
  name matches the file basename). Skip `*.test.*`, `*.types.ts`,
  `*.constants.ts`.
- `no-historical-comments`: comment text matches `/\bused to\b/i`,
  `/\bpreviously\b/i`, or `/\bPhase\s+\d+\b/`. No fixer.
- `no-double-assertion`: `as unknown as` / `as any as`. No fixer.
- `prefer-string-union-over-enum`: `TSEnumDeclaration`. Skip `const enum`.
  Disable with reason when a real numeric/bitflag enum is required.
- `no-export-all`: `ExportAllDeclaration` (`export * from`).
- `no-tautological-tests`: in `*.test.ts` / `*.spec.ts`,
  `typeof x === "function"` and `expect(true).toBe(true)` /
  `expect(false).toBe(false)`.
- `no-bare-i18n-copy`: JSX/call props `label`, `placeholder`, `title`,
  `aria-label` (and `ariaLabel`) whose value is a string literal (not
  `<Trans>`, not `t\`...\``, not a variable). Also `notifyError("...")`/`notifySuccess("...")`with a literal first arg. Skip`_.test._`.

Do **not** add in this task: conversion-prefix naming, `class` / `for`,
`Readonly` placement, Props destructure, `?? []`, `useMemo` triviality,
`as unknown as` exceptions that need types (the double assertion gate
is still worth it; disables handle the rest), Lingui "is this
user-facing" beyond the attr allowlist, `ALWAYS_REFETCH_ON_MOUNT`
(repo-local extra-checklist; add only if you have a closed hook-name
list in `docs/code-reviews/extra-checklist.md` — if yes, a separate
tiny rule `require-always-refetch-on-mount` with that list is in scope).

- [ ] **Step 1: RED then GREEN per rule**

- [ ] **Step 2: Enable as error. For existing hits: add JSDoc only when
      you can write a real purpose/output sentence; otherwise leave the
      diagnostic and fix in this task until `pnpm lint` is green. Prefer
      real JSDoc over disables for `require-jsdoc-on-exports`.**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add avandar type-1 lint gates

EOF
)"
```

### Task 19: Update the skill for type 1 (keep how-to-fix, drop find)

Use the **Task 15 type-1 ids** in the Lint Plugin Gate, not only the
snapshot list below.

**Files:**

- Modify: `SKILL.md` Lint Plugin Gate (add type-1 rule ids)
- Modify: comments-checklist, typescript-checklist, module-checklist,
  tests-checklist, react-checklist, extra-checklist as needed
- Modify: `docs/rules/typescript.md` (enforced-by-oxlint notes)

**Interfaces:**

- Produces: review agents do not run the file-length `wc -l` grep, do
  not hunt `next`/`prev`/`val`/`n`, do not hunt missing JSDoc with a
  grep. They still:
  1. Rewrite JSDoc that is present but narrates implementation.
  2. Split files lint flagged, using the directory-module recipe (keep
     that recipe in `SKILL.md` General Checks).
  3. Audit `oxlint-disable` comments for `avandar/*` (especially
     `max-file-lines` and `max-file-lines-hard`).
  4. Apply every remaining type-3 rule.

Extend the Lint Plugin Gate with:

```markdown
Plugin type 1 (error, no fixer). If oxlint is clean, do not re-find these.
Only report: (a) a disable without a real reason, (b) `max-file-lines-hard`
disabled on a non-generated file, (c) JSDoc that exists but fails the
quality rule.

`avandar/require-disable-reason`, `avandar/no-vague-identifiers`,
`avandar/max-file-lines`, `avandar/max-file-lines-hard`,
`avandar/require-jsdoc-on-exports`, `avandar/no-file-level-comment`,
`avandar/no-historical-comments`, `avandar/no-double-assertion`,
`avandar/prefer-string-union-over-enum`, `avandar/no-export-all`,
`avandar/no-tautological-tests`, `avandar/no-bare-i18n-copy`.
```

Delete the **Find candidates** bash block for file length in `SKILL.md`
(the `git diff | wc -l` loop). Keep the 400/500 _policy text_ and the
directory-module "this is bad / this is good" tree, plus the migration
exception (now also an oxlint ignore).

Delete vague-name find guidance that duplicates `next`/`prev`/`val`/`n`.
Keep "avoid abbreviations" and conversion `to`/`from` naming (type 3 /
deferred).

- [ ] **Step 1: Patch the gate and delete greps**

- [ ] **Step 2: Confirm type-3 checklists still load (functional-style,
      tests quality, SQL, CSS, copy, AvaPage, e2e)**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: point avandar-code-review at oxlint for type-1 gates

EOF
)"
```

### Task 20: Final verification

**Files:** none new

- [ ] **Step 1: Plugin tests**

```bash
pnpm exec vitest run eslint-plugin-avandar
```

Expected: pass.

- [ ] **Step 2: Lint + format**

```bash
pnpm lint
pnpm exec oxfmt --check
pnpm exec prettier --check supabase/schemas
```

Expected: all exit 0.

- [ ] **Step 3: Confirm ESLint is gone**

```bash
rg -n '"eslint"|eslint\\.config|from "eslint"' package.json apps/pipeline-server/package.json apps/dev-fanout-server/package.json vite.config.ts
```

Expected: no CLI/config hits. `eslint-plugin-import-x` and
`eslint-plugin-avandar` mentions are allowed.

- [ ] **Step 4: No extra commit unless something failed and you fixed it**

---

## Out of scope (do not encode)

- Conversion function prefixes (`resolve` / exported `compute`/`build`/
  `create`) and `toX` without `From`
- Open-ended abbreviation / auxiliary-verb naming
- `class` / `for`/`while` with judgement exceptions
- Props destructure, `Readonly` placement, `?? []`, trivial `useMemo`,
  named `useEffect` (needs types or naming judgement)
- Directory-module _moves_, file-name = export, barrels, copy-function
  placement (filesystem / cross-file)
- SQL naming, CSS modules, Stylelint
- `matchLiteral` vs `switch` (type 3)
- CACHE_SCHEMA_VERSION, AvaPage freeze, e2e flake diagnosis
- Comment quality beyond presence / historical phrasing / em dash / shape
- Turning unused-vars on

## Skill vs plugin ownership after this plan

| Layer                                                              | Owns                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| oxfmt                                                              | JS/TS/JSON/CSS/MD layout, import sort, Tailwind class sort |
| Prettier                                                           | `supabase/schemas/**/*.sql` only                           |
| oxlint native + jsPlugins (TanStack, import-x unresolved, max-len) | today's ESLint policy                                      |
| `avandar/*` type 2                                                 | mechanical rewrites; skill deleted                         |
| `avandar/*` type 1                                                 | CI/dev gate; skill keeps how-to-fix + disable audit        |
| avandar-code-review                                                | type 3 judgement only, plus disable audit                  |
