# Plugins Slice 1d: Data Slots, Content, and a Minimal Install Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A plugin declares typed data slots that an admin binds to a case type
or a dataset in a new install wizard, commands read a bound slot through
`avandar.data.querySlot`, and a no-code plugin imports bundled datasets. Done
when the Mozambique pack installs and the epidemiology plugin binds a `Case`
slot.

**Architecture:** The manifest gains `dataSlots`, `contributes.content`, and the
`data:slots` permission. Bindings and content imports are two new tables, and
an install RPC writes an install and its bindings in one transaction. Data slot
logic shared by Settings and the command runtime lives in
`src/lib/pluginDataSlots/` and runs slot queries in the browser's DuckDB
through `WorkspaceQuerySession`. The wizard and the card sections live under
`src/views/WorkspaceSettingsPage/WorkspacePluginsTab/`. Command-only runtime
code lives in `src/lib/plugins/dataSlots/` and loads with the lazy command
runner.

**Tech Stack:** TypeScript, React 19, Mantine 9, Lingui, Zod 4, TanStack Query,
Supabase (Postgres, RLS, pgTAP), DuckDB-WASM and `@duckdb/node-api`, Vite,
Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-plugins-1d-data-slots-design.md`.
**Builds on:** the slice 1a, 1b, and 1c specs and
the retired plugins 1c handoff.

---

## How this plan was made

Every task except 1 and 26 was written, then applied in a scratch worktree, run,
and corrected until its text produced code that passed its tests, `tsc`,
eslint, and oxfmt. All of Tasks 2 to 25 applied together pass
`tsc -b --force` and 2,053 unit tests across 245 files.

Three kinds of steps have never run, because drafting forbade them:

| Steps | Why not run | What to expect |
| --- | --- | --- |
| Task 10's migration and type generation, Task 11's pgTAP suites | No database commands while drafting | First run happens here. Read every failure before changing SQL |
| Tasks 21 to 23's E2E specs | No E2E while drafting | First run happens here. A failure is more likely a product bug than a selector bug |
| Task 26's live eval | Needs the full slice | Compare with the 1c baseline: 42/45 and `R01` passing |

Expected test counts in each task were measured with that task and every task
before it applied. If `demo/measles` moves before a task runs, a count may
drift. A drifted count is fine. A new failure is not.

## Before you start (rules for every task)

- **Branch.** Work in `~/src/worktrees/avandar/feat/plugins-slots` on
  `feat/plugins-slots`. It merges into `demo/measles`, never `develop`. Commit
  each task. Never push, merge, or open a PR: Pablo asks for those explicitly,
  each time, and a push to `demo/**` deploys.
- **Database.** Task 1 switches this worktree to its own Supabase project,
  `feat-plugins-slots`. Before any `pnpm db:*`, `pnpm test:db`, `supabase *`, or
  E2E command, run `node apps/ava-cli/dist/main.cjs supabase status` and
  confirm its first line names `feat-plugins-slots`. If it says
  `This is the develop local Supabase`, stop. Never stage
  `supabase/config.toml` or `.env.development`.
- **ava CLI.** Use `node apps/ava-cli/dist/main.cjs` after
  `pnpm --filter @avandar/ava-cli build`. Never relink the global `ava`.
- **Dependencies.** Never run `pnpm add`. After pulling `demo/measles`, run
  `pnpm install --frozen-lockfile`. Task 9 adds one lockfile importer by hand.
- **Tests.** Run narrowly: `pnpm vitest run <paths>`. Executed DuckDB tests:
  `pnpm test:executed <paths>`. Desktop tests:
  `pnpm --dir apps/desktop exec vitest run -c vitest.config.ts <path>`. E2E: one
  spec at a time with `pnpm test:e2e <file>`, never the whole suite.
- **Format and lint.** `pnpm exec oxfmt --ignore-path .oxfmtignore <files>`
  (without `--ignore-path` it formats nothing; Markdown is ignored on purpose),
  `pnpm exec prettier --write <files>` for SQL, `pnpm exec eslint <files>`.
- **Where code lives.** `pnpm check:plugin-bundle` counts every module under
  `src/lib/plugins/`, `packages/shared/plugin-manifest/`, and
  `packages/web/plugin-sdk/` that any non-lazy chunk reaches. Settings UI goes
  under `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/`, shared data slot
  logic under `src/lib/pluginDataSlots/`, and command-only runtime code under
  `src/lib/plugins/dataSlots/`, reached only from `runPluginCommand.ts`.
- **Repo rules.** `CLAUDE.md` and `docs/rules/*.md`: functions at most 45 lines,
  one module per folder named after it, at most one `*.test.ts(x)` per folder
  outside `__tests__/`, JSDoc on exports, no em dashes, Lingui for every
  user-visible host string, model namespaces instead of `*.types.ts` imports,
  `make[Target]From[Source]` and `get[Target]From[Source]` for exported helpers.
- **Background processes.** Kill everything you start. Leave nothing running.

## Task order

The order matters in two places. Task 18 creates the binding modal that Task 19
imports. Task 24's byte counts assume Tasks 18 and 19 are in.

| # | Task | Depends on | Suggested implementer |
| --- | --- | --- | --- |
| 1 | Sync, switch the local database, baseline | none | Orchestrator |
| 2 | Manifest data slots and `data:slots` | 1 | Sonnet |
| 3 | Manifest content, optional `entry`, plugin readers | 2 | Default |
| 4 | Reserved AI tool names | 3 | Sonnet |
| 5 | Content URLs in the Vite plugin index | 3 | Sonnet |
| 6 | SDK types, error codes, `Bar`, `Switch` | none | Sonnet |
| 7 | Unreadable plugin chart settings | none | Sonnet |
| 8 | Mozambique boundary script and CSVs | 3 | Default |
| 9 | Mozambique pack | 3, 5, 8 | Sonnet |
| 10 | Database schema, RPCs, migration, types | 1 | Default |
| 11 | pgTAP tests | 10 | Default |
| 12 | Models and clients | 10 | Sonnet |
| 13 | Data slot sources and binding status | 2, 12 | Sonnet |
| 14 | Data slot SQL, query runner, binding check | 13 | Default |
| 15 | Wizard shell, Review, Confirm, Install action | 2, 3, 12 | Default |
| 16 | Data slot panel, check preview, Data slots step | 13, 14, 15 | Default |
| 17 | Content step and `importPluginContentItem` | 5, 12, 15, 16 | Default |
| 18 | Card sections and the binding modal | 13, 16, 17 | Default |
| 19 | Command runtime (`querySlot`, `openDataSlotBinding`, `fetchRows`) | 6, 12, 13, 14, 18 | Default |
| 20 | Epidemiology `cases` slot and Case epicurve | 2, 6 | Default |
| 21 | E2E helpers and the existing epidemiology specs | 15, 16, 20 | Default |
| 22 | E2E: Mozambique install | 9, 17, 18, 21 | Default |
| 23 | E2E: epidemiology Case slot | 16, 18, 19, 20, 21 | Default |
| 24 | Restore `pnpm check:plugin-bundle` | 2 to 20 | Default |
| 25 | Docs in `docs/plugin-authoring.md` | 2 to 20 | Sonnet |
| 26 | Whole-branch review, full verification, live eval, handoff | all | Orchestrator |

## File map

| Area | Files |
| --- | --- |
| Manifest | `packages/shared/plugin-manifest/src/PluginManifest/` (`PluginDataSlotSchema.ts`, `PluginContentSchema.ts`, `makeComparableAiToolName.ts`, `PluginManifestSchema.ts`), `compileManifest/`, `node/readPluginDirectory.ts`, `index.ts`, `runtime.ts` |
| Build | `scripts/vite-plugin-ava-plugins/` (`makePluginModuleSources/`, `makeOptimizeDepsEntriesFromPlugins/`, `checkPluginBundle/`, `pluginModuleIds.ts`, `vitePluginAvaPlugins.ts`), `apps/ava-cli/src/PluginCli/ValidatePluginCli/` |
| SDK and UI kit | `packages/web/plugin-sdk/src/` (`PluginApi.types.ts`, `PluginError/`), `packages/web/plugin-ui/src/` (`charts.ts`, `index.ts`) |
| Database | `supabase/schemas/` (the enum, `11.plugin_data_slot_bindings.sql`, `11.plugin_content_imports.sql`, two `50.rpc_*.sql`), `supabase/migrations/` and `apps/desktop/migrations/` (generated), `supabase/tests/database/`, `apps/desktop/sync/syncable-tables.ts`, `shared/types/database.types.ts` (generated) |
| Models and clients | `shared/models/PluginDataSlotBinding/`, `shared/models/PluginContentImport/`, `src/clients/plugins/` |
| Shared data slot logic | `src/lib/pluginDataSlots/` |
| Command runtime | `src/lib/plugins/dataSlots/`, `src/lib/plugins/invokePluginAiToolHandler/`, `makePluginApi/`, `fetchRowsForInvocation/`, `runPluginCommand/`, `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/` |
| Settings UI | `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/` (`PluginInstallWizard/`, `DataSlotBinding/`, `pluginContent/`, `PluginSettingsCard/`) |
| Chart settings | `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/` |
| Plugins | `plugins/epidemiology/` (`ava.yaml`, `locales/en.json`, `src/caseEpicurve/`, `src/index.tsx`), `plugins/mozambique/`, `plugins/bundled.yaml`, `pnpm-lock.yaml`, `shared/agent/dataAgent/pluginAiTools.gen.ts` (regenerated) |
| Data script | `scripts/plugins/buildMozambiqueBoundaries.ts`, `scripts/plugins/mozambiqueBoundaryHelpers/` |
| E2E | `tests/e2e/helpers/pluginFlow.ts`, `tests/e2e/helpers/CaseTypeSeedHelpers.ts`, `tests/e2e/helpers/constants.ts`, `tests/data/case-line-list/`, `tests/e2e/plugins-*.spec.ts` |
| Docs | `docs/plugin-authoring.md`, the 1d handoff |

---

### Task 1: Sync, switch the local database, and record a baseline

**Goal:** Start from an up-to-date branch on its own local Supabase stack, so the
schema work in Task 10 cannot touch the shared `avandar` stack that other
worktrees use.

**Files:** none (no tracked file changes). `ava supabase switch` edits the
gitignored `.env.development` block and `supabase/config.toml` locally. Never
stage either file.

**Depends on:** none. The orchestrator runs this task itself, not a subagent.

- [ ] **Step 1: Bring the branch up to date with `demo/measles`**

Run:

```bash
cd ~/src/worktrees/avandar/feat/plugins-slots
git fetch origin
git rev-list --left-right --count origin/demo/measles...HEAD
```

Expected: `0 <n>` (measles has nothing this branch lacks). If the left number
is not 0, merge it, then reinstall without re-resolving:

```bash
git merge --no-ff origin/demo/measles -m "chore(plugins): sync with demo/measles"
pnpm install --frozen-lockfile
```

If the merge conflicts only in compiled `src/i18n/locales/*/messages.ts`, take
the upstream copy, run `pnpm i18n:extract && pnpm i18n:compile`, and check with
`git diff --no-ext-diff -- 'src/i18n/locales/*.po'` that no active `msgid` was
removed.

- [ ] **Step 2: Build this worktree's ava CLI**

Run: `pnpm --filter @avandar/ava-cli build`
Expected: exits 0 and `apps/ava-cli/dist/main.cjs` exists. Do not relink the
global `ava` binary.

- [ ] **Step 3: Confirm the worktree is on the shared stack, then switch**

Run: `node apps/ava-cli/dist/main.cjs supabase status`
Expected first line: `This is the develop local Supabase (avandar). Branch feat/plugins-slots uses it.`

Run: `node apps/ava-cli/dist/main.cjs supabase switch`
Expected: a new project `feat-plugins-slots` starts and is seeded. The Vite
port moves (`AVA_VITE_DEV_PORT` in `.env.development`).

Run: `node apps/ava-cli/dist/main.cjs supabase status`
Expected first line names the switched project `feat-plugins-slots`, and every
env file reads as matching.

- [ ] **Step 4: Fix the edge runtime's stale JWT issuer**

`ava supabase switch` rewrites `.env.development.edge` but not the gitignored
`supabase/functions/.env`, so edge routes would return 401 with
`unexpected "iss" claim value`.

Run:

```bash
cp .env.development.edge supabase/functions/.env
docker inspect supabase_edge_runtime_feat-plugins-slots | grep SB_JWT_ISSUER
```

Expected: the issuer names the switched project's API port, not 54321. If it
still shows 54321, run `supabase stop` (this stops only the switched project),
then `node apps/ava-cli/dist/main.cjs supabase switch feat-plugins-slots`, and
check again. Never run plain `supabase start` here.

- [ ] **Step 5: Record the baseline**

Run:

```bash
pnpm vitest run packages/shared/plugin-manifest src/lib/plugins src/views/WorkspaceSettingsPage/WorkspacePluginsTab plugins/epidemiology src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm shared/agent/dataAgent
pnpm exec tsc -b --force
```

Expected: every test passes and `tsc` reports nothing. Write the test and file
counts into the task notes, so a later failure can be told apart from a
pre-existing one. If anything fails here, stop and report it: it is not caused
by this slice.

**Notes for the implementer:**

- From here on, before any `pnpm db:*`, `pnpm test:db`, `supabase *`, or E2E
  run, re-run `node apps/ava-cli/dist/main.cjs supabase status` and confirm its
  first line names `feat-plugins-slots`. If it says `This is the develop local
  Supabase`, stop: running those commands would reset the stack every other
  worktree uses.
- Leave the switch in place when the slice is done.

---

### Task 2: Manifest data slots and the `data:slots` permission

**Goal:** A manifest can declare `dataSlots` and the `data:slots` permission, each requiring the other, and every slot string must exist in `locales/en.json`. Settings → Plugins describes the new permission and lists the slots a plugin asks for.

**Files:**
- Create: `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts`
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts` (permission, `dataSlots` key, `_refineDataSlots`, `PluginDataSlot` and `PluginDataSlotAttribute` types)
- Modify: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts` (slot strings in `getMessageKeysFromManifest`)
- Modify: `packages/shared/plugin-manifest/src/index.ts`, `packages/shared/plugin-manifest/src/runtime.ts` (exports)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx` (the `data:slots` line)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection.tsx` (a "Records you choose for it" line)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.tsx` (passes slot titles)
- Modify (fixtures): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`, `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts`
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`, `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`

**Depends on:** none.

- [ ] **Step 1: Write the failing schema tests**

Append to the end of `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts` (after the last `describe` block; `_makeValidManifest` and `_getIssues` already exist at the top of the file):

```ts

function _makeDataSlot(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: "%slot.cases.title%",
    attributes: {
      onsetDate: { type: "date", title: "%slot.cases.onsetDate%" },
    },
    ...overrides,
  };
}

function _makeManifestWithDataSlots(
  dataSlots: Record<string, unknown>,
  permissions: string[] = ["data:context", "data:slots"],
): Record<string, unknown> {
  return { ..._makeValidManifest(), permissions, dataSlots };
}

describe("PluginManifestSchema dataSlots", () => {
  it("defaults dataSlots to an empty record when the manifest declares none", () => {
    const result = PluginManifestSchema.parse(_makeValidManifest());
    expect(result.dataSlots).toEqual({});
  });

  it("defaults a slot to optional and its attributes to required", () => {
    const result = PluginManifestSchema.parse(
      _makeManifestWithDataSlots({ cases: _makeDataSlot() }),
    );
    expect(result.dataSlots.cases?.required).toBe(false);
    expect(result.dataSlots.cases?.attributes.onsetDate?.required).toBe(true);
  });

  it.each([
    ["number"],
    ["date"],
    ["text"],
    ["boolean"],
    ["geo.admin1"],
    ["geo.admin2"],
  ])("accepts a %s attribute", (type) => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({
        attributes: { value: { type, title: "%slot.cases.value%" } },
      }),
    });
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("rejects data slots declared without the data:slots permission", () => {
    const manifest = _makeManifestWithDataSlots({ cases: _makeDataSlot() }, [
      "data:context",
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots",
        message: 'declaring data slots requires the "data:slots" permission',
      },
    ]);
  });

  it("rejects the data:slots permission when no data slot is declared", () => {
    const manifest = _makeManifestWithDataSlots({});
    expect(_getIssues(manifest)).toEqual([
      {
        path: "permissions",
        message: '"data:slots" requires at least one entry in dataSlots',
      },
    ]);
  });

  it("rejects a data slot with no attributes", () => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({ attributes: {} }),
    });
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots.cases.attributes",
        message: "must declare at least one attribute",
      },
    ]);
  });

  it("rejects a slot id that does not start with a letter", () => {
    const manifest = _makeManifestWithDataSlots({ "1cases": _makeDataSlot() });
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots.1cases",
        message: "must start with a letter and hold only letters and digits",
      },
    ]);
  });

  it("rejects an attribute key that holds a character other than a letter or digit", () => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({
        attributes: {
          "onset-date": { type: "date", title: "%slot.cases.onsetDate%" },
        },
      }),
    });
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots.cases.attributes.onset-date",
        message: "must start with a letter and hold only letters and digits",
      },
    ]);
  });

  it("lists the attribute types when an attribute type is unknown", () => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({
        attributes: {
          onsetDate: { type: "datetime", title: "%slot.cases.onsetDate%" },
        },
      }),
    });
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots.cases.attributes.onsetDate.type",
        message:
          "must be number, date, text, boolean, geo.admin1, or geo.admin2",
      },
    ]);
  });

  it("rejects a slot title that is not a %key% reference", () => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({ title: "Cases" }),
    });
    expect(_getIssues(manifest)).toEqual([
      {
        path: "dataSlots.cases.title",
        message: "must be a %key% reference to locales/en.json",
      },
    ]);
  });

  it("rejects a concept hint that is only whitespace", () => {
    const manifest = _makeManifestWithDataSlots({
      cases: _makeDataSlot({ concept: "  " }),
    });
    expect(
      _getIssues(manifest).map((issue) => {
        return issue.path;
      }),
    ).toEqual(["dataSlots.cases.concept"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/PluginManifest`
Expected: FAIL, 16 failed | 69 passed. The first failure is `AssertionError: expected undefined to deeply equal {}`; the permission cases fail with an unrecognized `dataSlots` key and `permissions.1` being an invalid enum value.

- [ ] **Step 3: Implement the data slot schema**

Create `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts`:

```ts
import { LocalizedStringSchema } from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

const DATA_SLOT_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const DATA_SLOT_KEY_MESSAGE =
  "must start with a letter and hold only letters and digits";
const ATTRIBUTE_TYPE_MESSAGE =
  "must be number, date, text, boolean, geo.admin1, or geo.admin2";

/**
 * The kinds of value a data slot attribute holds. Each one decides which
 * workspace field types an admin may bind the attribute to, and how the
 * install wizard labels it. `geo.admin1` and `geo.admin2` are text that names
 * a province or district.
 */
export const DATA_SLOT_ATTRIBUTE_TYPES = [
  "number",
  "date",
  "text",
  "boolean",
  "geo.admin1",
  "geo.admin2",
] as const;

/**
 * One kind of data slot attribute value, for typing code that checks which
 * workspace fields an attribute can bind to.
 */
export type DataSlotAttributeType = (typeof DATA_SLOT_ATTRIBUTE_TYPES)[number];

const DataSlotKeySchema = z.string().regex(DATA_SLOT_KEY_PATTERN);

// A record reports a key that fails its key schema as "Invalid key in
// record", so each keyed record carries the key rule's message itself.
function _getKeyIssueMessage(issue: { code?: string }): string | undefined {
  return issue.code === "invalid_key" ? DATA_SLOT_KEY_MESSAGE : undefined;
}

/**
 * The schema for one attribute of a data slot: a value the plugin reads from
 * each bound record, such as a case's onset date. Required by default, so a
 * binding must map it to a workspace field.
 */
export const PluginDataSlotAttributeSchema = z.strictObject({
  type: z.enum(DATA_SLOT_ATTRIBUTE_TYPES, { error: ATTRIBUTE_TYPE_MESSAGE }),
  title: LocalizedStringSchema,
  required: z.boolean().default(true),
});

/**
 * The schema for one entry of a manifest's `dataSlots`: the shape of the
 * records a plugin reads, which an admin binds to a case type or a dataset
 * when installing it. Optional by default. `concept` names a case type the
 * install wizard lists first. That a slot declares at least one attribute is
 * checked by `PluginManifestSchema`.
 */
export const PluginDataSlotSchema = z.strictObject({
  title: LocalizedStringSchema,
  description: LocalizedStringSchema.optional(),
  concept: z.string().trim().min(1).optional(),
  required: z.boolean().default(false),
  attributes: z.record(DataSlotKeySchema, PluginDataSlotAttributeSchema, {
    error: _getKeyIssueMessage,
  }),
});

/**
 * The schema for a manifest's `dataSlots`: data slots keyed by slot id, the
 * id a plugin passes to `avandar.data.querySlot`.
 */
export const PluginDataSlotsSchema = z.record(
  DataSlotKeySchema,
  PluginDataSlotSchema,
  { error: _getKeyIssueMessage },
);
```

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`:

Add the import beside the `PluginVizTypeSchema` import:

```ts
import { PluginDataSlotsSchema } from "@plugin-manifest/PluginManifest/PluginDataSlotSchema.ts";
import { PluginVizTypeSchema } from "@plugin-manifest/PluginManifest/PluginVizTypeSchema.ts";
```

Replace the permissions block:

```ts
/**
 * Permissions a manifest may request in this version of the schema.
 * `data:context` lets a command read the rows of the result it was invoked
 * on, and `query:addColumns` lets a Data Explorer toolbar command add
 * computed columns to that result's query.
 */
export const PLUGIN_PERMISSIONS = ["data:context", "query:addColumns"] as const;
```

with:

```ts
/**
 * Permissions a manifest may request in this version of the schema.
 * `data:context` lets a command read the rows of the result it was invoked
 * on, `query:addColumns` lets a Data Explorer toolbar command add computed
 * columns to that result's query, and `data:slots` lets a command read the
 * records an admin bound to the plugin's `dataSlots`.
 */
export const PLUGIN_PERMISSIONS = [
  "data:context",
  "query:addColumns",
  "data:slots",
] as const;
```

In `BasePluginManifestSchema`, add `dataSlots` after `permissions`:

```ts
  permissions: z.array(z.enum(PLUGIN_PERMISSIONS)).default([]),
  dataSlots: PluginDataSlotsSchema.default({}),
  contributes: z.strictObject({
```

Add this refinement directly above the `PluginManifestSchema` docstring:

```ts
function _refineDataSlots(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const slotEntries = Object.entries(manifest.dataSlots);
  const hasPermission = manifest.permissions.includes("data:slots");
  if (slotEntries.length > 0 && !hasPermission) {
    context.addIssue({
      code: "custom",
      path: ["dataSlots"],
      message: 'declaring data slots requires the "data:slots" permission',
    });
  }
  if (slotEntries.length === 0 && hasPermission) {
    context.addIssue({
      code: "custom",
      path: ["permissions"],
      message: '"data:slots" requires at least one entry in dataSlots',
    });
  }
  slotEntries.forEach(([slotId, slot]) => {
    if (Object.keys(slot.attributes).length === 0) {
      context.addIssue({
        code: "custom",
        path: ["dataSlots", slotId, "attributes"],
        message: "must declare at least one attribute",
      });
    }
  });
}
```

Call it last in the `superRefine`:

```ts
    _refineAiTools(manifest, context);
    _refineDataSlots(manifest, context);
  },
);
```

Append to the end of the file:

```ts

/**
 * A data slot a plugin declares under `dataSlots`, for example to list it in
 * the install wizard or to check a binding against its attributes.
 */
export type PluginDataSlot = PluginManifest["dataSlots"][string];

/**
 * One attribute of a data slot, for code that maps it to a workspace field
 * or reads its value from a bound record.
 */
export type PluginDataSlotAttribute = PluginDataSlot["attributes"][string];
```

- [ ] **Step 4: Run the schema tests and confirm they pass**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/PluginManifest`
Expected: PASS (85 tests)

- [ ] **Step 5: Write the failing locale-key tests**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`, add directly above `describe("compileManifest", () => {`:

```ts
const DATA_SLOT_YAML = VALID_YAML.replace(
  "contributes:",
  `permissions:
  - data:slots
dataSlots:
  cases:
    title: "%slot.cases.title%"
    description: "%slot.cases.description%"
    attributes:
      onsetDate:
        type: date
        title: "%slot.cases.onsetDate%"
contributes:`,
);

const DATA_SLOT_EN_MESSAGES: Record<string, string> = {
  ...LOCALES.en,
  "slot.cases.title": "Cases",
  "slot.cases.description": "The cases to chart.",
  "slot.cases.onsetDate": "Onset date",
};

function _omitDataSlotMessage(key: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(DATA_SLOT_EN_MESSAGES).filter(([candidateKey]) => {
      return candidateKey !== key;
    }),
  );
}
```

Then add this block inside `describe("compileManifest", ...)`, after the `describe("viz type strings", ...)` block (leave one blank line between them):

```ts
  describe("data slot strings", () => {
    it.each([
      ["title", "slot.cases.title"],
      ["description", "slot.cases.description"],
      ["attribute title", "slot.cases.onsetDate"],
    ])("requires a data slot's %s in locales/en.json", (_label, key) => {
      expect(
        _getIssues(() => {
          return _compile(DATA_SLOT_YAML, { en: _omitDataSlotMessage(key) });
        }),
      ).toEqual([`"${key}" is referenced but missing from locales/en.json`]);
    });

    it("keeps every data slot string in the compiled strings", () => {
      const { strings } = _compile(DATA_SLOT_YAML, {
        en: DATA_SLOT_EN_MESSAGES,
      });
      expect(strings.en).toEqual({
        "plugin.name": "Epidemiology",
        "plugin.description": "Statistical tools.",
        "regression.linear.title": "Linear regression",
        "slot.cases.title": "Cases",
        "slot.cases.description": "The cases to chart.",
        "slot.cases.onsetDate": "Onset date",
      });
    });
  });
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`
Expected: FAIL, 4 failed | 27 passed. The three "requires" cases fail with `AssertionError: expected not to be reached`; the last with `expected { 'plugin.name': 'Epidemiology', …(2) } to deeply equal { 'plugin.name': 'Epidemiology', …(5) }`.

- [ ] **Step 7: Implement the slot locale keys and exports**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts`, add `PluginDataSlot` to the type import:

```ts
import type {
  PluginDataSlot,
  PluginManifest,
  PluginVizSettingControl,
  PluginVizType,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

Add this helper directly above the `getMessageKeysFromManifest` docstring:

```ts
function _getDataSlotStrings(slot: PluginDataSlot): string[] {
  return [
    slot.title,
    ...(slot.description === undefined ? [] : [slot.description]),
    ...Object.values(slot.attributes).map((attribute) => {
      return attribute.title;
    }),
  ];
}
```

and extend the `values` list in `getMessageKeysFromManifest`:

```ts
    ...manifest.contributes.vizTypes.flatMap((vizType) => {
      return _getVizTypeStrings(vizType);
    }),
    ...Object.values(manifest.dataSlots).flatMap((slot) => {
      return _getDataSlotStrings(slot);
    }),
  ];
```

In `packages/shared/plugin-manifest/src/runtime.ts`, export the new types (types only, so the app bundle gains nothing):

```ts
export type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
export type { DataSlotAttributeType } from "@plugin-manifest/PluginManifest/PluginDataSlotSchema.ts";
export type {
  PluginCommand,
  PluginDataSlot,
  PluginDataSlotAttribute,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
  PluginVizSetting,
  PluginVizSettingControl,
  PluginVizType,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

In `packages/shared/plugin-manifest/src/index.ts`, add the three types to the first `export type { ... } from "@plugin-manifest/runtime.ts";` list (alphabetical: `DataSlotAttributeType` after `CompiledPluginManifest`; `PluginDataSlot`, `PluginDataSlotAttribute` after `PluginCommand`), and add the value export above the `PLUGIN_PERMISSIONS` export:

```ts
export { DATA_SLOT_ATTRIBUTE_TYPES } from "@plugin-manifest/PluginManifest/PluginDataSlotSchema.ts";
export {
  PLUGIN_PERMISSIONS,
  PluginManifestSchema,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

- [ ] **Step 8: Run the manifest package tests and confirm they pass**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest`
Expected: PASS (10 files, 193 tests)

- [ ] **Step 9: Write the failing settings card tests**

In `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`:

Add two strings to `STRINGS.en`:

```ts
    "viz.ratePlot.title": "Rate plot",
    "slot.cases.title": "Cases",
    "slot.deaths.title": "Deaths",
```

Replace the head of `_makeManifest` so it takes and sets `dataSlots`:

```ts
function _makeManifest(options: {
  hasToolbarCommand: boolean;
  hasChartTypes: boolean;
  permissions: string[];
  dataSlots?: Record<string, unknown>;
}): PluginManifest {
  const {
    hasToolbarCommand,
    hasChartTypes,
    permissions,
    dataSlots = {},
  } = options;
  return {
    id: "avandar.epidemiology",
    permissions,
    dataSlots,
    contributes: {
```

Add this fixture above `const EMPTY_MANIFEST`:

```ts
const DATA_SLOTS_MANIFEST = _makeManifest({
  hasToolbarCommand: true,
  hasChartTypes: false,
  permissions: ["data:slots"],
  dataSlots: {
    cases: { title: "%slot.cases.title%", attributes: {} },
    deaths: { title: "%slot.deaths.title%", attributes: {} },
  },
});
```

Add two tests above `it("says its charts see only their own rows when the plugin adds chart types", ...)`:

```ts
  it("describes the data:slots permission in plain language", async () => {
    await _renderExpandedDetails(DATA_SLOTS_MANIFEST);

    expect(
      screen.getByText(
        "The records you choose for it, when someone runs one of its tools",
      ),
    ).toBeInTheDocument();
  });

  it("lists the records to choose by their localized data slot titles", async () => {
    await _renderExpandedDetails(DATA_SLOTS_MANIFEST);

    expect(
      screen.getByText("Records you choose for it: Cases, Deaths"),
    ).toBeInTheDocument();
  });
```

And extend "says the plugin adds nothing yet when it contributes nothing" with:

```ts
    expect(
      screen.queryByText(/Records you choose for it:/),
    ).not.toBeInTheDocument();
```

Also add `dataSlots: {},` after `permissions: ["data:context"],` in `_makeManifestModule` in `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`, and after `permissions: [],` in `MANIFEST` in `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts` (that one is typed `PluginManifest`, so `tsc` fails without it).

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails`
Expected: FAIL, 2 failed | 13 passed, with `Error: No matching value found for input: data:slots` (the exhaustive `matchLiteral` in `PluginDataAccessSection`).

- [ ] **Step 11: Implement the settings card lines**

In `PluginDataAccessSection.tsx`, add the third arm:

```tsx
      text: matchLiteral(permission, {
        "data:context": t`A query result's rows, only when you run one of its tools on that result`,
        "query:addColumns": t`Add calculated columns to a Data Explorer query when you run one of its tools`,
        "data:slots": t`The records you choose for it, when someone runs one of its tools`,
      }),
```

In `PluginAdditionsSection.tsx`, add the prop after `chartTypeTitles`:

```tsx
  /** Chart type titles, already localized. */
  chartTypeTitles: readonly string[];

  /** Data slot titles, already localized. */
  dataSlotTitles: readonly string[];
}>;
```

replace the docstring:

```tsx
/**
 * The "What it adds" block of a plugin's details: one line per place in the
 * app the plugin adds to, naming each addition, plus the records it asks an
 * admin to choose for it, so an admin knows what to look for and what to set
 * up after installing it. Lines with nothing to name are left out.
 */
```

destructure `dataSlotTitles`, and:

```tsx
  const chartTypes = listFormat.format(chartTypeTitles);
  const dataSlots = listFormat.format(dataSlotTitles);
  const hasAdditions =
    toolbarCommandTitles.length > 0 ||
    chartTypeTitles.length > 0 ||
    dataSlotTitles.length > 0;
```

```tsx
          {chartTypeTitles.length > 0 ? (
            <List.Item>{t`Chart types: ${chartTypes}`}</List.Item>
          ) : null}
          {dataSlotTitles.length > 0 ? (
            <List.Item>{t`Records you choose for it: ${dataSlots}`}</List.Item>
          ) : null}
```

In `PluginDetails.tsx`, delete the `import type { PluginContribution } ...` line and replace `_getLocalizedContributionTitles`:

```tsx
function _getLocalizedContributionTitles(options: {
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
  locale: string;
}): {
  toolbarCommandTitles: string[];
  chartTypeTitles: string[];
  dataSlotTitles: string[];
} {
  const { manifest, strings, locale } = options;
  const { dataExplorerToolbarCommands, chartTypes } =
    getContributionsFromManifest(manifest);
  const getTitles = (contributions: ReadonlyArray<{ title: string }>) => {
    return contributions.map((contribution) => {
      return getLocalizedTextFromManifestStrings({
        strings,
        locale,
        value: contribution.title,
      });
    });
  };
  return {
    toolbarCommandTitles: getTitles(dataExplorerToolbarCommands),
    chartTypeTitles: getTitles(chartTypes),
    dataSlotTitles: getTitles(Object.values(manifest.dataSlots)),
  };
}
```

then destructure `dataSlotTitles` in `PluginDetails` and pass it:

```tsx
  const { toolbarCommandTitles, chartTypeTitles, dataSlotTitles } =
    _getLocalizedContributionTitles({
```

```tsx
            <PluginAdditionsSection
              toolbarCommandTitles={toolbarCommandTitles}
              chartTypeTitles={chartTypeTitles}
              dataSlotTitles={dataSlotTitles}
            />
```

- [ ] **Step 12: Run the tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/lib/plugins/vizs/getPluginVizTypeFromManifest`
Expected: PASS (5 files, 55 tests)

- [ ] **Step 13: Type check, format, lint**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore $(git status --short | awk '{print $2}')
pnpm exec eslint $(git status --short | awk '{print $2}')
```
Expected: no errors

- [ ] **Step 14: Commit**

```bash
git add packages/shared/plugin-manifest/src src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/lib/plugins/vizs/getPluginVizTypeFromManifest
git commit -m "feat(plugins): declare data slots and the data:slots permission" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- oxfmt formats nothing without `--ignore-path .oxfmtignore` (its default ignore file inverts to `*`).
- Packages are excluded from the root Vitest config, so manifest tests need `--config packages/shared/plugin-manifest/vitest.config.ts`.
- A Zod record reports a bad key as "Invalid key in record" and ignores the key schema's own message, which is why the records pass `{ error: _getKeyIssueMessage }`.
- `PluginDetails` renders inside a `Collapse` that keeps its children mounted, so any test fixture that renders a plugin card with a hand-built manifest needs `dataSlots: {}` or it throws in `Object.values`.
- The new strings in the settings card are Lingui `t` macros. The catalogs (`src/i18n/locales/*/messages.po`) are refreshed by the pre-push hook, not per task.
- View code imports only types from `@avandar/plugin-manifest/runtime`, so this task adds no bytes to `pnpm check:plugin-bundle`'s host count.

---

### Task 3: Manifest content, optional `entry`, and the plugin readers

**Design note:** the no-entry `loadCode` in `makePluginModuleSources` is done here, because making `entryPath` optional breaks `makePluginModuleSources`' type check and this task owns every `entryPath` caller. Task 5 adds only `loadContentUrls` and the `PluginIndexEntry` field.

**Goal:** A manifest can declare `contributes.content` (bundled CSV datasets) and may leave out `entry` when it has no commands, chart types, or AI tools. Every reader of a plugin folder (`readPluginDirectory`, the Vite dep scan, the Vite plugin index, and `ava plugin validate`) handles a plugin with no code and checks each content file exists and is at most 1 MiB.

**Files:**
- Create: `packages/shared/plugin-manifest/src/PluginManifest/PluginContentSchema.ts`
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts` (optional `entry`, `contributes.content`, `_refineContent`, `_refineEntry`, `PluginContentItem` type)
- Modify: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts` (content strings)
- Modify: `packages/shared/plugin-manifest/src/index.ts`, `packages/shared/plugin-manifest/src/runtime.ts` (exports)
- Modify: `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts` (`entryPath` optional, `contentPathsById`, content checks)
- Modify: `scripts/vite-plugin-ava-plugins/makeOptimizeDepsEntriesFromPlugins/makeOptimizeDepsEntriesFromPlugins.ts`
- Modify: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts`
- Modify: `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.ts`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection.tsx`, `.../PluginDetails/PluginDetails.tsx` (content count line)
- Modify (fixtures): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`, `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts`
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`, `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`, `packages/shared/plugin-manifest/src/node/__tests__/readPluginFolders.integration.test.ts`, `scripts/vite-plugin-ava-plugins/makeOptimizeDepsEntriesFromPlugins/makeOptimizeDepsEntriesFromPlugins.test.ts`, `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`, `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.test.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`

**Depends on:** Task 2 (the `dataSlots` fixture fields and the `PluginAdditionsSection` props it added).

- [ ] **Step 1: Write the failing schema tests**

Append to the end of `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts` (`_makeVizType` and `_makeAiTool` already exist in the file):

```ts

function _makeContentItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "provinces",
    kind: "dataset",
    title: "%content.provinces.title%",
    description: "%content.provinces.description%",
    file: "content/mz-adm1.csv",
    ...overrides,
  };
}

function _makeContentOnlyManifest(content: unknown[]): Record<string, unknown> {
  const manifest = _makeValidManifest();
  delete manifest.entry;
  return {
    ...manifest,
    permissions: [],
    contributes: { content },
  };
}

describe("PluginManifestSchema contributes.content", () => {
  it("defaults content to an empty list", () => {
    const parsed = PluginManifestSchema.parse(_makeValidManifest());
    expect(parsed.contributes.content).toEqual([]);
  });

  it("accepts a manifest with content and no entry", () => {
    const parsed = PluginManifestSchema.parse(
      _makeContentOnlyManifest([_makeContentItem()]),
    );
    expect(parsed.entry).toBeUndefined();
    expect(parsed.contributes.content[0]?.file).toBe("content/mz-adm1.csv");
  });

  it.each([
    ["commands", { commands: [{ id: "x", title: "%x%", icon: "puzzle" }] }],
    ["chart types", { vizTypes: [_makeVizType()] }],
    ["AI tools", { aiTools: [_makeAiTool()] }],
  ])(
    "requires an entry when the plugin contributes %s",
    (_label, contributes) => {
      const manifest = _makeContentOnlyManifest([]);
      manifest.contributes = contributes;
      expect(_getIssues(manifest)).toEqual([
        {
          path: "entry",
          message:
            "required when the plugin contributes commands, chart types, or AI tools",
        },
      ]);
    },
  );

  it("rejects duplicate content ids", () => {
    const manifest = _makeContentOnlyManifest([
      _makeContentItem(),
      _makeContentItem({ file: "content/other.csv" }),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.content.1.id",
        message: 'duplicate content id "provinces"',
      },
    ]);
  });

  it.each([
    ["a file that is not a .csv", "content/mz-adm1.json"],
    ["an absolute path", "/content/mz-adm1.csv"],
    ["a path that leaves the plugin folder", "../mz-adm1.csv"],
  ])("rejects %s", (_label, file) => {
    const manifest = _makeContentOnlyManifest([_makeContentItem({ file })]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.content.0.file",
        message:
          "must be a relative path to a .csv file inside the plugin folder",
      },
    ]);
  });

  it("rejects a content kind other than dataset", () => {
    const manifest = _makeContentOnlyManifest([
      _makeContentItem({ kind: "map" }),
    ]);
    expect(
      _getIssues(manifest).map((issue) => {
        return issue.path;
      }),
    ).toEqual(["contributes.content.0.kind"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/PluginManifest`
Expected: FAIL, 10 failed | 85 passed. First failure: `AssertionError: expected undefined to deeply equal []`.

- [ ] **Step 3: Implement the content schema and the optional entry**

Create `packages/shared/plugin-manifest/src/PluginManifest/PluginContentSchema.ts`:

```ts
import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

/**
 * The largest file, in bytes, a content item may bundle: 1 MiB. A plugin's
 * content ships inside the app's build output, so `readPluginDirectory`
 * rejects a bigger file before it reaches a build.
 */
export const MAX_CONTENT_FILE_BYTES = 1_048_576;

const CONTENT_FILE_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.csv$/;

/**
 * The schema for one entry of a manifest's `contributes.content`: a CSV file
 * the plugin bundles, which installing the plugin imports as a workspace
 * dataset named by `title` and described by `description`. `id` is how a
 * workspace remembers what it already imported, so it must stay stable
 * across versions. That ids are unique is checked by `PluginManifestSchema`.
 */
export const PluginContentItemSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  kind: z.literal("dataset"),
  title: LocalizedStringSchema,
  description: LocalizedStringSchema,
  file: z
    .string()
    .regex(
      CONTENT_FILE_PATTERN,
      "must be a relative path to a .csv file inside the plugin folder",
    ),
});
```

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`:

Add the import above the `PluginDataSlotsSchema` import:

```ts
import { PluginContentItemSchema } from "@plugin-manifest/PluginManifest/PluginContentSchema.ts";
```

Make `entry` optional:

```ts
  entry: z
    .string()
    .regex(
      ENTRY_PATTERN,
      "must be a relative path to a .ts or .tsx file inside the plugin folder",
    )
    .optional(),
```

Add `content` as the last key of `contributes`:

```ts
    aiTools: z.array(AiToolSchema).default([]),
    content: z.array(PluginContentItemSchema).default([]),
  }),
});
```

Add these two refinements below `_refineDataSlots`:

```ts
function _refineContent(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const seenIds = new Set<string>();
  manifest.contributes.content.forEach((item, index) => {
    if (seenIds.has(item.id)) {
      context.addIssue({
        code: "custom",
        path: ["contributes", "content", index, "id"],
        message: `duplicate content id "${item.id}"`,
      });
    }
    seenIds.add(item.id);
  });
}

function _refineEntry(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const { commands, vizTypes, aiTools } = manifest.contributes;
  const hasCode =
    commands.length > 0 || vizTypes.length > 0 || aiTools.length > 0;
  if (hasCode && manifest.entry === undefined) {
    context.addIssue({
      code: "custom",
      path: ["entry"],
      message:
        "required when the plugin contributes commands, chart types, or AI tools",
    });
  }
}
```

Call them at the end of the `superRefine`:

```ts
    _refineDataSlots(manifest, context);
    _refineContent(manifest, context);
    _refineEntry(manifest, context);
  },
);
```

Append to the end of the file:

```ts

/**
 * A dataset a plugin bundles under `contributes.content`, for example to
 * offer it in the install wizard or to import it into a workspace.
 */
export type PluginContentItem =
  PluginManifest["contributes"]["content"][number];
```

- [ ] **Step 4: Run the schema tests and confirm they pass**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/PluginManifest`
Expected: PASS (95 tests)

- [ ] **Step 5: Write the failing locale-key tests**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`, add above `describe("compileManifest", () => {` (below `_omitDataSlotMessage` from Task 2):

```ts
const CONTENT_YAML = `${VALID_YAML}  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/mz-adm1.csv
`;

const CONTENT_EN_MESSAGES: Record<string, string> = {
  ...LOCALES.en,
  "content.provinces.title": "Provinces",
  "content.provinces.description": "Province boundaries.",
};
```

and add this block inside `describe("compileManifest", ...)`, after `describe("data slot strings", ...)`:

```ts

  describe("content strings", () => {
    it.each([
      ["title", "content.provinces.title"],
      ["description", "content.provinces.description"],
    ])("requires a content item's %s in locales/en.json", (_label, key) => {
      const messages = { ...CONTENT_EN_MESSAGES };
      delete messages[key];
      expect(
        _getIssues(() => {
          return _compile(CONTENT_YAML, { en: messages });
        }),
      ).toEqual([`"${key}" is referenced but missing from locales/en.json`]);
    });
  });
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`
Expected: FAIL, 2 failed | 31 passed, with `AssertionError: expected not to be reached`.

- [ ] **Step 7: Implement the content locale keys and exports**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts`, extend the `values` list in `getMessageKeysFromManifest`:

```ts
    ...Object.values(manifest.dataSlots).flatMap((slot) => {
      return _getDataSlotStrings(slot);
    }),
    ...manifest.contributes.content.flatMap((item) => {
      return [item.title, item.description];
    }),
  ];
```

In `packages/shared/plugin-manifest/src/runtime.ts`, add `PluginContentItem` to the `PluginManifestSchema.ts` type export list, after `PluginCommand`.

In `packages/shared/plugin-manifest/src/index.ts`, add `PluginContentItem` after `PluginCommand` in the first `export type { ... } from "@plugin-manifest/runtime.ts"` list, and add this value export directly above the `DATA_SLOT_ATTRIBUTE_TYPES` export:

```ts
export { MAX_CONTENT_FILE_BYTES } from "@plugin-manifest/PluginManifest/PluginContentSchema.ts";
```

- [ ] **Step 8: Run it and confirm it passes**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`
Expected: PASS (33 tests)

- [ ] **Step 9: Write the failing plugin folder tests**

In `packages/shared/plugin-manifest/src/node/__tests__/readPluginFolders.integration.test.ts`, add above `let repoRoot: string;`:

```ts
const CONTENT_MANIFEST_YAML = `
id: avandar.boundaries
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
icon: puzzle
contributes:
  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/provinces.csv
`;

const CONTENT_LOCALE_MESSAGES = {
  "plugin.name": "Boundaries",
  "plugin.description": "Province boundaries.",
  "content.provinces.title": "Provinces",
  "content.provinces.description": "Province boundaries of a country.",
};

const MAX_CONTENT_FILE_BYTES = 1_048_576;
```

add above `beforeEach(() => {`:

```ts
/**
 * Writes a plugin with no entry and one content item. `contentFile` is the
 * content file's contents, or undefined to leave the file out.
 */
function _writeContentPlugin(contentFile: string | undefined): string {
  const directory = _writePlugin("boundaries", {
    yaml: CONTENT_MANIFEST_YAML,
    localeFiles: { "en.json": JSON.stringify(CONTENT_LOCALE_MESSAGES) },
  });
  if (contentFile !== undefined) {
    _writeFile(join(directory, "content/provinces.csv"), contentFile);
  }
  return directory;
}
```

and add these tests inside `describe("readPluginDirectory", ...)`, above `it("reports ava.yaml not found for a plugin folder without one", ...)`:

```ts
  it("returns no entry path and each content file's absolute path for a plugin without code", () => {
    const directory = _writeContentPlugin("code,name\nMZ-P,Cabo Delgado\n");
    const plugin = readPluginDirectory({ directory, repoRoot });
    expect(plugin.entryPath).toBeUndefined();
    expect(plugin.contentPathsById).toEqual({
      provinces: join(directory, "content/provinces.csv"),
    });
  });

  it("reports a content file that does not exist", () => {
    const directory = _writeContentPlugin(undefined);
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual([
      "contributes.content.0.file: content/provinces.csv does not exist",
    ]);
  });

  it("reports a content file one byte over the 1 MiB limit", () => {
    const directory = _writeContentPlugin(
      "a".repeat(MAX_CONTENT_FILE_BYTES + 1),
    );
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual([
      "contributes.content.0.file: content/provinces.csv is 1048577 bytes, over the 1048576 byte limit",
    ]);
  });

  it("accepts a content file of exactly 1 MiB", () => {
    const directory = _writeContentPlugin("a".repeat(MAX_CONTENT_FILE_BYTES));
    const plugin = readPluginDirectory({ directory, repoRoot });
    expect(Object.keys(plugin.contentPathsById)).toEqual(["provinces"]);
  });
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/node`
Expected: FAIL, 4 failed, with `TypeError: The "path" argument must be of type string. Received undefined` (from `join(directory, compiled.manifest.entry)`).

- [ ] **Step 11: Implement the folder checks**

In `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts`:

Imports:

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
```

```ts
import { makeTablerComponentNameFromIconName } from "@plugin-manifest/icons/makeTablerComponentNameFromIconName.ts";
import { MAX_CONTENT_FILE_BYTES } from "@plugin-manifest/PluginManifest/PluginContentSchema.ts";
import { z } from "zod";
import type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import type { PluginContentItem } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

Replace the head of `PluginDirectory` (docstring through `entryPath`):

```ts
/**
 * A plugin folder read from disk and fully validated, so a caller can use it
 * without re-checking anything. `readPluginDirectory` and `readBundledPlugins`
 * return it, for example to a Vite plugin that bundles `entryPath` and
 * `contentPathsById` or to a command that reports on the folder.
 */
export type PluginDirectory = Readonly<{
  /** The folder's own name, such as `hello` for `plugins/hello`. */
  folderName: string;
  directory: string;
  /**
   * The manifest's `entry` file, joined onto `directory`. Undefined for a
   * plugin with no code, such as one that only bundles content.
   */
  entryPath: string | undefined;
  /** Each content item's file, joined onto `directory`, by content id. */
  contentPathsById: Readonly<Record<string, string>>;
  compiled: CompiledPluginManifest;
```

Add these helpers directly above `_getFileIssues`:

```ts
function _getEntryIssues(options: {
  directory: string;
  entry: string | undefined;
}): string[] {
  const { directory, entry } = options;
  return entry === undefined || existsSync(join(directory, entry))
    ? []
    : [`entry: ${entry} does not exist`];
}

function _getContentIssues(options: {
  directory: string;
  content: readonly PluginContentItem[];
}): string[] {
  return options.content.flatMap((item, index) => {
    const label = `contributes.content.${index}.file: ${item.file}`;
    const stats = statSync(join(options.directory, item.file), {
      throwIfNoEntry: false,
    });
    if (stats === undefined || !stats.isFile()) {
      return [`${label} does not exist`];
    }
    return stats.size > MAX_CONTENT_FILE_BYTES
      ? [
          `${label} is ${stats.size} bytes, over the ${MAX_CONTENT_FILE_BYTES} byte limit`,
        ]
      : [];
  });
}
```

In `_getFileIssues`, delete the `const entryIssues = ...` statement and replace the return:

```ts
  return [
    ..._getEntryIssues({ directory, entry: compiled.manifest.entry }),
    ..._getContentIssues({
      directory,
      content: compiled.manifest.contributes.content,
    }),
    ..._getIconIssues({ repoRoot, compiled }),
    ...dependencyIssues,
  ];
```

Update the `readPluginDirectory` docstring's first paragraph and last sentence:

```ts
/**
 * Reads one plugin folder from disk into a validated `PluginDirectory`: its
 * `ava.yaml` compiled against its `locales/*.json` files, plus checks that
 * the entry file and every content file exist, no content file is over
 * `MAX_CONTENT_FILE_BYTES`, every icon is a real Tabler icon, and every
 * `package.json` dependency is approved.
```

```ts
 * locale files or `package.json`, then `ava.yaml` compilation, then the
 * entry, content, icon, and dependency checks.
 */
```

Replace its return:

```ts
  const { entry, contributes } = compiled.manifest;
  return {
    folderName: basename(directory),
    directory,
    entryPath: entry === undefined ? undefined : join(directory, entry),
    contentPathsById: Object.fromEntries(
      contributes.content.map((item) => {
        return [item.id, join(directory, item.file)];
      }),
    ),
    compiled,
    locales,
  };
}
```

- [ ] **Step 12: Run the manifest package and confirm it passes**

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest`
Expected: PASS (10 files, 209 tests)

- [ ] **Step 13: Write the failing Vite plugin tests**

In `scripts/vite-plugin-ava-plugins/makeOptimizeDepsEntriesFromPlugins/makeOptimizeDepsEntriesFromPlugins.test.ts`, let the fixture take `undefined`:

```ts
function _makePluginWithEntryPath(
  entryPath: string | undefined,
): PluginDirectory {
  return { entryPath } as unknown as PluginDirectory;
}
```

and add as the last test:

```ts

  it("leaves out a plugin with no entry, which has no code to scan", () => {
    const entries = makeOptimizeDepsEntriesFromPlugins({
      plugins: [
        _makePluginWithEntryPath(undefined),
        _makePluginWithEntryPath("/repo/plugins/hello/main.ts"),
      ],
      repoRoot: "/repo",
    });

    expect(entries).toEqual(["**/*.html", "plugins/hello/main.ts"]);
  });
```

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`, add below `PLUGIN`:

```ts
/** A copy of `PLUGIN` with no entry, as a plugin with only content has. */
const PLUGIN_WITHOUT_ENTRY = {
  ...PLUGIN,
  entryPath: undefined,
} as PluginDirectory;
```

and add above `it("emits an empty index when nothing is bundled", ...)`:

```ts
  it("gives a plugin with no entry a loadCode that imports only its locales and returns an empty definition", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN_WITHOUT_ENTRY],
      repoRoot: "/repo",
    });
    expect(code).not.toContain("/plugins/epidemiology/src/index.tsx");
    expect(code).toContain(
      'const locales = await import("virtual:ava-plugin-locales/avandar.epidemiology");',
    );
    expect(code).toContain(
      'definition: { kind: "avandar-plugin", commands: {}, vizTypes: {}, aiTools: {} }',
    );
  });
```

- [ ] **Step 14: Run them and confirm they fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/makeOptimizeDepsEntriesFromPlugins scripts/vite-plugin-ava-plugins/makePluginModuleSources`
Expected: FAIL, 2 failed, each with `TypeError: The "to" argument must be of type string. Received undefined`.

- [ ] **Step 15: Implement the no-entry paths**

In `makeOptimizeDepsEntriesFromPlugins.ts`, end the docstring's first paragraph with the new sentence:

```ts
 * has the scan find those packages and bundle them at server start. A plugin
 * with no entry is left out.
```

and replace the mapping:

```ts
  const pluginEntries = plugins.flatMap(({ entryPath }) => {
    return entryPath === undefined
      ? []
      : [relative(repoRoot, entryPath).split(sep).join("/")];
  });
```

In `makePluginModuleSources.ts`, replace `_makeIndexEntrySourceFromPlugin` with:

```ts
// What `definePlugin` returns for a plugin that declares nothing, so the host
// accepts the code module of a plugin with no entry like any other.
const EMPTY_DEFINITION_SOURCE =
  '{ kind: "avandar-plugin", commands: {}, vizTypes: {}, aiTools: {} }';

function _makeLoadCodeSourceLinesFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string[] {
  const { plugin, repoRoot } = options;
  const localesModuleId = `${PLUGIN_LOCALES_MODULE_PREFIX}${plugin.compiled.manifest.id}`;
  if (plugin.entryPath === undefined) {
    return [
      "    loadCode: async () => {",
      `      const locales = await import(${JSON.stringify(localesModuleId)});`,
      `      return { definition: ${EMPTY_DEFINITION_SOURCE}, messages: locales.default };`,
      "    },",
    ];
  }
  const entryPath = _makeRootRelativePathFromPath({
    path: plugin.entryPath,
    repoRoot,
  });
  return [
    "    loadCode: async () => {",
    "      const [code, locales] = await Promise.all([",
    `        import(${JSON.stringify(entryPath)}),`,
    `        import(${JSON.stringify(localesModuleId)}),`,
    "      ]);",
    "      return { definition: code.default, messages: locales.default };",
    "    },",
  ];
}

function _makeIndexEntrySourceFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string {
  const pluginId = options.plugin.compiled.manifest.id;
  const manifestModuleId = `${PLUGIN_MANIFEST_MODULE_PREFIX}${pluginId}`;
  return [
    "  {",
    `    id: ${JSON.stringify(pluginId)},`,
    `    loadManifest: () => import(${JSON.stringify(manifestModuleId)}),`,
    ..._makeLoadCodeSourceLinesFromPlugin(options),
    "  },",
  ].join("\n");
}
```

and replace the `makeIndexModuleSourceFromPlugins` docstring:

```ts
/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. A plugin with no entry gets a
 * `loadCode` that loads only its locales and returns a definition with no
 * handlers. It must contain no static imports, so the main bundle carries
 * only these few bytes per plugin. `vitePluginAvaPlugins`'s `load` hook
 * calls it.
 */
```

- [ ] **Step 16: Run them and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: PASS (32 tests)

- [ ] **Step 17: Write the failing `ava plugin validate` test**

In `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.test.ts`, add above `_writeBundledList`:

```ts
// A plugin folder with no entry that only bundles one content file, so it
// has no code for tsc or eslint to check.
function _writeContentOnlyPlugin(name: string): void {
  _writeRepoFile(
    `plugins/${name}/ava.yaml`,
    [
      `id: avandar.${name}`,
      'name: "%plugin.name%"',
      'description: "%plugin.description%"',
      'version: "0.1.0"',
      "license: MIT",
      "engines:",
      '  avandar: "^1"',
      "icon: puzzle",
      "contributes:",
      "  content:",
      "    - id: provinces",
      "      kind: dataset",
      '      title: "%content.provinces.title%"',
      '      description: "%content.provinces.description%"',
      "      file: content/provinces.csv",
      "",
    ].join("\n"),
  );
  _writeRepoFile(
    `plugins/${name}/locales/en.json`,
    JSON.stringify({
      "plugin.name": "Boundaries",
      "plugin.description": "Province boundaries.",
      "content.provinces.title": "Provinces",
      "content.provinces.description": "Province boundaries.",
    }),
  );
  _writeRepoFile(`plugins/${name}/content/provinces.csv`, "code,name\n");
}
```

and add above `it("refuses a name that is not kebab-case before running anything", ...)`:

```ts
  it("skips tsc and eslint for a plugin with no code and reports it valid", () => {
    _writeContentOnlyPlugin("boundaries");
    const runCommand = _makePassingRunCommand();
    validatePluginCommand({ name: "boundaries", repoRoot, runCommand });
    expect(runCommand).not.toHaveBeenCalled();
    const output = _getLoggedLines().join("\n");
    expect(output).toContain("No plugin code, skipping tsc and eslint.");
    expect(output).toContain("plugins/boundaries is valid.");
  });
```

- [ ] **Step 18: Run it and confirm it fails**

Run: `pnpm vitest run --config apps/ava-cli/vitest.config.ts apps/ava-cli/src/PluginCli/ValidatePluginCli`
Expected: FAIL, 1 failed | 12 passed, with `AssertionError: expected "spy" to not be called at all, but actually been called 2 times`.

- [ ] **Step 19: Implement the skip**

In `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.ts`, add the type import:

```ts
import type { PluginCommandHelp } from "@ava-cli/PluginCli/makePluginCommandHelpText";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";
```

Replace `_getManifestProblems` with:

```ts
function _readPluginOrProblems(options: {
  folderName: string;
  repoRoot: string;
}): Readonly<{ plugin: PluginDirectory | undefined; problems: string[] }> {
  const { folderName, repoRoot } = options;
  try {
    const plugin = readPluginDirectory({
      directory: join(repoRoot, "plugins", folderName),
      repoRoot,
    });
    return { plugin, problems: [] };
  } catch (error: unknown) {
    return {
      plugin: undefined,
      problems: [error instanceof Error ? error.message : String(error)],
    };
  }
}
```

Replace the body of `_validateOnePlugin` after `printInfo(\`🔎 Validating plugins/${folderName}...\`);`:

```ts
  printInfo(
    "  Checking ava.yaml, locales, icons, content, and dependencies...",
  );
  const { plugin, problems } = _readPluginOrProblems({ folderName, repoRoot });
  if (plugin === undefined) {
    printWarn("  ⚠️ Skipped tsc and eslint: fix the manifest problems first.");
    return problems;
  }
  if (plugin.entryPath === undefined) {
    printInfo("  No plugin code, skipping tsc and eslint.");
    return [];
  }
  return _getToolProblems(options);
}
```

Replace the `validatePluginCommand` docstring:

```ts
/**
 * Validates one plugin, or every bundled plugin when no name is given:
 * manifest schema, locale keys, icons, content files, approved dependencies,
 * and, for a plugin with code, `tsc` and the import lint. Prints the result
 * for each plugin, then throws when any failed, so a script such as CI sees
 * a nonzero exit.
 */
```

- [ ] **Step 20: Run the CLI tests and confirm they pass**

Run: `pnpm vitest run --config apps/ava-cli/vitest.config.ts apps/ava-cli/src/PluginCli`
Expected: PASS (34 tests)

- [ ] **Step 21: Write the failing settings card test**

In `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`, add a `contentCount` option to `_makeManifest`:

```ts
  permissions: string[];
  dataSlots?: Record<string, unknown>;
  contentCount?: number;
}): PluginManifest {
  const {
    hasToolbarCommand,
    hasChartTypes,
    permissions,
    dataSlots = {},
    contentCount = 0,
  } = options;
```

and as the last key of its `contributes`:

```ts
      content: Array.from({ length: contentCount }, (_value, index) => {
        return { id: `item-${index}`, kind: "dataset" };
      }),
```

Add above `it("says its charts see only their own rows when the plugin adds chart types", ...)`:

```ts
  it.each([
    ["1 dataset to import", 1],
    ["2 datasets to import", 2],
  ])(
    "lists %s when the plugin bundles that many content items",
    async (text, contentCount) => {
      await _renderExpandedDetails(
        _makeManifest({
          hasToolbarCommand: false,
          hasChartTypes: false,
          permissions: [],
          contentCount,
        }),
      );

      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.queryByText("Nothing yet.")).not.toBeInTheDocument();
    },
  );
```

and extend "says the plugin adds nothing yet when it contributes nothing" with:

```ts
    expect(screen.queryByText(/to import/)).not.toBeInTheDocument();
```

Add `content: [],` as the last key of `contributes` in `_makeManifestModule` in `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`, and in `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts` replace `MANIFEST.contributes` with:

```ts
  contributes: {
    commands: [],
    menus: {},
    vizTypes: [EPICURVE],
    aiTools: [],
    content: [],
  },
```

- [ ] **Step 22: Run it and confirm it fails**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails`
Expected: FAIL, 2 failed | 15 passed, with `TestingLibraryElementError: Unable to find an element with the text: 1 dataset to import`.

- [ ] **Step 23: Implement the content count line**

In `PluginAdditionsSection.tsx`, import `Plural`:

```tsx
import { Plural, Trans, useLingui } from "@lingui/react/macro";
```

add the prop after `dataSlotTitles`:

```tsx
  /** How many datasets the plugin bundles under `contributes.content`. */
  contentCount: number;
}>;
```

replace the docstring:

```tsx
/**
 * The "What it adds" block of a plugin's details: one line per place in the
 * app the plugin adds to, naming each addition, plus the records it asks an
 * admin to choose for it and how many datasets it can import, so an admin
 * knows what to look for and what to set up after installing it. Lines with
 * nothing to name are left out.
 */
```

destructure `contentCount`, extend `hasAdditions`:

```tsx
    dataSlotTitles.length > 0 ||
    contentCount > 0;
```

and add the last list item:

```tsx
          {contentCount > 0 ? (
            <List.Item>
              <Plural
                value={contentCount}
                one="# dataset to import"
                other="# datasets to import"
              />
            </List.Item>
          ) : null}
```

In `PluginDetails.tsx`, pass the count:

```tsx
              dataSlotTitles={dataSlotTitles}
              contentCount={manifest.contributes.content.length}
            />
```

- [ ] **Step 24: Run the tests and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/lib/plugins/vizs/getPluginVizTypeFromManifest`
Expected: PASS (8 files, 89 tests)

- [ ] **Step 25: Type check, format, lint, and validate the bundled plugins**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore $(git status --short | awk '{print $2}')
pnpm exec eslint $(git status --short | awk '{print $2}')
pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs plugin validate
```
Expected: no errors; the last command ends with `✅ plugins/epidemiology is valid.`

- [ ] **Step 26: Commit**

```bash
git add packages/shared/plugin-manifest/src scripts/vite-plugin-ava-plugins apps/ava-cli/src/PluginCli src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/lib/plugins/vizs/getPluginVizTypeFromManifest
git commit -m "feat(plugins): let a plugin bundle content and ship without code" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `tsconfig.node.json` includes `vite.config.ts`, which imports `scripts/vite-plugin-ava-plugins`, so a missed `entryPath` caller there shows up in both type checks.
- `ava-cli` tests are excluded from the root Vitest config; run them with `--config apps/ava-cli/vitest.config.ts`.
- `ava plugin validate` calls `pnpm exec tsc -p plugins/<name>/tsconfig.json`; a plugin with no code has no `tsconfig.json`, which is why the skip is needed and not just a nicety.
- `_getContentIssues` uses `statSync(..., { throwIfNoEntry: false })` so a missing file is an issue, not a thrown `ENOENT`.
- `package.json` is still read only for `dependencies`. A no-code plugin ships one anyway (Task 9) so pnpm sees it as a workspace package.
- In zsh, `$(git status --short | awk '{print $2}')` splits into one argument per file; assigning it to a variable first does not.

---

### Task 4: Reserved AI tool names

**Design note:** the new file is `packages/shared/plugin-manifest/src/PluginManifest/makeComparableAiToolName.ts`. The repo rule names a file after its single function export (`docs/rules/typescript.md`, "File, Directory, and Module Conventions"); constants may sit beside it. The exported names (`RESERVED_AI_TOOL_NAMES`, `makeComparableAiToolName`) and the `index.ts` export of `RESERVED_AI_TOOL_NAMES` are as contracted.

**Goal:** A plugin AI tool whose name matches a built-in data agent tool name, ignoring case and underscores (`runQuery`, `askUser`), fails manifest validation, and a test fails if `DATA_AGENT_TOOLS` gains a tool the reserved list does not cover.

**Files:**
- Create: `packages/shared/plugin-manifest/src/PluginManifest/makeComparableAiToolName.ts`
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts` (`_refineAiTools`)
- Modify: `packages/shared/plugin-manifest/src/index.ts` (export `RESERVED_AI_TOOL_NAMES`)
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`
- Create (test): `shared/agent/dataAgent/dataAgentTools.test.ts`

**Depends on:** Task 3 (it edits the same `index.ts` export block).

- [ ] **Step 1: Write the failing tests**

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`, add these two tests at the end of `describe("PluginManifestSchema contributes.aiTools", ...)`, after `it("accepts an enum whose values match the property type", ...)`:

```ts

  it.each([
    ["runQuery", "run_query"],
    ["runquery", "run_query"],
    ["lookupValues", "lookup_values"],
    ["askUser", "ask_user"],
  ])(
    "rejects the tool name %s, which only differs from %s in case and underscores",
    (name, reservedName) => {
      expect(_getIssuesForAiTool({ name })).toEqual([
        {
          path: "contributes.aiTools.0.name",
          message: `ai tool name "${name}" is reserved for the built-in "${reservedName}" tool`,
        },
      ]);
    },
  );

  it("accepts a tool name that only contains a reserved name", () => {
    expect(_getIssuesForAiTool({ name: "runQueryTwice" })).toEqual([]);
  });
```

Create `shared/agent/dataAgent/dataAgentTools.test.ts` (it does not exist yet; `dataAgentTools.ts` has had no test file):

```ts
import { RESERVED_AI_TOOL_NAMES } from "@avandar/plugin-manifest";
import { describe, expect, it } from "vitest";
import { DATA_AGENT_TOOLS } from "$/agent/dataAgent/dataAgentTools.ts";

describe("DATA_AGENT_TOOLS", () => {
  it("lists only names that RESERVED_AI_TOOL_NAMES reserves, so no plugin tool can take one", () => {
    expect(RESERVED_AI_TOOL_NAMES).toEqual(
      expect.arrayContaining(
        DATA_AGENT_TOOLS.map((tool) => {
          return tool.name;
        }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run:
```bash
pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/PluginManifest
pnpm vitest run shared/agent/dataAgent/dataAgentTools.test.ts
```
Expected: FAIL. The schema run: 4 failed | 96 passed, each `AssertionError: expected [] to deeply equal [ { …(2) } ]`. The drift run: 1 failed, `AssertionError: expected undefined to deeply equal ArrayContaining{…}`.

- [ ] **Step 3: Implement**

Create `packages/shared/plugin-manifest/src/PluginManifest/makeComparableAiToolName.ts`:

```ts
/**
 * The data agent's built-in tool names, which no plugin AI tool may take, so
 * the model never sees two tools it could mistake for each other. Keep it in
 * step with `DATA_AGENT_TOOLS`: a test beside that list fails when a built-in
 * tool is missing here.
 */
export const RESERVED_AI_TOOL_NAMES = [
  "run_query",
  "lookup_values",
  "ask_user",
] as const;

/**
 * Makes the form two AI tool names are compared in: lowercased with
 * underscores removed, so `runQuery` and `run_query` compare equal. Use it
 * to check a plugin tool name against `RESERVED_AI_TOOL_NAMES`.
 */
export function makeComparableAiToolName(name: string): string {
  return name.toLowerCase().replaceAll("_", "");
}
```

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`, add the import below the `getIssuesFromWhenCondition` import:

```ts
import {
  makeComparableAiToolName,
  RESERVED_AI_TOOL_NAMES,
} from "@plugin-manifest/PluginManifest/makeComparableAiToolName.ts";
```

and replace `_refineAiTools`:

```ts
function _refineAiTools(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const seenNames = new Set<string>();
  manifest.contributes.aiTools.forEach((tool, index) => {
    const path = ["contributes", "aiTools", index, "name"];
    if (seenNames.has(tool.name)) {
      context.addIssue({
        code: "custom",
        path,
        message: `duplicate ai tool name "${tool.name}"`,
      });
    }
    seenNames.add(tool.name);
    const reservedName = RESERVED_AI_TOOL_NAMES.find((candidate) => {
      return (
        makeComparableAiToolName(candidate) ===
        makeComparableAiToolName(tool.name)
      );
    });
    if (reservedName !== undefined) {
      context.addIssue({
        code: "custom",
        path,
        message: `ai tool name "${tool.name}" is reserved for the built-in "${reservedName}" tool`,
      });
    }
  });
}
```

In `packages/shared/plugin-manifest/src/index.ts`, add above the `MAX_CONTENT_FILE_BYTES` export:

```ts
export { RESERVED_AI_TOOL_NAMES } from "@plugin-manifest/PluginManifest/makeComparableAiToolName.ts";
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run:
```bash
pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest
pnpm vitest run shared/agent/dataAgent
```
Expected: PASS (manifest package: 10 files, 214 tests; data agent: 5 files, 20 tests)

- [ ] **Step 5: Type check, format, lint**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore $(git status --short | awk '{print $2}')
pnpm exec eslint $(git status --short | awk '{print $2}')
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/shared/plugin-manifest/src shared/agent/dataAgent/dataAgentTools.test.ts
git commit -m "feat(plugins): reserve the data agent's built-in tool names" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- Do not import `@avandar/plugin-manifest` from `dataAgentTools.ts` itself. The chat edge function's `supabase/functions/chat/deno.json` does not map the package, so the edge bundle would fail. The test file is never bundled, and the root `deno.json` and Vitest both resolve the package.
- Plugin tool names already must match `^[a-z][A-Za-z0-9]{0,63}$`, so a literal `run_query` fails the name pattern before this check; the reserved check is what catches `runQuery` and `runquery`.
- `shared/agent/dataAgent/` already holds four `*.test.ts` files beside their modules; this one follows that layout because `dataAgentTools.ts` lives there.

---

### Task 5: Content URLs in the Vite plugin index

**Design note:** the no-entry `loadCode` is done in Task 3 (making `entryPath` optional breaks this file's type check there). This task adds only `loadContentUrls`. The proof that `pnpm check:plugin-bundle` passes with a no-entry, content-only plugin runs in Task 9, once `plugins/mozambique` exists.

**Goal:** Each bundled plugin that declares content gets a `loadContentUrls` loader in `virtual:ava-plugin-index`. It resolves each content id to the URL Vite serves the file from, and downloads no content bytes until something fetches that URL.

**Files:**
- Modify: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts` (`_makeLoadContentUrlsSourceLinesFromPlugin`)
- Modify: `src/lib/plugins/PluginIndex.types.ts` (`PluginIndexEntry.loadContentUrls`)
- Test: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`

**Depends on:** Task 3 (`PluginDirectory.contentPathsById`, `PLUGIN_WITHOUT_ENTRY`, and `_makeLoadCodeSourceLinesFromPlugin`).

- [ ] **Step 1: Write the failing tests**

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`:

Give `PLUGIN` an empty content map (the generator now reads it for every plugin):

```ts
  entryPath: "/repo/plugins/epidemiology/src/index.tsx",
  contentPathsById: {},
  compiled: {
```

Add below `PLUGIN_WITHOUT_ENTRY`:

```ts
/** A copy of `PLUGIN_WITHOUT_ENTRY` that bundles two content files. */
const PLUGIN_WITH_CONTENT = {
  ...PLUGIN_WITHOUT_ENTRY,
  contentPathsById: {
    provinces: "/repo/plugins/epidemiology/content/mz-adm1.csv",
    districts: "/repo/plugins/epidemiology/content/mz-adm2.csv",
  },
} as PluginDirectory;
```

Add above `it("emits an empty index when nothing is bundled", ...)`:

```ts
  it("gives a plugin with content a loadContentUrls that imports each file as a URL and keys it by content id", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN_WITH_CONTENT],
      repoRoot: "/repo",
    });
    expect(code).toContain(
      'import("/plugins/epidemiology/content/mz-adm1.csv?url"),',
    );
    expect(code).toContain(
      'import("/plugins/epidemiology/content/mz-adm2.csv?url"),',
    );
    expect(code).toContain(
      'return { "provinces": urls[0].default, "districts": urls[1].default };',
    );
  });

  it("leaves out loadContentUrls for a plugin without content", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN],
      repoRoot: "/repo",
    });
    expect(code).not.toContain("loadContentUrls");
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/makePluginModuleSources`
Expected: FAIL, 1 failed | 9 passed, with `AssertionError: expected 'export const PLUGIN_INDEX = [\n  {\n …' to contain 'import("/plugins/epidemiology/content…'`.

- [ ] **Step 3: Implement**

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts`, add this helper directly above `_makeIndexEntrySourceFromPlugin`:

```ts
function _makeLoadContentUrlsSourceLinesFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string[] {
  const { plugin, repoRoot } = options;
  const contentEntries = Object.entries(plugin.contentPathsById);
  if (contentEntries.length === 0) {
    return [];
  }
  // `?url` makes Vite emit each file as an asset and import only its URL, so
  // no content bytes reach a JavaScript chunk.
  const importLines = contentEntries.map(([, path]) => {
    const rootRelativePath = _makeRootRelativePathFromPath({ path, repoRoot });
    return `        import(${JSON.stringify(`${rootRelativePath}?url`)}),`;
  });
  const urlProperties = contentEntries.map(([contentId], index) => {
    return `${JSON.stringify(contentId)}: urls[${index}].default`;
  });
  return [
    "    loadContentUrls: async () => {",
    "      const urls = await Promise.all([",
    ...importLines,
    "      ]);",
    `      return { ${urlProperties.join(", ")} };`,
    "    },",
  ];
}
```

Add it to the entry, after the `loadCode` lines:

```ts
    ..._makeLoadCodeSourceLinesFromPlugin(options),
    ..._makeLoadContentUrlsSourceLinesFromPlugin(options),
    "  },",
```

Replace the `makeIndexModuleSourceFromPlugins` docstring:

```ts
/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. A plugin with no entry gets a
 * `loadCode` that loads only its locales and returns a definition with no
 * handlers, and a plugin with content gets a `loadContentUrls` that resolves
 * each content id to its file's URL. It must contain no static imports, so
 * the main bundle carries only these few bytes per plugin.
 * `vitePluginAvaPlugins`'s `load` hook calls it.
 */
```

In `src/lib/plugins/PluginIndex.types.ts`, replace `PluginIndexEntry`:

```ts
/** One bundled plugin in `virtual:ava-plugin-index`. */
export type PluginIndexEntry = Readonly<{
  id: string;
  loadManifest: () => Promise<PluginManifestModule>;
  loadCode: () => Promise<PluginCodeModule>;

  /**
   * Present only when the manifest declares content. Resolves each content
   * id to the URL its bundled file is served from, for example to fetch the
   * file when the install wizard imports it. Loading it fetches no content.
   */
  loadContentUrls?: () => Promise<Readonly<Record<string, string>>>;
}>;
```

For a plugin with two content items, the generated entry ends:

```js
    loadContentUrls: async () => {
      const urls = await Promise.all([
        import("/plugins/mozambique/content/mz-adm1.csv?url"),
        import("/plugins/mozambique/content/mz-adm2.csv?url"),
      ]);
      return { "provinces": urls[0].default, "districts": urls[1].default };
    },
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins src/lib/plugins`
Expected: PASS (scripts: 34 tests; `src/lib/plugins`: 33 files, 379 tests)

- [ ] **Step 5: Type check, format, lint**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore $(git status --short | awk '{print $2}')
pnpm exec eslint $(git status --short | awk '{print $2}')
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add scripts/vite-plugin-ava-plugins/makePluginModuleSources src/lib/plugins/PluginIndex.types.ts
git commit -m "feat(plugins): expose bundled content files as lazy asset URLs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The index module counts toward the host byte budget (`\0virtual:ava-plugin-index` is a host marker in `checkPluginBundle.ts`), so the loader is kept short. The `?url` modules themselves resolve under `plugins/`, so `checkPluginBundle` treats them as plugin-only and they must stay reachable only from the index's dynamic imports.
- Content ids allow dots and hyphens, so they are emitted as quoted keys (`JSON.stringify`), never as identifiers.
- Vite inlines assets under 4 KiB as data URLs even with `?url`. That is harmless here (the caller only fetches the URL), and the Mozambique files are far bigger.
- Nothing calls `loadContentUrls` in this task; the content import (Task 17) does, through `PluginIndexEntry`.

---

### Task 6: SDK data slot types, error codes, `Bar`, and `Switch`

**Goal:** The plugin SDK declares the data slot API a command can call (`avandar.data.querySlot`, `avandar.ui.openDataSlotBinding`, `QuerySlotResult`) and its three error codes, and `@avandar/plugin-ui` exports the `Switch` and `Bar` the Case epicurve needs.

**Files:**
- Modify: `packages/web/plugin-sdk/src/PluginError/PluginError.ts` (`PluginErrorCode`)
- Modify: `packages/web/plugin-sdk/src/PluginApi.types.ts` (`QuerySlotResult`, optional `data.querySlot`, optional `ui.openDataSlotBinding`)
- Modify: `packages/web/plugin-sdk/src/index.ts` (export `QuerySlotResult`)
- Modify: `packages/web/plugin-ui/src/index.ts` (`Switch`), `packages/web/plugin-ui/src/charts.ts` (`Bar`)
- Modify: `packages/web/plugin-sdk/README.md`, `packages/web/plugin-ui/README.md` (export tables)

**Depends on:** none.

This task changes types and re-exports only, so it adds no runtime test: `docs/rules/testing.md` ("Do not restate the type system") rules out a test that only proves an export exists or a union accepts a literal. The type checks below are the check. The members are exercised at runtime by Task 19 (`querySlot`, `openDataSlotBinding`, the error codes) and Task 20 (`Bar`, `Switch`).

- [ ] **Step 1: Add the error codes**

In `packages/web/plugin-sdk/src/PluginError/PluginError.ts`, append three bullets to the `PluginErrorCode` docstring, after the `InvalidToolInput` bullet, and widen the union:

```ts
 * - `InvalidToolInput`: an AI tool handler rejected the arguments the model
 *   passed it. The host may show this error's message to the model so it can
 *   correct the call, so write it for the model and keep it free of secrets.
 * - `SlotNotBound`: `avandar.data.querySlot` named a data slot the manifest
 *   declares, but no admin has chosen the records it reads yet.
 * - `SlotBroken`: the data slot's binding no longer fits the slot: its case
 *   type or dataset was deleted, a chosen field is gone or changed type, or
 *   a required attribute has no field. The message names the attribute and
 *   the reason, never a value.
 * - `InvalidSlot`: the call named a data slot id the manifest does not
 *   declare.
 */
export type PluginErrorCode =
  | "PermissionDenied"
  | "InvalidHandle"
  | "LoadFailed"
  | "CommandFailed"
  | "InvalidExpression"
  | "InvalidToolInput"
  | "SlotNotBound"
  | "SlotBroken"
  | "InvalidSlot";
```

- [ ] **Step 2: Type check the union change**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit`
Expected: no errors. No code branches exhaustively on `PluginErrorCode` today (`git grep -n "PluginErrorCode" -- src plugins shared` finds only the SDK export), so widening it breaks nothing.

- [ ] **Step 3: Add the data slot API types**

In `packages/web/plugin-sdk/src/PluginApi.types.ts`, add directly above `/** One computed column for \`avandar.dataExplorer.addColumns\`. */`:

```ts
/**
 * What `avandar.data.querySlot` resolves to: a handle to the records bound to
 * one of the plugin's data slots, with one column per slot attribute, named
 * by its attribute key. A command reads the rows by passing `queryHandle` to
 * `avandar.data.fetchRows`.
 */
export type QuerySlotResult = Readonly<{
  queryHandle: QueryHandle;
  columns: ReadonlyArray<
    Readonly<{ name: string; dataType: PluginColumnDataType }>
  >;
  rowCount: number;
  /** True when the slot holds more records than the host read. */
  isTruncated: boolean;
}>;
```

In `AvandarApi`, add `querySlot` after `fetchRows`:

```ts
  data: Readonly<{
    fetchRows: (
      queryHandle: QueryHandle,
      options: FetchRowsOptions,
    ) => Promise<FetchRowsResult>;
    /**
     * Reads the records an admin bound to one of the plugin's data slots,
     * with the current user's access. Present only for commands. Rejects
     * with a `PluginError`: `InvalidSlot` for a slot id the manifest does
     * not declare, `SlotNotBound` or `SlotBroken` when the slot cannot be
     * read, and `PermissionDenied` when the user cannot read its records.
     */
    querySlot?: (slotId: string) => Promise<QuerySlotResult>;
  }>;
```

and `openDataSlotBinding` after `notify`:

```ts
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
    /**
     * Lets the user choose the records a data slot reads: a settings admin
     * gets the binding form for that slot, and anyone else a message to ask
     * an admin, in the same modal. Resolves once the modal closes. Present
     * only for commands. Rejects with `PluginError("InvalidSlot")` for a
     * slot id the manifest does not declare.
     */
    openDataSlotBinding?: (slotId: string) => Promise<void>;
  }>;
```

In `packages/web/plugin-sdk/src/index.ts`, add `QuerySlotResult` after `QueryHandle` in the `PluginApi.types` type export list.

- [ ] **Step 4: Add `Switch` and `Bar`**

In `packages/web/plugin-ui/src/index.ts`, add `Switch` after `Stack` in the Mantine re-export list:

```ts
  Stack,
  Switch,
  Table,
```

In `packages/web/plugin-ui/src/charts.ts`, add `Bar` first in the Recharts re-export list:

```ts
export {
  Bar,
  CartesianGrid,
```

- [ ] **Step 5: Update the package READMEs**

In `packages/web/plugin-sdk/README.md`, replace the `PluginErrorCode` row and add a `QuerySlotResult` row after `FetchRowsResult`:

```markdown
| `PluginErrorCode` | Type | Why a plugin API call failed: `PermissionDenied`, `InvalidHandle`, `LoadFailed`, `CommandFailed`, `InvalidExpression`, `InvalidToolInput`, `SlotNotBound`, `SlotBroken`, or `InvalidSlot` |
```

```markdown
| `QuerySlotResult` | Type | What `avandar.data.querySlot` returns: a handle to a data slot's bound records, its columns, and its row count |
```

In `packages/web/plugin-ui/README.md`, add `` `Switch` `` after `` `Stack` `` in the Mantine row and `` `Bar` `` first in the Recharts row:

```markdown
| `Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`, `SimpleGrid`, `Stack`, `Switch`, `Table`, `Text`, `TextInput`, `Title` | Components | Re-exported from Mantine with Avandar's theme |
| `Bar`, `CartesianGrid`, `ComposedChart`, `ErrorBar`, `Legend`, `ReferenceLine`, `Scatter`, `Tooltip`, `XAxis`, `YAxis` (from `@avandar/plugin-ui/charts`) | Components | Re-exported from Recharts for plugin chart components |
```

- [ ] **Step 6: Type check and run the existing tests**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit
pnpm exec tsc -p packages/web/plugin-sdk/tsconfig.json --noEmit
pnpm exec tsc -p packages/web/plugin-ui/tsconfig.json --noEmit
pnpm vitest run --config packages/web/plugin-sdk/vitest.config.ts packages/web/plugin-sdk
pnpm vitest run --config packages/web/plugin-ui/vitest.config.ts packages/web/plugin-ui
pnpm vitest run src/lib/plugins/makePluginApi
```
Expected: no type errors (`makePluginApi` still type checks because both new members are optional); SDK PASS (50 tests), plugin-ui PASS (6 tests), `makePluginApi` PASS.

- [ ] **Step 7: Format and lint**

Run:
```bash
pnpm exec oxfmt --ignore-path .oxfmtignore packages/web/plugin-sdk/src packages/web/plugin-ui/src
pnpm exec eslint packages/web/plugin-sdk/src packages/web/plugin-ui/src
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add packages/web/plugin-sdk packages/web/plugin-ui
git commit -m "feat(plugin-sdk): add data slot errors, querySlot types, Bar, and Switch" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The plugin import allowlist (`eslint/plugin-restrictions.js`) lists packages, not components, so `Switch` and `Bar` need no lint change: `@avandar/plugin-ui` and `@avandar/plugin-ui/charts` are already allowed.
- `docs/plugin-authoring.md` also lists the `plugin-ui` components and the error codes; Task 24 updates it, so do not edit it here.
- `@avandar/plugin-ui` is not a host marker in `checkPluginBundle.ts`, and Recharts' `Bar` and Mantine's `Switch` already ship in the app, so neither export adds bytes to the host budget.
- Each `*.md` file is excluded from oxfmt (`.oxfmtignore`), so the README edits are not formatted.

---

### Task 7: Unreadable plugin chart settings show a reset instead of crashing

**Goal:** `PluginVizSettingsForm` checks a stored plugin chart config before it draws any control. A config it cannot read (one that fails `AvaPluginVizConfigSchema`, or holds a value its control cannot show) renders "These chart settings can't be read." with a "Reset chart settings" button that replaces the config with the defaults a new pick of that chart type gets.

**Files:**
- Modify: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers.ts` (`isPluginVizConfigReadable`)
- Create: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/UnreadablePluginVizSettings.tsx`
- Create: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsGroup.tsx` (the ready state, moved out of the form so both stay under 45 lines)
- Modify: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.tsx`
- Test: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx`

**Depends on:** none.

- [ ] **Step 1: Write the failing tests**

In `PluginVizSettingsForm.test.tsx`, add above `it("says the settings are unavailable when the plugin is not bundled", ...)` (the fixture `MANIFEST_MODULE` already declares a `columnPicker`, `segmented`, `select`, `switch`, `number`, `text`, and `color` setting):

```tsx
  it.each([
    ["settings is not a record", { settings: "broken" }],
    ["columnSettings is missing", { columnSettings: undefined }],
    [
      "a column setting names no column of the result",
      { columnSettings: { dateColumn: "dropped-id" } },
    ],
    [
      "a segmented value is not one of its options",
      { settings: { interval: "fortnight" } },
    ],
    [
      "a select value is not one of its options",
      { settings: { palette: "cold" } },
    ],
    ["a switch value is not a boolean", { settings: { showTotals: "yes" } }],
    ["a number value is not a number", { settings: { window: "7" } }],
    ["a text value is not a string", { settings: { note: 5 } }],
    ["a color value is not a string", { settings: { barColor: true } }],
  ])(
    "shows that the settings can't be read instead of the controls when %s",
    async (_label, overrides) => {
      _renderForm({
        ...CONFIG,
        ...overrides,
      } as unknown as AvaVizConfig.Plugin);

      expect(
        await screen.findByText("These chart settings can't be read."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Date column" }),
      ).not.toBeInTheDocument();
    },
  );

  it("draws the controls for a column setting while the result has no columns to check it against", async () => {
    const onConfigChange = vi.fn();
    render(
      <PluginVizSettingsForm
        fields={[]}
        config={{ ...CONFIG, columnSettings: { dateColumn: ONSET_ID } }}
        onConfigChange={onConfigChange}
      />,
      { wrapper: QueryWrapper },
    );

    expect(
      await screen.findByRole("combobox", { name: "Date column" }),
    ).toBeInTheDocument();
  });

  it("resets unreadable settings to the defaults a new pick of the chart type gets", async () => {
    const onConfigChange = _renderForm({
      ...CONFIG,
      settings: { interval: "fortnight" },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Reset chart settings" }),
    );

    expect(onConfigChange).toHaveBeenCalledWith({
      vizType: "plugin",
      pluginId: EPIDEMIOLOGY_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: ONSET_ID },
      settings: { interval: "day" },
    });
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm`
Expected: FAIL, 10 failed | 14 passed. Nine fail with `TestingLibraryElementError: Unable to find an element with the text: These chart settings can't be read.`; the reset test with `Unable to find role="button" and name "Reset chart settings"`. The "columnSettings is missing" case also logs the crash this task fixes: `TypeError: Cannot read properties of undefined (reading 'dateColumn')`.

- [ ] **Step 3: Implement the check**

In `pluginVizSettingFormHelpers.ts`, add the import:

```ts
import { match } from "ts-pattern";
import { AvaPluginVizConfigSchema } from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas";
```

and append to the end of the file:

```ts

function _isStoredSettingReadable(options: {
  setting: PluginVizSetting;
  config: AvaVizConfig.Plugin;
  fieldIds: ReadonlySet<string>;
}): boolean {
  const { setting, config, fieldIds } = options;
  if (setting.control.kind === "columnPicker") {
    const columnId = config.columnSettings[setting.key];
    // While the result's columns load, `fieldIds` is empty and a stored
    // column cannot be checked yet.
    return (
      columnId === undefined || fieldIds.size === 0 || fieldIds.has(columnId)
    );
  }
  const value = config.settings[setting.key];
  if (value === undefined) {
    return true;
  }
  return match(setting.control)
    .with({ kind: "select" }, { kind: "segmented" }, (control) => {
      return control.options.some((option) => {
        return option.value === value;
      });
    })
    .with({ kind: "switch" }, () => {
      return typeof value === "boolean";
    })
    .with({ kind: "number" }, () => {
      return typeof value === "number" && Number.isFinite(value);
    })
    .with({ kind: "text" }, { kind: "color" }, () => {
      return typeof value === "string";
    })
    .exhaustive();
}

/**
 * Whether a stored plugin chart config can be drawn as the settings form for
 * `settings`: it parses as an `AvaPluginVizConfig`, every column setting
 * names one of `fields`, and every other setting holds a value its control
 * can show. Use it before drawing controls from a config that came from
 * storage, for example a dashboard saved by an older build or edited by hand.
 */
export function isPluginVizConfigReadable(options: {
  config: unknown;
  settings: readonly PluginVizSetting[];
  fields: readonly QueryResult.ColumnWithId[];
}): boolean {
  const result = AvaPluginVizConfigSchema.safeParse(options.config);
  if (!result.success) {
    return false;
  }
  const fieldIds = new Set<string>(
    options.fields.map((field) => {
      return field.id;
    }),
  );
  return options.settings.every((setting) => {
    return _isStoredSettingReadable({ setting, config: result.data, fieldIds });
  });
}
```

- [ ] **Step 4: Implement the notice and the settings group**

Create `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/UnreadablePluginVizSettings.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Replaces the stored settings with the chart type's defaults. */
  onReset: () => void;
}>;

/**
 * What `PluginVizSettingsForm` shows in place of its controls when a plugin
 * chart's stored settings cannot be read, so a broken config never crashes
 * the settings panel and the user can start over from the defaults.
 */
export function UnreadablePluginVizSettings({ onReset }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={20} aria-hidden />}
      message={t`These chart settings can't be read.`}
      messageSize="sm"
    >
      <Group>
        <Button size="xs" variant="light" color="warning" onClick={onReset}>
          <Trans>Reset chart settings</Trans>
        </Button>
      </Group>
    </Callout>
  );
}
```

Create `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsGroup.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
import { isPluginVizConfigReadable } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers";
import { UnreadablePluginVizSettings } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/UnreadablePluginVizSettings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;

  /** The plugin's manifest module, whose strings hold the settings' text. */
  manifestModule: PluginManifestModule;

  /** The chart type `config` draws, from the plugin's manifest. */
  vizType: PluginVizType;
  layout: SettingsColumnsLayout;
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;
};

/**
 * The settings group `PluginVizSettingsForm` shows once the chart type's
 * manifest has loaded: one control per setting, or, when the stored config
 * cannot be read, a notice that resets it to the defaults a new pick of the
 * chart type gets. The controls only ever receive a config that parsed.
 */
export function PluginVizSettingsGroup({
  fields,
  config,
  manifestModule,
  vizType,
  layout,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const { settings } = vizType;
  if (!isPluginVizConfigReadable({ config, settings, fields })) {
    const defaultConfig = AvaPluginVizConfigs.makeConfig({
      pluginId: config.pluginId,
      pluginVizId: vizType.id,
      settings,
      columns: fields,
    });
    return (
      <UnreadablePluginVizSettings
        onReset={() => {
          onConfigChange(defaultConfig);
        }}
      />
    );
  }
  return (
    <SettingsColumns
      layout={layout}
      groups={[
        {
          id: "plugin-settings",
          title: t`Chart settings`,
          content: (
            <PluginVizSettingControls
              fields={fields}
              config={config}
              manifestModule={manifestModule}
              settings={settings}
              onConfigChange={onConfigChange}
            />
          ),
        },
      ]}
    />
  );
}
```

In `PluginVizSettingsForm.tsx`, replace the two imports:

```tsx
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
```

with:

```tsx
import { PluginVizSettingsGroup } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsGroup";
```

replace the final `return (<SettingsColumns ... />);` with:

```tsx
  return (
    <PluginVizSettingsGroup
      fields={fields}
      config={config}
      manifestModule={lookup.manifestModule}
      vizType={lookup.vizType}
      layout={layout}
      onConfigChange={onConfigChange}
    />
  );
```

and replace the end of its docstring:

```tsx
 * ID in `columnSettings`, and every other setting in `settings`. A stored
 * config it cannot read shows a notice with a reset to the chart type's
 * defaults instead of the controls. `VizSettingsFormBody` renders it for
 * plugin charts.
 */
```

(The form keeps `useLingui` for its loader's `aria-label`.)

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm src/views/DashboardApp/AvaPage/pfields/VizConfigPField`
Expected: PASS (10 files, 145 tests; the plugin form file alone is 24 tests)

- [ ] **Step 6: Type check, format, lint**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm
pnpm exec eslint src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm
git commit -m "fix(plugins): show a reset instead of crashing on unreadable plugin chart settings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The dashboard settings field passes `columns={authoring.schema?.columns ?? []}`, so `fields` is empty while the chart's query loads. The column check is skipped then, or every saved plugin chart would flash the reset notice on load. A column id that the loaded result no longer has (for example after an SQL edit dropped the column) does read as unreadable, as the spec asks.
- `match(setting.control)` is left untyped on purpose: after the `columnPicker` early return, TypeScript narrows `setting.control`, so `.exhaustive()` needs no `columnPicker` arm.
- Zod 4's `z.number()` already rejects `NaN` and `Infinity`, so the `Number.isFinite` check only matters if the schema is ever loosened.
- `config.pluginId` is safe to reuse for the reset: `usePluginVizType` reached `ready` only because that id found a bundled plugin.
- `Callout` from `@avandar/ui` with `color="warning"` matches the other warnings in the app (`DashboardMapAudienceAlert`). The two strings are Lingui macros; the catalogs are refreshed by the pre-push hook.

---

### Task 8: Mozambique boundary data script and CSVs

**Design note:** the script reads geoBoundaries' **gbHumanitarian** release (`https://www.geoboundaries.org/api/current/gbHumanitarian/MOZ/ADM1/` and `/ADM2/`), not gbOpen, and the data's license is **CC BY 3.0 IGO**, not CC BY 4.0. Checked against the live API on 2026-11-11:

| | gbOpen | gbHumanitarian |
| --- | --- | --- |
| ADM1 source and license | OpenStreetMap (Wambacher), **ODbL 1.0** (share-alike) | INE and OCHA ROSEA, CC BY 3.0 IGO |
| ADM2 source and license | INE and OCHA ROSEA, CC BY 3.0 IGO | INE and OCHA ROSEA, CC BY 3.0 IGO |
| Provinces | 10 (no Maputo City) | 11 (Maputo City included) |
| Every district inside one province | **No**: Ibo (an island district) lies in none, so the spec's own check fails the run | Yes, all 159 |
| `shapeISO` on provinces | `MZ-P` and so on | empty, so `province_code` falls back to `shapeID` |

Running this script against gbOpen exits 1 with `district "Ibo" (85939544B72266919853878) lies in no province`. gbHumanitarian takes both levels from one source, so they nest exactly, and it has a single attribution-only license.

**Goal:** `scripts/plugins/buildMozambiqueBoundaries.ts` downloads the two Mozambique boundary levels, assigns each district its province, simplifies each layer only as far as needed to stay under the 1 MiB content limit, and writes `plugins/mozambique/content/mz-adm1.csv` and `mz-adm2.csv` (WKT geometry, EPSG:4326, sorted by code). The generated CSVs are committed.

**Files:**
- Create: `scripts/plugins/mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers.ts` (pure steps)
- Create: `scripts/plugins/mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers.test.ts`
- Create: `scripts/plugins/buildMozambiqueBoundaries.ts` (the script: network, DuckDB, files)
- Create (generated): `plugins/mozambique/content/mz-adm1.csv`, `plugins/mozambique/content/mz-adm2.csv`

**Depends on:** Task 3 (`MAX_CONTENT_FILE_BYTES` from `@avandar/plugin-manifest`).

- [ ] **Step 1: Write the failing helper tests**

Create `scripts/plugins/mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  findSimplifyToleranceUnderLimit,
  getProblemsFromBoundaries,
  makeCsvTextFromRows,
  makeToleranceLadder,
} from "./mozambiqueBoundaryHelpers";

describe("makeToleranceLadder", () => {
  it("starts at no simplification and climbs by one step up to the maximum", () => {
    expect(
      makeToleranceLadder({ stepDegrees: 0.00025, maxDegrees: 0.001 }),
    ).toEqual([0, 0.00025, 0.0005, 0.00075, 0.001]);
  });
});

describe("findSimplifyToleranceUnderLimit", () => {
  it("returns the first tolerance whose CSV is under the limit without trying later ones", async () => {
    const sizesByTolerance = new Map([
      [0, 12],
      [1, 8],
      [2, 4],
    ]);
    const makeCsvText = vi.fn((tolerance: number) => {
      return Promise.resolve("x".repeat(sizesByTolerance.get(tolerance) ?? 0));
    });

    const found = await findSimplifyToleranceUnderLimit({
      tolerances: [0, 1, 2],
      limitBytes: 10,
      makeCsvText,
    });

    expect(found).toEqual({
      tolerance: 1,
      csvText: "x".repeat(8),
      byteSize: 8,
    });
    expect(makeCsvText).toHaveBeenCalledTimes(2);
  });

  it("measures UTF-8 bytes, not characters", async () => {
    const found = await findSimplifyToleranceUnderLimit({
      tolerances: [0, 1],
      limitBytes: 4,
      makeCsvText: (tolerance) => {
        // "é" is two bytes, so two of them are four bytes, not two.
        return Promise.resolve(tolerance === 0 ? "éé" : "é");
      },
    });

    expect(found.tolerance).toBe(1);
  });

  it("names the size at the last tolerance when no tolerance fits", async () => {
    await expect(
      findSimplifyToleranceUnderLimit({
        tolerances: [0, 1],
        limitBytes: 2,
        makeCsvText: (tolerance) => {
          return Promise.resolve(tolerance === 0 ? "xxxx" : "xxx");
        },
      }),
    ).rejects.toThrow(
      "Even at 1 degrees, the largest tolerance, the file is 3 bytes, not under 2.",
    );
  });
});

describe("makeCsvTextFromRows", () => {
  it("quotes only the fields that hold a comma, a quote, or a line break", () => {
    expect(
      makeCsvTextFromRows({
        header: ["code", "name", "geometry"],
        rows: [["MZ-P", 'Cabo "Delgado"', "POLYGON ((1 2, 3 4, 1 2))"]],
      }),
    ).toBe(
      'code,name,geometry\nMZ-P,"Cabo ""Delgado""","POLYGON ((1 2, 3 4, 1 2))"\n',
    );
  });
});

describe("getProblemsFromBoundaries", () => {
  it("finds nothing wrong when every code is unique and every district has a province", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1", "P2"],
        districts: [
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
          { code: "D2", name: "Ibo", provinceCode: "P2" },
        ],
      }),
    ).toEqual([]);
  });

  it("reports a district that lies in no province", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1"],
        districts: [{ code: "D2", name: "Ibo", provinceCode: undefined }],
      }),
    ).toEqual(['district "Ibo" (D2) lies in no province']);
  });

  it("reports a province code and a district code that repeat", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1", "P1"],
        districts: [
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
        ],
      }),
    ).toEqual([
      'province code "P1" is not unique',
      'district code "D1" is not unique',
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run scripts/plugins`
Expected: FAIL, `Error: Failed to resolve import "./mozambiqueBoundaryHelpers" from "scripts/plugins/mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers.test.ts". Does the file exist?`

- [ ] **Step 3: Implement the helpers**

Create `scripts/plugins/mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers.ts`:

```ts
/*
 * The pure steps of `buildMozambiqueBoundaries`: the simplification
 * tolerances it tries, the search for the first one that fits a file under
 * the content size limit, the CSV text it writes, and the checks it runs on
 * the boundaries before writing anything.
 */

/** The CSV text written at one tolerance, and its size in UTF-8 bytes. */
type SimplifiedCsv = { tolerance: number; csvText: string; byteSize: number };

/** A district as the boundary checks see it. */
type DistrictCodes = Readonly<{
  code: string;
  name: string;
  provinceCode: string | undefined;
}>;

/**
 * Makes the simplification tolerances, in degrees, to try in order: none
 * first, then one `stepDegrees` more each time, up to `maxDegrees`. Rounded,
 * so the steps print as written rather than as float noise.
 */
export function makeToleranceLadder(options: {
  stepDegrees: number;
  maxDegrees: number;
}): number[] {
  const { stepDegrees, maxDegrees } = options;
  const stepCount = Math.round(maxDegrees / stepDegrees);
  return Array.from({ length: stepCount + 1 }, (_value, index) => {
    return Number((index * stepDegrees).toFixed(10));
  });
}

/**
 * Finds the first tolerance whose CSV text is under `limitBytes` UTF-8 bytes,
 * trying each in order and stopping at the first that fits. Throws, naming
 * the size at the last tolerance, when none fits.
 */
export async function findSimplifyToleranceUnderLimit(options: {
  tolerances: readonly number[];
  limitBytes: number;
  makeCsvText: (tolerance: number) => Promise<string>;
}): Promise<SimplifiedCsv> {
  const { tolerances, limitBytes, makeCsvText } = options;
  const tryFrom = async (index: number): Promise<SimplifiedCsv> => {
    const tolerance = tolerances[index];
    if (tolerance === undefined) {
      throw new Error("No tolerances to try.");
    }
    const csvText = await makeCsvText(tolerance);
    const byteSize = Buffer.byteLength(csvText, "utf8");
    if (byteSize < limitBytes) {
      return { tolerance, csvText, byteSize };
    }
    if (index === tolerances.length - 1) {
      throw new Error(
        `Even at ${tolerance} degrees, the largest tolerance, the file is ${byteSize} bytes, not under ${limitBytes}.`,
      );
    }
    return tryFrom(index + 1);
  };
  return tryFrom(0);
}

function _quoteCsvField(field: string): string {
  return /[",\n\r]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/**
 * Makes RFC 4180 CSV text from a header and rows, quoting only the fields
 * that need it (a WKT geometry always does, for its commas). Ends with a
 * line break.
 */
export function makeCsvTextFromRows(options: {
  header: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}): string {
  return [options.header, ...options.rows]
    .map((row) => {
      return row.map(_quoteCsvField).join(",");
    })
    .join("\n")
    .concat("\n");
}

function _getRepeatedValues(values: readonly string[]): string[] {
  return [
    ...new Set(
      values.filter((value, index) => {
        return values.indexOf(value) !== index;
      }),
    ),
  ];
}

/**
 * Gets every reason the boundaries cannot be written: a province or district
 * code that repeats, and a district whose point on surface lies in no
 * province. Empty when the boundaries are consistent.
 */
export function getProblemsFromBoundaries(options: {
  provinceCodes: readonly string[];
  districts: readonly DistrictCodes[];
}): string[] {
  const { provinceCodes, districts } = options;
  const districtCodes = districts.map((district) => {
    return district.code;
  });
  return [
    ..._getRepeatedValues(provinceCodes).map((code) => {
      return `province code "${code}" is not unique`;
    }),
    ..._getRepeatedValues(districtCodes).map((code) => {
      return `district code "${code}" is not unique`;
    }),
    ...districts
      .filter((district) => {
        return district.provinceCode === undefined;
      })
      .map((district) => {
        return `district "${district.name}" (${district.code}) lies in no province`;
      }),
  ];
}
```

- [ ] **Step 4: Run the helper tests and confirm they pass**

Run: `pnpm vitest run scripts/plugins`
Expected: PASS (8 tests)

- [ ] **Step 5: Write the script**

Create `scripts/plugins/buildMozambiqueBoundaries.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_CONTENT_FILE_BYTES } from "@avandar/plugin-manifest";
import { DuckDBInstance } from "@duckdb/node-api";
import { z } from "zod";
import {
  findSimplifyToleranceUnderLimit,
  getProblemsFromBoundaries,
  makeCsvTextFromRows,
  makeToleranceLadder,
} from "./mozambiqueBoundaryHelpers/mozambiqueBoundaryHelpers";
import type { DuckDBConnection } from "@duckdb/node-api";

const GEOBOUNDARIES_API_URL =
  "https://www.geoboundaries.org/api/current/gbHumanitarian/MOZ";
const CONTENT_DIRECTORY = "plugins/mozambique/content";

// About a meter at the equator. Boundary maps need no finer coordinates,
// and rounding roughly halves the WKT.
const COORDINATE_GRID_DEGREES = 0.00001;
const TOLERANCES = makeToleranceLadder({
  stepDegrees: 0.00025,
  maxDegrees: 0.01,
});

const BoundaryReleaseSchema = z.object({
  boundaryID: z.string(),
  boundarySource: z.string(),
  boundaryLicense: z.string(),
  simplifiedGeometryGeoJSON: z.url(),
});

type BoundaryRelease = z.infer<typeof BoundaryReleaseSchema>;

type BoundaryLayer = Readonly<{
  label: string;
  table: "provinces" | "districts";
  fileName: string;
  columns: readonly string[];
}>;

const PROVINCE_LAYER: BoundaryLayer = {
  label: "Provinces",
  table: "provinces",
  fileName: "mz-adm1.csv",
  columns: ["province_code", "province_name"],
};

const DISTRICT_LAYER: BoundaryLayer = {
  label: "Districts",
  table: "districts",
  fileName: "mz-adm2.csv",
  columns: ["district_code", "district_name", "province_code", "province_name"],
};

async function _fetchBoundaryRelease(
  level: "ADM1" | "ADM2",
): Promise<BoundaryRelease> {
  const response = await fetch(`${GEOBOUNDARIES_API_URL}/${level}/`);
  if (!response.ok) {
    throw new Error(`geoBoundaries ${level} answered ${response.status}.`);
  }
  return BoundaryReleaseSchema.parse(await response.json());
}

async function _downloadGeoJson(options: {
  release: BoundaryRelease;
  path: string;
}): Promise<void> {
  const url = options.release.simplifiedGeometryGeoJSON;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}.`);
  }
  writeFileSync(options.path, Buffer.from(await response.arrayBuffer()));
}

function _quoteSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

// A district's province is the one holding its point on surface, found on
// the downloaded shapes before any simplification moves a border.
async function _loadBoundaries(options: {
  connection: DuckDBConnection;
  provincesPath: string;
  districtsPath: string;
}): Promise<void> {
  const { connection, provincesPath, districtsPath } = options;
  await connection.run(`
    CREATE TABLE provinces AS
    SELECT
      COALESCE(NULLIF(trim(shapeISO), ''), shapeID) AS province_code,
      trim(shapeName) AS province_name,
      geom
    FROM ST_Read(${_quoteSqlString(provincesPath)})
  `);
  await connection.run(`
    CREATE TABLE districts AS
    SELECT
      district.shapeID AS district_code,
      trim(district.shapeName) AS district_name,
      province.province_code,
      province.province_name,
      district.geom
    FROM ST_Read(${_quoteSqlString(districtsPath)}) AS district
    LEFT JOIN provinces AS province
      ON ST_Contains(province.geom, ST_PointOnSurface(district.geom))
  `);
}

async function _readStringRows(options: {
  connection: DuckDBConnection;
  sql: string;
}): Promise<Array<Array<string | undefined>>> {
  const reader = await options.connection.runAndReadAll(options.sql);
  return reader.getRowsJS().map((row) => {
    return row.map((value) => {
      return value === null ? undefined : String(value);
    });
  });
}

async function _assertBoundariesAreConsistent(
  connection: DuckDBConnection,
): Promise<void> {
  const provinceRows = await _readStringRows({
    connection,
    sql: "SELECT province_code FROM provinces",
  });
  const districtRows = await _readStringRows({
    connection,
    sql: "SELECT district_code, district_name, province_code FROM districts",
  });
  const problems = getProblemsFromBoundaries({
    provinceCodes: provinceRows.map(([code]) => {
      return code ?? "";
    }),
    districts: districtRows.map(([code, name, provinceCode]) => {
      return { code: code ?? "", name: name ?? "", provinceCode };
    }),
  });
  if (problems.length > 0) {
    throw new Error(`The boundaries are inconsistent:\n${problems.join("\n")}`);
  }
}

async function _makeLayerCsvText(options: {
  connection: DuckDBConnection;
  layer: BoundaryLayer;
  tolerance: number;
}): Promise<string> {
  const { connection, layer, tolerance } = options;
  const geometrySql = `ST_AsText(ST_ReducePrecision(ST_SimplifyPreserveTopology(geom, ${tolerance}), ${COORDINATE_GRID_DEGREES}))`;
  // `ORDER BY 1` sorts by the layer's first column, its code.
  const rows = await _readStringRows({
    connection,
    sql: `SELECT ${layer.columns.join(", ")}, ${geometrySql} AS geometry FROM ${layer.table} ORDER BY 1`,
  });
  return makeCsvTextFromRows({
    header: [...layer.columns, "geometry"],
    rows: rows.map((row) => {
      return row.map((value) => {
        return value ?? "";
      });
    }),
  });
}

async function _writeLayer(options: {
  connection: DuckDBConnection;
  layer: BoundaryLayer;
  repoRoot: string;
}): Promise<void> {
  const { connection, layer, repoRoot } = options;
  const found = await findSimplifyToleranceUnderLimit({
    tolerances: TOLERANCES,
    limitBytes: MAX_CONTENT_FILE_BYTES,
    makeCsvText: (tolerance) => {
      return _makeLayerCsvText({ connection, layer, tolerance });
    },
  });
  writeFileSync(
    join(repoRoot, CONTENT_DIRECTORY, layer.fileName),
    found.csvText,
  );
  // The header line is the only line that is not a feature.
  const featureCount = found.csvText.trimEnd().split("\n").length - 1;
  console.log(
    `${layer.label}: ${featureCount} features, ${layer.fileName} ${found.byteSize} bytes, tolerance ${found.tolerance} degrees`,
  );
}

async function _downloadRelease(options: {
  level: "ADM1" | "ADM2";
  path: string;
}): Promise<void> {
  const release = await _fetchBoundaryRelease(options.level);
  console.log(
    `${release.boundaryID}: ${release.boundaryLicense}. Source: ${release.boundarySource}`,
  );
  await _downloadGeoJson({ release, path: options.path });
}

async function _buildBoundaries(options: {
  connection: DuckDBConnection;
  workDirectory: string;
  repoRoot: string;
}): Promise<void> {
  const { connection, workDirectory, repoRoot } = options;
  const provincesPath = join(workDirectory, "adm1.geojson");
  const districtsPath = join(workDirectory, "adm2.geojson");
  await _downloadRelease({ level: "ADM1", path: provincesPath });
  await _downloadRelease({ level: "ADM2", path: districtsPath });
  await connection.run("INSTALL spatial; LOAD spatial;");
  await _loadBoundaries({ connection, provincesPath, districtsPath });
  await _assertBoundariesAreConsistent(connection);
  mkdirSync(join(repoRoot, CONTENT_DIRECTORY), { recursive: true });
  await _writeLayer({ connection, layer: PROVINCE_LAYER, repoRoot });
  await _writeLayer({ connection, layer: DISTRICT_LAYER, repoRoot });
}

/**
 * Rebuilds `plugins/mozambique/content/mz-adm1.csv` (provinces) and
 * `mz-adm2.csv` (districts) from geoBoundaries' humanitarian release of
 * Mozambique, which takes both levels from the same INE and OCHA source, so
 * every district lies inside exactly one province. Each file is simplified
 * only as far as it takes to stay under the plugin content size limit, and
 * the script prints each release's license, feature counts, and file sizes.
 * Run it with `pnpm vite-script scripts/plugins/buildMozambiqueBoundaries.ts`.
 */
async function main(): Promise<void> {
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const workDirectory = mkdtempSync(join(tmpdir(), "mozambique-boundaries-"));
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    await _buildBoundaries({ connection, workDirectory, repoRoot });
  } finally {
    connection.closeSync();
    instance.closeSync();
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

void main();
```

- [ ] **Step 6: Run the script**

Run: `pnpm vite-script scripts/plugins/buildMozambiqueBoundaries.ts`
Expected (about 3 seconds; needs network for geoBoundaries and GitHub, and for DuckDB's first `INSTALL spatial`):

```text
MOZ-ADM1-67129600: Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO). Source: Mozambique INE (Instituto Nacional de Estatistica)   http//www.ine.gov.mz/  Census 2007 data from  WFP Geonode,  cleaned by UN OCHA ROSEA.  Maputo City districts added from SALB boundaries by OCHA., HDX
MOZ-ADM2-81135715: Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO). Source: Mozambique INE (Instituto Nacional de Estatistica)   http//www.ine.gov.mz/  Census 2007 data from  WFP Geonode,  cleaned by UN OCHA ROSEA.  Maputo City districts added from SALB boundaries by OCHA., HDX
Provinces: 11 features, mz-adm1.csv 336346 bytes, tolerance 0 degrees
Districts: 159 features, mz-adm2.csv 907996 bytes, tolerance 0.00125 degrees
```

and, from the repository root:

```bash
shasum plugins/mozambique/content/*.csv
```

```text
dce4b61b745ebb668dcfd736f2bc2c6097d97665  plugins/mozambique/content/mz-adm1.csv
7c0e0c677de43ee5f6c9d461b3ccf58ffe3dfbd0  plugins/mozambique/content/mz-adm2.csv
```

The run is deterministic: running it twice gives the same bytes. If geoBoundaries has published a newer release (the `MOZ-ADM*` ids differ), the counts, sizes, and hashes can differ; that is fine as long as both files are under 1048576 bytes and the run exits 0.

The files start:

```text
province_code,province_name,geometry
67129600B11805465621324,Cabo Delgado,"MULTIPOLYGON (((38.39771 -14.12917, ...
```

```text
district_code,district_name,province_code,province_name,geometry
81135715B10150876636106,Chemba,67129600B71394528023259,Sofala,"POLYGON ((34.21055 -17.24208, ...
```

- [ ] **Step 7: Type check, format, lint**

Run:
```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore scripts/plugins
pnpm exec eslint scripts/plugins
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add scripts/plugins plugins/mozambique/content
git commit -m "feat(plugins): build Mozambique province and district boundaries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `pnpm vite-script` runs `vite-node --config ./vite.script.config.ts`, which handles `@duckdb/node-api` (a root dev dependency) and resolves `@avandar/plugin-manifest` from the workspace.
- `province_code` uses `shapeISO` when present, else `shapeID`; gbHumanitarian has no `shapeISO`, so province codes are geoBoundaries ids such as `67129600B11805465621324`. `district_code` is always `shapeID`. Names are kept as geoBoundaries spells them (`Zambezia`, `Maputo City`).
- The province of a district is found with `ST_Contains(province, ST_PointOnSurface(district))` on the downloaded shapes, before any simplification, so a simplified border cannot move a district into the wrong province.
- `ST_ReducePrecision(..., 0.00001)` rounds coordinates to about a meter. Without it the district file is 1.57 MB at no simplification; with it, 1.12 MB, and the ladder stops at 0.00125 degrees (about 140 m).
- The tolerance search and CSV writing are in the helpers so they can be tested without network or DuckDB; the script only wires them to DuckDB and the file system. The two layers are written one after the other because they share one DuckDB connection.
- The helpers file holds a group of helpers with no main export, so a file-level comment is allowed there (`docs/rules/typescript.md`).
- Until Task 9 adds `ava.yaml` and `package.json`, `plugins/mozambique/` holds only `content/`. pnpm ignores a folder without `package.json`, and `plugins/bundled.yaml` does not list it yet, so nothing reads it.

---

### Task 9: The Mozambique pack

**Design note:** the pack's license is `CC-BY-3.0-IGO` and its descriptions credit Mozambique's INE and UN OCHA ROSEA through geoBoundaries (gbHumanitarian) under CC BY 3.0 IGO, not CC BY 4.0; see Task 8 for why the source changed. `ava.yaml`'s `license` and `package.json`'s `license` both name the data's license, because the pack ships nothing but that data.

**Design note (bundle check):** `pnpm check:plugin-bundle` already fails on the base commit `e8369a89c`, before any slice 1d change, on the budget line only: `The plugin host adds 58991 bytes ... over its 39600 byte budget.` The "~324 bytes of headroom" in the 1b handoff dates from slice 1b; slice 1c's chat path dynamically imports `makePluginApi` (`runDataAgentTurn.ts`), which is not one of the lazy runtime markers, so `makePluginApi` and the derived-column code now count. Tasks 2 to 8 add 0 bytes (58,991 before and after). This task therefore proves what it can prove: no `plugins/mozambique` module lands in an app chunk. Task 24 restores the check; the numbers are in the notes.

**Goal:** `plugins/mozambique/` is a bundled plugin with no code that offers the two boundary files from Task 8 as content. It validates with `ava plugin validate`, installs into the workspace with a hand-written lockfile importer, and its content files ship as lazy assets.

**Files:**
- Create: `plugins/mozambique/ava.yaml`
- Create: `plugins/mozambique/locales/en.json`
- Create: `plugins/mozambique/package.json`
- Modify: `plugins/bundled.yaml` (list `mozambique`)
- Modify: `pnpm-lock.yaml` (importer `plugins/mozambique: {}`)

**Depends on:** Task 3 (optional `entry`, `contributes.content`, content file checks, the no-code `ava plugin validate` path), Task 5 (`loadContentUrls`), Task 8 (`plugins/mozambique/content/*.csv`).

There is no unit test to write: every rule this pack must satisfy is already tested in Tasks 3 and 5, and `ava plugin validate` runs those rules against the real folder. The validate commands below are the red/green check: they fail until all three files exist and match.

- [ ] **Step 1: Confirm the folder does not validate yet**

Run:
```bash
pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs plugin validate mozambique
```
Expected: FAIL, `❌ plugins/mozambique failed validation:` with `ava.yaml not found`, and `1 plugin failed validation.`

- [ ] **Step 2: Create the manifest**

Create `plugins/mozambique/ava.yaml`:

```yaml
# The Mozambique pack: province and district boundaries, imported as
# datasets. It has no code, so it declares no entry and no permissions.
# scripts/plugins/buildMozambiqueBoundaries.ts rebuilds the content files.
id: avandar.mozambique
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: CC-BY-3.0-IGO
engines:
  avandar: "^1"
icon: map
contributes:
  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/mz-adm1.csv
    - id: districts
      kind: dataset
      title: "%content.districts.title%"
      description: "%content.districts.description%"
      file: content/mz-adm2.csv
```

Create `plugins/mozambique/locales/en.json` (the titles become the imported datasets' names, and the descriptions their descriptions, so they carry the license credit):

```json
{
  "plugin.name": "Mozambique",
  "plugin.description": "Province and district boundaries of Mozambique, ready to use as map boundaries.",
  "content.provinces.title": "Mozambique provinces",
  "content.provinces.description": "The 11 provinces of Mozambique, including Maputo City, with their boundaries as WKT. Source: Mozambique INE and UN OCHA ROSEA, through geoBoundaries (gbHumanitarian). License: CC BY 3.0 IGO. Boundaries simplified for maps.",
  "content.districts.title": "Mozambique districts",
  "content.districts.description": "The 159 districts of Mozambique and the province each lies in, with their boundaries as WKT. Source: Mozambique INE and UN OCHA ROSEA, through geoBoundaries (gbHumanitarian). License: CC BY 3.0 IGO. Boundaries simplified for maps."
}
```

Create `plugins/mozambique/package.json` (no dependencies; `private: true` is required by `scripts/verify-packages.sh` for every `plugins/*` package):

```json
{
  "name": "@avandar-plugins/mozambique",
  "version": "0.1.0",
  "private": true,
  "license": "CC-BY-3.0-IGO",
  "type": "module"
}
```

- [ ] **Step 3: Validate the pack**

Run: `node apps/ava-cli/dist/main.cjs plugin validate mozambique`
Expected:

```text
🔎 Validating plugins/mozambique...
  Checking ava.yaml, locales, icons, content, and dependencies...
  No plugin code, skipping tsc and eslint.
✅ plugins/mozambique is valid.
```

- [ ] **Step 4: Bundle it and add its lockfile importer**

In `plugins/bundled.yaml`, add `mozambique` after `epidemiology`:

```yaml
plugins:
  - epidemiology
  - mozambique
```

In `pnpm-lock.yaml`, add the importer by hand after the `plugins/epidemiology` importer block, just before the top-level `packages:` key (never run `pnpm add`):

```yaml
      simple-statistics:
        specifier: ^7.8.8
        version: 7.12.1

  plugins/mozambique: {}

packages:
```

Run: `pnpm install --frozen-lockfile`
Expected: `Done in ...` with no `ERR_PNPM_OUTDATED_LOCKFILE`. (The `Failed to create bin ... arrow2csv` warning and the "Ignored build scripts" box are pre-existing.) `git status --short` shows no change beyond the files of this task.

- [ ] **Step 5: Validate every bundled plugin**

Run: `node apps/ava-cli/dist/main.cjs plugin validate`
Expected:

```text
🔎 Validating plugins/epidemiology...
  Checking ava.yaml, locales, icons, content, and dependencies...
  Running tsc...
  Running eslint...
✅ plugins/epidemiology is valid.
🔎 Validating plugins/mozambique...
  Checking ava.yaml, locales, icons, content, and dependencies...
  No plugin code, skipping tsc and eslint.
✅ plugins/mozambique is valid.
```

- [ ] **Step 6: Run the bundle check**

Run (about 40 seconds; writes to `node_modules/.tmp/plugin-bundle-check`):
```bash
pnpm check:plugin-bundle > node_modules/.tmp/plugin-bundle-check.txt 2>&1; echo "exit=$?"
grep -E "Plugin bundle check failed|plugin host adds|is in " node_modules/.tmp/plugin-bundle-check.txt
grep -c "plugins/mozambique" node_modules/.tmp/plugin-bundle-check.txt
```
Expected, until Task 24 restores the check (the budget line already fails before this slice):

```text
exit=1
[ava-plugins] [plugin ava-plugins] Plugin bundle check failed:
The plugin host adds 59814 bytes to chunks the app can load without any plugin, over its 40200 byte budget.
0
```

The only failure is the budget line, and no line names a `plugins/mozambique` module: the content `?url` modules and the manifest and locales chunks are all plugin-only. If a line such as `plugins/mozambique/content/mz-adm1.csv?url is in assets/....js, which the app can load without any plugin` appears, the content loader leaked into an app chunk; that is a real failure to fix in `makePluginModuleSources.ts`.

To see the emitted assets, a plain build (no check) writes them:

```bash
pnpm exec vite build --outDir node_modules/.tmp/plugin-bundle-inspect > /dev/null 2>&1
ls node_modules/.tmp/plugin-bundle-inspect/assets | grep mz-adm
rm -rf node_modules/.tmp/plugin-bundle-inspect
```

Expected: two `.csv` assets (336346 and 907996 bytes) and two 61-byte `.js` modules of the form `const s="/assets/mz-adm1-<hash>.csv";export{s as default};`.

- [ ] **Step 7: Run the tests that read bundled plugins**

Run:
```bash
pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest
pnpm vitest run eslint scripts/vite-plugin-ava-plugins
```
Expected: PASS (manifest package: 214 tests; eslint and vite plugin: 5 files, 73 tests)

- [ ] **Step 8: Commit**

```bash
git add plugins/mozambique plugins/bundled.yaml pnpm-lock.yaml
git commit -m "feat(plugins): add the Mozambique boundaries pack" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `icon: map` resolves to `IconMap.mjs` in `@tabler/icons-react`, which `readPluginDirectory` checks by exact file name.
- The pack has no `tsconfig.json` and no `src/`, so `tsc` and `eslint` have nothing to check; `ava plugin validate` skips them (Task 3). `pnpm exec eslint plugins/mozambique` only reports that no file matched.
- Measured host bytes (from the budget line, `node_modules/.tmp` build): base `e8369a89c` 58,991; after Tasks 2 to 8, 58,991; after this task, 59,814. The Mozambique index entry costs 823 bytes: 445 for `id`, `loadManifest`, and the no-code `loadCode`, and 378 for `loadContentUrls`. Each bundled plugin raises the budget by `PER_PLUGIN_BUDGET_BYTES` (600).
- Treating the chat's lazy imports as runtimes would not close the gap by itself: adding `runPluginAiTool.ts` and `makePluginApi.tsx` to `LAZY_RUNTIME_MODULE_MARKERS` measured 43,499 bytes, still over 39,600. The 1b plan's rule for a budget-only failure was "set `HOST_BUDGET_BYTES` to N minus 600 per bundled plugin, rounded up to the next 1,000, plus 2,000"; with N = 59,814 and two plugins that is 61,000.
- The imported datasets get their name and description from the installing user's locale through these strings, so keep the license credit in every locale's description if one is added later.
- Do not run `pnpm add` or plain `pnpm install`: either can rewrite `pnpm-workspace.yaml` and the lockfile. `--frozen-lockfile` only confirms the hand edit.

---

### Task 10: Database schema for data slot bindings, content imports, and the install RPCs

**Design note:** three small ones, all inside this task.
1. `plugin_content_imports` keeps its dataset in its own workspace with a
   composite foreign key `(dataset_id, workspace_id) references
   datasets (id, workspace_id) on delete cascade` (the pattern
   `datasets__postgres_table` already uses, against the existing
   `datasets__id_workspace_id_key`), not a trigger. Postgres enforces it with
   no function to maintain, and the same key deletes the row with its
   dataset. A cross-workspace dataset fails with `23503`, not `23514`.
2. No separate index on `plugin_data_slot_bindings.installation_id`: the
   unique `(installation_id, slot_id)` constraint's index already leads with
   it.
3. `rpc_plugin_data_slot_bindings__save` keeps the parameter order the spec lists but
   gives `p_concept_id` and `p_dataset_id` a `default null` and
   `p_attribute_map` a `default '{}'`. Supabase only generates an optional
   (`?:`) argument type for a parameter with a default, and the client passes
   `undefined` for the source it does not use.

**Goal:** Add the `plugin_data_slot_bindings` and `plugin_content_imports`
tables, the `plugin_data_slot_bindings__source_type` enum, and the
`rpc_plugin_installations__install` and `rpc_plugin_data_slot_bindings__save`
RPCs, generate their migration and types, and keep both tables out of the
desktop SQLite mirror.

**Files:**
- Create: `supabase/schemas/00.enum.plugin_data_slot_bindings__source_type.sql`
- Create: `supabase/schemas/11.plugin_data_slot_bindings.sql`
- Create: `supabase/schemas/11.plugin_content_imports.sql`
- Create: `supabase/schemas/50.rpc_plugin_installations__install.sql`
- Create: `supabase/schemas/50.rpc_plugin_data_slot_bindings__save.sql`
- Create: `supabase/migrations/<timestamp>_add_plugin_data_slots.sql` (generated)
- Create: `apps/desktop/migrations/<timestamp>_add_plugin_data_slots.gen.sql` (generated)
- Modify: `shared/types/database.types.ts` (generated)
- Modify: `apps/desktop/sync/syncable-tables.ts` (exclude both new tables)
- Test: `apps/desktop/sync/syncable-tables.test.ts`

**Depends on:** Task 1 (the branch runs on its own switched local Supabase
stack). Load the `supabase-declarative-schema` skill before this task.

- [ ] **Step 1: Confirm the branch is on its own Supabase stack**

Run:

```bash
test -f apps/ava-cli/dist/main.cjs || pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs supabase status
```

Expected: the first line says this branch is on a switched local Supabase
database and names this branch's own project (`feat-plugins-slots`). If it
instead says `This is the develop local Supabase`, STOP: do not run any
`pnpm db:*`, `supabase *`, or `pnpm test:db` command. Report back to the
orchestrator (Task 1 owns the switch).

- [ ] **Step 2: Write the failing desktop exclusion test**

In `apps/desktop/sync/syncable-tables.test.ts`, add this test directly above
`it("isSyncable returns false for excluded tables", ...)`:

```ts
  it("keeps plugin data slot bindings and content imports out of the desktop mirror", () => {
    expect(isExcluded("plugin_data_slot_bindings")).toBe(true);
    expect(isExcluded("plugin_content_imports")).toBe(true);
  });
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm --dir apps/desktop exec vitest run -c vitest.config.ts sync/syncable-tables.test.ts`
Expected: FAIL, `× syncable-tables manifest > keeps plugin data slot bindings and content imports out of the desktop mirror` with `→ expected false to be true // Object.is equality`. The other 8 tests pass.

- [ ] **Step 4: Exclude both tables from the desktop mirror**

In `apps/desktop/sync/syncable-tables.ts`, inside `EXCLUDED_TABLES`, replace:

```ts
  // Plugin installs are not mirrored to desktop SQLite yet.
  "plugin_installations",
```

with:

```ts
  // Plugin installs, their data slot bindings, and the content they imported
  // are not mirrored to desktop SQLite yet.
  "plugin_installations",
  "plugin_data_slot_bindings",
  "plugin_content_imports",
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `pnpm --dir apps/desktop exec vitest run -c vitest.config.ts sync/syncable-tables.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Write the declarative schema**

Create these five files exactly.

`supabase/schemas/00.enum.plugin_data_slot_bindings__source_type.sql`:

```sql
/**
 * What kind of workspace record a plugin's data slot reads.
 *
 * Enum values:
 *
 * `concept` - A case type, read through its `concept_<id>` view.
 *
 * `dataset` - A dataset, read through its own relation.
 *
 * Note: Keep new values at the end. Moving one is not a rename, it forces a
 * full rebuild of the type and a rewrite of every column using it.
 */
create type public.plugin_data_slot_bindings__source_type as enum('concept', 'dataset');
```

`supabase/schemas/11.plugin_data_slot_bindings.sql`:

```sql
/**
 * Which workspace records one installed plugin's data slot reads: a case
 * type or a dataset, and which of its fields fills each slot attribute. The
 * install wizard and the plugin card in Settings write it. A plugin command
 * reads through it with `avandar.data.querySlot`.
 *
 * Uninstalling deletes the install row and with it every binding. Deleting
 * the bound case type or dataset sets its id to null, which the client reads
 * as a broken binding.
 */
create table public.plugin_data_slot_bindings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace of the binding. Always the install's workspace, which
  -- `tr__plugin_data_slot_bindings__check_workspace` enforces.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- The plugin install this binding belongs to.
  installation_id uuid not null references public.plugin_installations (id) on update cascade on delete cascade,
  -- The manifest's data slot id, e.g. `cases`.
  slot_id text not null constraint plugin_data_slot_bindings__slot_id_format check (slot_id ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
  -- Whether the slot reads a case type or a dataset.
  source_type public.plugin_data_slot_bindings__source_type not null,
  -- The case type the slot reads. Null unless `source_type` is `concept`,
  -- and null again once that case type is deleted.
  concept_id uuid references public.concepts (id) on update cascade on delete set null,
  -- The dataset the slot reads. Null unless `source_type` is `dataset`, and
  -- null again once that dataset is deleted.
  dataset_id uuid references public.datasets (id) on update cascade on delete set null,
  -- Slot attribute key to the case type attribute id or the dataset column
  -- id that fills it, e.g. `{ "onsetDate": "<attribute id>" }`.
  attribute_map jsonb not null default '{}'::jsonb constraint plugin_data_slot_bindings__attribute_map_object check (jsonb_typeof(attribute_map) = 'object'),
  -- User who last bound the slot.
  bound_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the slot was first bound.
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to this binding.
  updated_at timestamptz not null default now(),
  -- At most one source id, and only the one `source_type` names. Both null
  -- means the source was deleted.
  constraint plugin_data_slot_bindings__source_matches_type check (
    (
      source_type = 'concept' and
      dataset_id is null
    ) or
    (
      source_type = 'dataset' and
      concept_id is null
    )
  ),
  -- One binding per slot of an install. Its index also serves every lookup
  -- of an install's bindings.
  constraint plugin_data_slot_bindings__installation_slot_unique unique (installation_id, slot_id)
);

alter table public.plugin_data_slot_bindings enable row level security;

-- Data API privileges. `anon` is intentionally omitted.
grant
select
,
  insert,
update,
delete on table public.plugin_data_slot_bindings to authenticated,
service_role;

/**
 * Keeps a data slot binding inside one workspace: its install, and the case
 * type or dataset it reads, must all be in the binding's own workspace.
 * Without it a settings admin of two workspaces could point one workspace's
 * plugin at another workspace's records.
 *
 * SECURITY DEFINER so the check reads the install, the case type, and the
 * dataset whatever the caller's RLS allows: it validates the binding's
 * shape, not the caller's access to the records, which `querySlot` checks
 * when it reads them. A BEFORE trigger runs ahead of the RLS `with check`,
 * so every lookup is scoped to the binding's own workspace and each error
 * names only an id the caller supplied. A record in another workspace reads
 * as missing.
 */
create or replace function public.plugin_data_slot_bindings__check_workspace () returns trigger language plpgsql security definer
set
  search_path = '' as $$
begin
  if not exists (
    select 1
    from public.plugin_installations installation
    where
      installation.id = new.installation_id
      and installation.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding must be in its plugin install''s workspace'
      using
        errcode = '23514',
        hint = 'installation_not_in_workspace',
        detail = format('installation_id %s', new.installation_id);
  end if;

  if new.concept_id is not null and not exists (
    select 1
    from public.concepts concept
    where
      concept.id = new.concept_id
      and concept.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a case type of its own workspace'
      using
        errcode = '23514',
        hint = 'concept_not_in_workspace',
        detail = format('concept_id %s', new.concept_id);
  end if;

  if new.dataset_id is not null and not exists (
    select 1
    from public.datasets dataset
    where
      dataset.id = new.dataset_id
      and dataset.workspace_id = new.workspace_id
  ) then
    raise exception 'A data slot binding can only read a dataset of its own workspace'
      using
        errcode = '23514',
        hint = 'dataset_not_in_workspace',
        detail = format('dataset_id %s', new.dataset_id);
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE, so no Data
-- API role needs a grant for the trigger to fire.
revoke
execute on function public.plugin_data_slot_bindings__check_workspace ()
from
  public,
  anon,
  authenticated,
  service_role;

-- `before`, so a refused binding never reaches the foreign key checks and
-- the error names the real problem. Deleting a bound case type or dataset
-- fires it too, through `on delete set null`, and passes, because a null id
-- is not checked.
create trigger tr__plugin_data_slot_bindings__check_workspace before insert or
update of workspace_id,
installation_id,
concept_id,
dataset_id on public.plugin_data_slot_bindings for each row
execute function public.plugin_data_slot_bindings__check_workspace ();

create trigger tr__plugin_data_slot_bindings__set_updated_at before
update on public.plugin_data_slot_bindings for each row
execute function public.util__set_updated_at ();

-- Policies
create policy "Members can SELECT plugin data slot bindings" on public.plugin_data_slot_bindings for
select
  to authenticated using (
    public.plugin_data_slot_bindings.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin data slot bindings" on public.plugin_data_slot_bindings for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    ) and
    -- Pins the binder to the caller, as `plugin_installations` pins its
    -- installer. Not enforced on UPDATE, so a settings admin can change a
    -- binding another admin made.
    public.plugin_data_slot_bindings.bound_by is not distinct from (
      select
        auth.uid ()
    )
  );

create policy "Settings admins can UPDATE plugin data slot bindings" on public.plugin_data_slot_bindings
for update
  to authenticated using (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    )
  )
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_data_slot_bindings.workspace_id
    )
  );

create policy "Settings admins can DELETE plugin data slot bindings" on public.plugin_data_slot_bindings for delete to authenticated using (
  public.util__can_manage_workspace_settings (
    public.plugin_data_slot_bindings.workspace_id
  )
);
```

`supabase/schemas/11.plugin_content_imports.sql`:

```sql
/**
 * One plugin content item a workspace imported as a dataset. The install
 * wizard and the plugin card in Settings read it to tell which items the
 * workspace already has, so an item is never imported twice.
 *
 * Not tied to an install, so it survives uninstall and a reinstall sees it.
 * Deleting the dataset deletes the row, so the item can be imported again.
 */
create table public.plugin_content_imports (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace the item was imported into.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Plugin id in `publisher.name` form, e.g. `avandar.mozambique`.
  plugin_id text not null constraint plugin_content_imports__plugin_id_format check (plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'),
  -- The manifest's content id, e.g. `provinces`.
  content_id text not null constraint plugin_content_imports__content_id_format check (
    content_id ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*$'
  ),
  -- The dataset the item was imported as.
  dataset_id uuid not null,
  -- User who imported the item.
  imported_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the item was imported.
  created_at timestamptz not null default now(),
  -- Keeps the dataset in the row's own workspace, and deletes the row with
  -- the dataset.
  constraint plugin_content_imports__dataset_in_workspace_fkey foreign key (dataset_id, workspace_id) references public.datasets (id, workspace_id) on update cascade on delete cascade,
  -- One import per content item of a plugin in a workspace.
  constraint plugin_content_imports__workspace_plugin_content_unique unique (workspace_id, plugin_id, content_id)
);

alter table public.plugin_content_imports enable row level security;

-- Data API privileges. `anon` is intentionally omitted. No `update` for
-- `authenticated`: an import row is written once and only ever deleted.
grant
select
,
  insert,
  delete on table public.plugin_content_imports to authenticated;

grant
select
,
  insert,
update,
delete on table public.plugin_content_imports to service_role;

-- Policies
create policy "Members can SELECT plugin content imports" on public.plugin_content_imports for
select
  to authenticated using (
    public.plugin_content_imports.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin content imports" on public.plugin_content_imports for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (
      public.plugin_content_imports.workspace_id
    ) and
    -- Pins the importer to the caller, as `plugin_installations` pins its
    -- installer.
    public.plugin_content_imports.imported_by is not distinct from (
      select
        auth.uid ()
    )
  );

create policy "Settings admins can DELETE plugin content imports" on public.plugin_content_imports for delete to authenticated using (
  public.util__can_manage_workspace_settings (
    public.plugin_content_imports.workspace_id
  )
);
```

`supabase/schemas/50.rpc_plugin_installations__install.sql`:

```sql
/**
 * Installs a plugin in a workspace together with its data slot bindings, in
 * one transaction, and returns the install. The install wizard calls it, so
 * a binding that fails leaves no install behind.
 *
 * SECURITY INVOKER, so the RLS on `plugin_installations` and
 * `plugin_data_slot_bindings` decides who may install: only the workspace's
 * settings admins. Each binding takes its install and workspace from the new
 * install row, never from the payload.
 *
 * @param p_granted_permissions The manifest permissions the admin approved.
 * @param p_bindings A JSON array with one
 *   `{ slot_id, source_type, concept_id, dataset_id, attribute_map }` per
 *   bound data slot. Empty when no slot is bound.
 * @returns The new `plugin_installations` row.
 */
create or replace function public.rpc_plugin_installations__install (
  p_workspace_id uuid,
  p_plugin_id text,
  p_installed_version text,
  p_granted_permissions text[],
  p_bindings jsonb
) returns public.plugin_installations language plpgsql security invoker
set
  search_path = '' as $$
declare
  v_installation public.plugin_installations;
begin
  insert into public.plugin_installations (
    workspace_id,
    plugin_id,
    installed_version,
    granted_permissions
  ) values (
    p_workspace_id,
    p_plugin_id,
    p_installed_version,
    coalesce(p_granted_permissions, '{}')
  )
  returning * into v_installation;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  )
  select
    v_installation.workspace_id,
    v_installation.id,
    binding.slot_id,
    binding.source_type,
    binding.concept_id,
    binding.dataset_id,
    coalesce(binding.attribute_map, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_bindings, '[]'::jsonb)) as binding (
    slot_id text,
    source_type public.plugin_data_slot_bindings__source_type,
    concept_id uuid,
    dataset_id uuid,
    attribute_map jsonb
  );

  return v_installation;
end;
$$;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_plugin_installations__install (uuid, text, text, text[], jsonb)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_plugin_installations__install (uuid, text, text, text[], jsonb) to authenticated;
```

`supabase/schemas/50.rpc_plugin_data_slot_bindings__save.sql`:

```sql
/**
 * Binds one data slot of an installed plugin, replacing the slot's binding
 * when it has one, and returns the saved binding. The plugin card in
 * Settings calls it when an admin changes which records a slot reads.
 *
 * SECURITY INVOKER, so the RLS on `plugin_data_slot_bindings` decides who
 * may bind: only the install's workspace's settings admins. The binding
 * takes its workspace from the install, never from the caller. An install
 * the caller cannot read raises the same error as a missing one.
 *
 * @param p_concept_id The case type the slot reads, when `p_source_type` is
 *   `concept`.
 * @param p_dataset_id The dataset the slot reads, when `p_source_type` is
 *   `dataset`.
 * @param p_attribute_map Slot attribute key to the case type attribute id
 *   or the dataset column id that fills it.
 * @returns The saved `plugin_data_slot_bindings` row.
 */
create or replace function public.rpc_plugin_data_slot_bindings__save (
  p_installation_id uuid,
  p_slot_id text,
  p_source_type public.plugin_data_slot_bindings__source_type,
  p_concept_id uuid default null,
  p_dataset_id uuid default null,
  p_attribute_map jsonb default '{}'::jsonb
) returns public.plugin_data_slot_bindings language plpgsql security invoker
set
  search_path = '' as $$
declare
  v_workspace_id uuid;
  v_binding public.plugin_data_slot_bindings;
begin
  select installation.workspace_id
  into v_workspace_id
  from public.plugin_installations installation
  where installation.id = p_installation_id;

  if v_workspace_id is null then
    raise exception 'The plugin install does not exist or cannot be read'
      using
        errcode = '42501',
        hint = 'plugin_installation_not_found',
        detail = format('installation_id %s', p_installation_id);
  end if;

  insert into public.plugin_data_slot_bindings (
    workspace_id,
    installation_id,
    slot_id,
    source_type,
    concept_id,
    dataset_id,
    attribute_map
  ) values (
    v_workspace_id,
    p_installation_id,
    p_slot_id,
    p_source_type,
    p_concept_id,
    p_dataset_id,
    coalesce(p_attribute_map, '{}'::jsonb)
  )
  on conflict (installation_id, slot_id) do update
  set
    source_type = excluded.source_type,
    concept_id = excluded.concept_id,
    dataset_id = excluded.dataset_id,
    attribute_map = excluded.attribute_map,
    bound_by = excluded.bound_by
  returning * into v_binding;

  return v_binding;
end;
$$;

-- `authenticated` only, the one role that calls this as an rpc.
revoke
execute on function public.rpc_plugin_data_slot_bindings__save (
  uuid,
  text,
  public.plugin_data_slot_bindings__source_type,
  uuid,
  uuid,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

grant
execute on function public.rpc_plugin_data_slot_bindings__save (
  uuid,
  text,
  public.plugin_data_slot_bindings__source_type,
  uuid,
  uuid,
  jsonb
) to authenticated;
```

- [ ] **Step 7: Format the SQL**

Run: `pnpm exec prettier --write --log-level warn supabase/schemas/00.enum.plugin_data_slot_bindings__source_type.sql supabase/schemas/11.plugin_data_slot_bindings.sql supabase/schemas/11.plugin_content_imports.sql supabase/schemas/50.rpc_plugin_installations__install.sql supabase/schemas/50.rpc_plugin_data_slot_bindings__save.sql`
Expected: no output, and the five files keep exactly the content above
(they are already in Prettier's format).

- [ ] **Step 8: Rebuild the database from this branch's migrations**

Repeat Step 1's status check (it must still name `feat-plugins-slots`), then
run: `pnpm db:reset`
Expected: the reset finishes without errors.

- [ ] **Step 9: Generate the migration**

Run: `pnpm db:new-migration add_plugin_data_slots`
Expected: the script prints `==> Done. Review the migration, then run 'pnpm db:gen-types'.`
and a new `supabase/migrations/<timestamp>_add_plugin_data_slots.sql`
exists. Its reconcile step must not report drift. It ends with the
`revoke all privileges ... / grant ...` block that `reconcile-privileges
--append` adds.

- [ ] **Step 10: Inspect the migration for drops**

Run:

```bash
MIGRATION=$(ls supabase/migrations/*_add_plugin_data_slots.sql)
grep -n -i -E "^\s*drop " "$MIGRATION"
for name in plugin_data_slot_bindings__source_type plugin_data_slot_bindings plugin_content_imports plugin_data_slot_bindings__check_workspace rpc_plugin_installations__install rpc_plugin_data_slot_bindings__save; do
  grep -q "$name" "$MIGRATION" && echo "found $name" || echo "MISSING $name"
done
```

Expected: the first `grep` prints nothing, and the loop prints `found` for
all six names. If the migration drops anything at all, this task did not
create it: STOP, do not commit, and report the dropped objects to the
orchestrator. If a name is `MISSING`, the schema file was not picked up:
check its name and number against Step 6.

- [ ] **Step 11: Generate the database types**

Run: `pnpm db:gen-types`
Expected: `git diff --stat shared/types/database.types.ts` shows only
additions. Confirm the shapes later tasks rely on:

```bash
grep -n -A8 "rpc_plugin_data_slot_bindings__save: {" shared/types/database.types.ts
grep -n "plugin_data_slot_bindings__source_type: \"concept\" | \"dataset\"" shared/types/database.types.ts
grep -n "      plugin_content_imports: {" shared/types/database.types.ts
```

Expected: the save RPC's `Args` lists `p_attribute_map?: Json`,
`p_concept_id?: string`, `p_dataset_id?: string`, `p_installation_id: string`,
`p_slot_id: string`, and `p_source_type`; the enum line and the table both
exist.

- [ ] **Step 12: Generate and check the desktop SQLite migration**

Run:

```bash
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
```

Expected: the first writes
`apps/desktop/migrations/<timestamp>_add_plugin_data_slots.gen.sql`, whose
header says `Schema-shape statements emitted: 0` (both tables are excluded),
and `git status --short apps/desktop/migrations` shows only that new file.
The second exits 0 with no drift.

- [ ] **Step 13: Type check**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit`
Expected: no errors (about 25 seconds)

- [ ] **Step 14: Commit**

```bash
git add supabase/schemas/00.enum.plugin_data_slot_bindings__source_type.sql supabase/schemas/11.plugin_data_slot_bindings.sql supabase/schemas/11.plugin_content_imports.sql supabase/schemas/50.rpc_plugin_installations__install.sql supabase/schemas/50.rpc_plugin_data_slot_bindings__save.sql supabase/migrations/*_add_plugin_data_slots.sql apps/desktop/migrations/*_add_plugin_data_slots.gen.sql shared/types/database.types.ts apps/desktop/sync/syncable-tables.ts apps/desktop/sync/syncable-tables.test.ts
git commit -m "feat(plugins): store data slot bindings and content imports" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- Never hand-edit the generated migration. If its ACL looks wrong, fix
  `supabase/schemas/` and rerun Steps 8 and 9.
- `pnpm desktop:sqlite:gen-migrations` hard-errors with
  `[uncategorised table: plugin_content_imports]` (or `...bindings`) if Step 4
  is skipped. That is why the exclusion lands first.
- `plugin_data_slot_bindings__check_workspace` is `security definer`, like
  `attribute_mappings__dataset_column__validate_bucket_column`: it checks the
  binding's shape, not the caller's access. Every lookup is scoped to the
  binding's own workspace, so a record in another workspace reads as missing.
- Both RPCs are `security invoker`, so RLS decides who may call them. The
  install RPC needs no extra check: a non-admin fails on the
  `plugin_installations` insert policy.
- `plugin_content_imports` grants `authenticated` only `select, insert,
  delete`. Task 11 adds it to the exact grants matrix in
  `exact_data_api_grants.test.sql`; until then `pnpm test:db` fails that file.
- `pnpm exec oxfmt` never formats SQL (Prettier owns `supabase/schemas/`).

---

### Task 11: pgTAP tests for data slot bindings, content imports, and the RPCs

**Design note:** one extra test file,
`supabase/tests/database/rpc_plugin_data_slot_bindings__save.test.sql`, so
each RPC has a suite named after it instead of the save RPC's cases living in
the install RPC's file. `exact_data_api_grants.test.sql` also changes, since
`plugin_content_imports` has no `update` grant for `authenticated`.

**Goal:** Prove the RLS on both new tables, the workspace checks, the
cascades, and both RPCs with pgTAP, and record the new table's grants in the
exact grants matrix.

**Files:**
- Test: `supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql`
- Test: `supabase/tests/database/permissions/rls_plugin_content_imports.test.sql`
- Test: `supabase/tests/database/rpc_plugin_installations__install.test.sql`
- Test: `supabase/tests/database/rpc_plugin_data_slot_bindings__save.test.sql`
- Modify: `supabase/tests/database/permissions/exact_data_api_grants.test.sql` (add `plugin_content_imports`)

**Depends on:** Task 10 (the tables, triggers, policies, and RPCs, applied to
this branch's local stack).

- [ ] **Step 1: Confirm the branch is on its own Supabase stack**

Run:

```bash
test -f apps/ava-cli/dist/main.cjs || pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs supabase status
```

Expected: the first line says this branch is on a switched local Supabase
database and names this branch's own project (`feat-plugins-slots`). If it
instead says `This is the develop local Supabase`, STOP: do not run any
`pnpm db:*`, `supabase *`, or `pnpm test:db` command. Report back to the
orchestrator (Task 1 owns the switch).

- [ ] **Step 2: Run the database tests and confirm the grants matrix fails**

Run: `pnpm test:db`
Expected: FAIL. `exact_data_api_grants.test.sql` fails its first assertion,
`public table privileges exactly match the Data API matrix`: the expected
side lists `UPDATE` on `plugin_content_imports` for `authenticated`, which
Task 10 does not grant. Every other suite passes.

- [ ] **Step 3: Record the content imports grants in the matrix**

In `supabase/tests/database/permissions/exact_data_api_grants.test.sql`, in
the `standard_authenticated_tables` exclusion list, replace:

```sql
      'pipeline_scope_checkpoints',
      'subscriptions',
```

with:

```sql
      'pipeline_scope_checkpoints',
      'plugin_content_imports',
      'subscriptions',
```

Then, in `expected_table_privileges`, replace:

```sql
  union all
  select
    'dashboards',
    'anon',
    'SELECT',
    false
```

with:

```sql
  union all
  -- No `update`: a plugin content import is written once and only ever
  -- deleted.
  select
    'plugin_content_imports',
    'authenticated',
    privilege_type,
    false
  from
    unnest(array['DELETE', 'INSERT', 'SELECT']) as privileges (privilege_type)
  union all
  select
    'dashboards',
    'anon',
    'SELECT',
    false
```

- [ ] **Step 4: Write the four new suites**

These are written after Task 10's schema, so they pass on their first run.
Each asserts both the allowed and the refused path, so each can turn red
when a policy, trigger, constraint, or grant regresses.

`supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_data_slot_bindings`. Workspace members can read
 * the bindings of their workspace. Only settings admins can bind, change, or
 * unbind a slot. Other workspaces see nothing. A binding stays inside its
 * install's workspace: it cannot move to another workspace, attach to
 * another workspace's install, or read another workspace's case type or
 * dataset. Deleting the case type keeps the binding with a null source, and
 * uninstalling deletes it.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1500001-0000-4000-8000-000000000001'::uuid, 'slot_bindings_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1500002-0000-4000-8000-000000000002'::uuid, 'slot_bindings_member@test.dev', 'authenticated', 'authenticated'),
  ('d1500003-0000-4000-8000-000000000003'::uuid, 'slot_bindings_outsider@test.dev', 'authenticated', 'authenticated'),
  ('d1500004-0000-4000-8000-000000000004'::uuid, 'slot_bindings_admin@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'slot bindings ws a', 'slot-bindings-ws-a'),
  ('d1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'slot bindings ws b', 'slot-bindings-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1502001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid),
  ('d1502002-0000-4000-8000-000000000002'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500002-0000-4000-8000-000000000002'::uuid),
  ('d1502003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

-- A non-owner settings admin in both workspaces, through the built-in Global
-- Admin role group each workspace was seeded with.
insert into public.workspace_memberships (id, workspace_id, user_id, role_group_id)
select
  case rg.workspace_id
    when 'd1501001-0000-4000-8000-000000000001'::uuid then 'd1502004-0000-4000-8000-000000000004'::uuid
    else 'd1502005-0000-4000-8000-000000000005'::uuid
  end,
  rg.workspace_id,
  'd1500004-0000-4000-8000-000000000004'::uuid,
  rg.id
from public.role_groups rg
where
  rg.workspace_id in (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd1501002-0000-4000-8000-000000000002'::uuid
  ) and
  rg.is_builtin and
  rg.name = 'Global Admin';

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('d1503001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1502001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d1503002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1502003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1504001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'slot bindings cases a', true, 'd1505001-0000-4000-8000-000000000001'::uuid),
  ('d1504002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'slot bindings cases b', true, 'd1505002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1505001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1504001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1505002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1504002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('d1506001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'd1500001-0000-4000-8000-000000000001'::uuid, 'd1503001-0000-4000-8000-000000000001'::uuid,
   'slot bindings dataset a', 'csv_file'::public.datasets__source_type),
  ('d1506002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'd1500003-0000-4000-8000-000000000003'::uuid, 'd1503002-0000-4000-8000-000000000002'::uuid,
   'slot bindings dataset b', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values
  ('d150a001-0000-4000-8000-000000000001'::uuid, 'd1501001-0000-4000-8000-000000000001'::uuid, 'avandar.epidemiology', '0.2.0', array['data:slots']),
  ('d150a002-0000-4000-8000-000000000002'::uuid, 'd1501002-0000-4000-8000-000000000002'::uuid, 'avandar.epidemiology', '0.2.0', array['data:slots']);

insert into public.plugin_data_slot_bindings (id, workspace_id, installation_id, slot_id, source_type, concept_id, attribute_map)
values (
  'd150b001-0000-4000-8000-000000000001'::uuid,
  'd1501001-0000-4000-8000-000000000001'::uuid,
  'd150a001-0000-4000-8000-000000000001'::uuid,
  'cases',
  'concept',
  'd1504001-0000-4000-8000-000000000001'::uuid,
  '{"onsetDate": "d1507001-0000-4000-8000-000000000001"}'::jsonb
);

select plan (18);

-- 1. A plain member reads their workspace's binding.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings) <> 1 then
      raise exception 'a member cannot read their workspace data slot bindings';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace data slot bindings'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where workspace_id = 'd1501001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace data slot bindings';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no data slot bindings'
);

-- 3. A plain member cannot bind a slot.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot bind a data slot'
);

-- 4. An outsider cannot bind a slot in another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  $t4$,
  '42501',
  null,
  'an outsider cannot bind a data slot in another workspace'
);

-- 5. A plain member's update is filtered by RLS.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if not (select attribute_map ? 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) then
      raise exception 'a member changed a data slot binding';
    end if;
  end $chk$;
  $t5$,
  'a member without settings admin cannot change a data slot binding'
);

-- 6. A plain member's delete is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member unbound a data slot';
    end if;
  end $chk$;
  $t6$,
  'a member without settings admin cannot unbind a data slot'
);

-- 7. An outsider's update is filtered by RLS.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if not (select attribute_map ? 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) then
      raise exception 'an outsider changed another workspace data slot binding';
    end if;
  end $chk$;
  $t7$,
  'an outsider cannot change another workspace data slot binding'
);

-- 8. An outsider's delete is filtered by RLS.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an outsider unbound another workspace data slot';
    end if;
  end $chk$;
  $t8$,
  'an outsider cannot unbind another workspace data slot'
);

-- 9. The owner binds a slot to a dataset, attributed to themselves.
select lives_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'deaths', 'dataset', 'd1506001-0000-4000-8000-000000000001'::uuid);
  reset role;
  do $chk$
  begin
    if (
      select bound_by
      from public.plugin_data_slot_bindings
      where
        installation_id = 'd150a001-0000-4000-8000-000000000001'::uuid and
        slot_id = 'deaths'
    ) is distinct from 'd1500001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the owner binding was not attributed to the owner';
    end if;
  end $chk$;
  $t9$,
  'the workspace owner binds a data slot to a dataset'
);

-- 10. The owner changes a binding's attribute map.
select lives_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings set attribute_map = '{"onsetDate": "d1507002-0000-4000-8000-000000000002"}'::jsonb where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select attribute_map ->> 'onsetDate' from public.plugin_data_slot_bindings where id = 'd150b001-0000-4000-8000-000000000001'::uuid) is distinct from 'd1507002-0000-4000-8000-000000000002' then
      raise exception 'the owner could not change a data slot binding';
    end if;
  end $chk$;
  $t10$,
  'the workspace owner changes a data slot binding'
);

-- 11. A settings admin of both workspaces cannot move a binding between
-- them. RLS alone would allow it, so the trigger is what stops it.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  update public.plugin_data_slot_bindings
  set workspace_id = 'd1501002-0000-4000-8000-000000000002'::uuid
  where id = 'd150b001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  '23514',
  null,
  'a settings admin of both workspaces cannot move a binding between them'
);

-- 12. A binding cannot read another workspace's case type.
select throws_ok (
  $t12$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'otherCases', 'concept', 'd1504002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '23514',
  null,
  'a data slot binding cannot read a case type of another workspace'
);

-- 13. A binding cannot read another workspace's dataset.
select throws_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, dataset_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a001-0000-4000-8000-000000000001'::uuid, 'otherDeaths', 'dataset', 'd1506002-0000-4000-8000-000000000002'::uuid);
  $t13$,
  '23514',
  null,
  'a data slot binding cannot read a dataset of another workspace'
);

-- 14. A binding cannot attach to another workspace's install.
select throws_ok (
  $t14$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id)
  values ('d1501001-0000-4000-8000-000000000001'::uuid, 'd150a002-0000-4000-8000-000000000002'::uuid, 'cases', 'concept', 'd1504001-0000-4000-8000-000000000001'::uuid);
  $t14$,
  '23514',
  null,
  'a data slot binding cannot belong to an install of another workspace'
);

-- 15. A binding names only the source its type says.
select throws_ok (
  $t15$
  reset role;
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id, dataset_id)
  values (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd150a001-0000-4000-8000-000000000001'::uuid,
    'mixed',
    'concept',
    'd1504001-0000-4000-8000-000000000001'::uuid,
    'd1506001-0000-4000-8000-000000000001'::uuid
  );
  $t15$,
  '23514',
  null,
  'a case type binding cannot also name a dataset'
);

-- 16. An admin cannot attribute a binding to another user.
select throws_ok (
  $t16$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500004-0000-4000-8000-000000000004","role":"authenticated"}', true);
  insert into public.plugin_data_slot_bindings (workspace_id, installation_id, slot_id, source_type, concept_id, bound_by)
  values (
    'd1501001-0000-4000-8000-000000000001'::uuid,
    'd150a001-0000-4000-8000-000000000001'::uuid,
    'forged',
    'concept',
    'd1504001-0000-4000-8000-000000000001'::uuid,
    'd1500001-0000-4000-8000-000000000001'::uuid
  );
  $t16$,
  '42501',
  null,
  'a settings admin cannot bind a data slot as another user'
);

-- 17. Deleting the bound case type keeps the binding, with no source.
select lives_ok (
  $t17$
  reset role;
  delete from public.concepts where id = 'd1504001-0000-4000-8000-000000000001'::uuid;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings
      where
        id = 'd150b001-0000-4000-8000-000000000001'::uuid and
        concept_id is null
    ) <> 1 then
      raise exception 'deleting the case type did not leave the binding with a null concept_id';
    end if;
  end $chk$;
  $t17$,
  'deleting the bound case type keeps the binding with a null concept_id'
);

-- 18. Uninstalling deletes the install's bindings.
select lives_ok (
  $t18$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1500001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'd150a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_data_slot_bindings where installation_id = 'd150a001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'uninstalling left data slot bindings behind';
    end if;
  end $chk$;
  $t18$,
  'uninstalling a plugin deletes its data slot bindings'
);

select * from finish ();

rollback;
```

`supabase/tests/database/permissions/rls_plugin_content_imports.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_content_imports`. Workspace members can read the
 * imports of their workspace. Only settings admins can record or delete an
 * import, and nobody signed in can change one. Other workspaces see nothing.
 * An import names a dataset of its own workspace, once per content item. It
 * survives uninstalling its plugin and is deleted with its dataset.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1600001-0000-4000-8000-000000000001'::uuid, 'content_imports_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1600002-0000-4000-8000-000000000002'::uuid, 'content_imports_member@test.dev', 'authenticated', 'authenticated'),
  ('d1600003-0000-4000-8000-000000000003'::uuid, 'content_imports_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'content imports ws a', 'content-imports-ws-a'),
  ('d1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'content imports ws b', 'content-imports-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1602001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid),
  ('d1602002-0000-4000-8000-000000000002'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600002-0000-4000-8000-000000000002'::uuid),
  ('d1602003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values
  ('d1603001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1602001-0000-4000-8000-000000000001'::uuid, 'Owner', 'Owner'),
  ('d1603002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1602003-0000-4000-8000-000000000003'::uuid, 'Outsider', 'Outsider')
on conflict (id) do nothing;

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values
  ('d1606001-0000-4000-8000-000000000001'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1603001-0000-4000-8000-000000000001'::uuid,
   'Mozambique provinces', 'csv_file'::public.datasets__source_type),
  ('d1606002-0000-4000-8000-000000000002'::uuid, 'd1601001-0000-4000-8000-000000000001'::uuid, 'd1600001-0000-4000-8000-000000000001'::uuid, 'd1603001-0000-4000-8000-000000000001'::uuid,
   'Mozambique districts', 'csv_file'::public.datasets__source_type),
  ('d1606003-0000-4000-8000-000000000003'::uuid, 'd1601002-0000-4000-8000-000000000002'::uuid, 'd1600003-0000-4000-8000-000000000003'::uuid, 'd1603002-0000-4000-8000-000000000002'::uuid,
   'ws b dataset', 'csv_file'::public.datasets__source_type)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version)
values (
  'd160a001-0000-4000-8000-000000000001'::uuid,
  'd1601001-0000-4000-8000-000000000001'::uuid,
  'avandar.mozambique',
  '0.1.0'
);

insert into public.plugin_content_imports (id, workspace_id, plugin_id, content_id, dataset_id, imported_by)
values (
  'd160c001-0000-4000-8000-000000000001'::uuid,
  'd1601001-0000-4000-8000-000000000001'::uuid,
  'avandar.mozambique',
  'provinces',
  'd1606001-0000-4000-8000-000000000001'::uuid,
  'd1600001-0000-4000-8000-000000000001'::uuid
);

select plan (15);

-- 1. A plain member reads their workspace's import.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports) <> 1 then
      raise exception 'a member cannot read their workspace content imports';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace content imports'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace content imports';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no content imports'
);

-- 3. A plain member cannot record an import.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot record a content import'
);

-- 4. An outsider cannot record an import in another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t4$,
  '42501',
  null,
  'an outsider cannot record a content import in another workspace'
);

-- 5. A plain member's delete is filtered by RLS.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member deleted a content import';
    end if;
  end $chk$;
  $t5$,
  'a member without settings admin cannot delete a content import'
);

-- 6. An outsider's delete is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  delete from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'an outsider deleted another workspace content import';
    end if;
  end $chk$;
  $t6$,
  'an outsider cannot delete another workspace content import'
);

-- 7. The owner records an import, attributed to themselves.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  reset role;
  do $chk$
  begin
    if (
      select imported_by
      from public.plugin_content_imports
      where
        workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
        content_id = 'districts'
    ) is distinct from 'd1600001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the owner import was not attributed to the owner';
    end if;
  end $chk$;
  $t7$,
  'the workspace owner records a content import'
);

-- 8. A content item is imported at most once per workspace.
select throws_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'provinces', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t8$,
  '23505',
  null,
  'a workspace cannot record the same content item twice'
);

-- 9. An import cannot name another workspace's dataset.
select throws_ok (
  $t9$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'avandar.mozambique', 'borrowed', 'd1606003-0000-4000-8000-000000000003'::uuid);
  $t9$,
  '23503',
  null,
  'a content import cannot name a dataset of another workspace'
);

-- 10. An admin cannot attribute an import to another user.
select throws_ok (
  $t10$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id, imported_by)
  values (
    'd1601001-0000-4000-8000-000000000001'::uuid,
    'avandar.mozambique',
    'forged',
    'd1606002-0000-4000-8000-000000000002'::uuid,
    'd1600002-0000-4000-8000-000000000002'::uuid
  );
  $t10$,
  '42501',
  null,
  'a settings admin cannot record a content import as another user'
);

-- 11. Nobody signed in can change an import, because the role has no
-- UPDATE grant on the table.
select throws_ok (
  $t11$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_content_imports
  set content_id = 'renamed'
  where id = 'd160c001-0000-4000-8000-000000000001'::uuid;
  $t11$,
  '42501',
  null,
  'a settings admin cannot change a content import'
);

-- 12. A malformed plugin id violates the check constraint.
select throws_ok (
  $t12$
  reset role;
  insert into public.plugin_content_imports (workspace_id, plugin_id, content_id, dataset_id)
  values ('d1601001-0000-4000-8000-000000000001'::uuid, 'Not A Plugin Id', 'districts', 'd1606002-0000-4000-8000-000000000002'::uuid);
  $t12$,
  '23514',
  null,
  'plugin_id must look like publisher.name'
);

-- 13. Uninstalling the plugin keeps what it imported.
select lives_ok (
  $t13$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'd160a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'uninstalling deleted a content import';
    end if;
  end $chk$;
  $t13$,
  'a content import survives uninstalling its plugin'
);

-- 14. Deleting the dataset deletes its import, so the item can be imported
-- again.
select lives_ok (
  $t14$
  reset role;
  delete from public.datasets where id = 'd1606001-0000-4000-8000-000000000001'::uuid;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_content_imports where id = 'd160c001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'deleting the dataset left its content import behind';
    end if;
  end $chk$;
  $t14$,
  'deleting the imported dataset deletes its content import'
);

-- 15. The owner deletes an import.
select lives_ok (
  $t15$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1600001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  delete from public.plugin_content_imports
  where
    workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
    content_id = 'districts';
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_content_imports
      where
        workspace_id = 'd1601001-0000-4000-8000-000000000001'::uuid and
        content_id = 'districts'
    ) <> 0 then
      raise exception 'the owner could not delete a content import';
    end if;
  end $chk$;
  $t15$,
  'the workspace owner deletes a content import'
);

select * from finish ();

rollback;
```

`supabase/tests/database/rpc_plugin_installations__install.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * `rpc_plugin_installations__install` writes a plugin install and its data
 * slot bindings in one transaction. A settings admin installs with bindings
 * that take the new install's id and workspace. A binding that fails rolls
 * the install back with it. Anyone who is not a settings admin of the
 * workspace cannot install.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1700001-0000-4000-8000-000000000001'::uuid, 'install_rpc_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1700002-0000-4000-8000-000000000002'::uuid, 'install_rpc_member@test.dev', 'authenticated', 'authenticated'),
  ('d1700003-0000-4000-8000-000000000003'::uuid, 'install_rpc_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1701001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid, 'install rpc ws a', 'install-rpc-ws-a'),
  ('d1701002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid, 'install rpc ws b', 'install-rpc-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1702001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid),
  ('d1702002-0000-4000-8000-000000000002'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1700002-0000-4000-8000-000000000002'::uuid),
  ('d1702003-0000-4000-8000-000000000003'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1704001-0000-4000-8000-000000000001'::uuid, 'd1700001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'install rpc cases a', true, 'd1705001-0000-4000-8000-000000000001'::uuid),
  ('d1704002-0000-4000-8000-000000000002'::uuid, 'd1700003-0000-4000-8000-000000000003'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'install rpc cases b', true, 'd1705002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1705001-0000-4000-8000-000000000001'::uuid, 'd1701001-0000-4000-8000-000000000001'::uuid, 'd1704001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1705002-0000-4000-8000-000000000002'::uuid, 'd1701002-0000-4000-8000-000000000002'::uuid, 'd1704002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

select plan (6);

-- 1. The owner installs with a case type binding. The binding takes the new
-- install's id and workspace, and both rows are attributed to the owner.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_installation public.plugin_installations;
  begin
    v_installation := public.rpc_plugin_installations__install(
      'd1701001-0000-4000-8000-000000000001'::uuid,
      'avandar.epidemiology',
      '0.2.0',
      array['data:context', 'data:slots'],
      '[{"slot_id": "cases", "source_type": "concept", "concept_id": "d1704001-0000-4000-8000-000000000001", "dataset_id": null, "attribute_map": {"onsetDate": "d1706001-0000-4000-8000-000000000001"}}]'::jsonb
    );
    if v_installation.installed_by is distinct from 'd1700001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the install was not attributed to the owner';
    end if;
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = v_installation.id and
        binding.workspace_id = 'd1701001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.concept_id = 'd1704001-0000-4000-8000-000000000001'::uuid and
        binding.attribute_map ->> 'onsetDate' = 'd1706001-0000-4000-8000-000000000001' and
        binding.bound_by = 'd1700001-0000-4000-8000-000000000001'::uuid
    ) <> 1 then
      raise exception 'the install did not write its case type binding';
    end if;
  end $chk$;
  $t1$,
  'a settings admin installs a plugin with its data slot bindings'
);

-- 2. A binding that reads another workspace's case type fails the call.
select throws_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.other',
    '0.1.0',
    array['data:slots'],
    '[{"slot_id": "cases", "source_type": "concept", "concept_id": "d1704002-0000-4000-8000-000000000002", "dataset_id": null, "attribute_map": {}}]'::jsonb
  );
  $t2$,
  '23514',
  null,
  'an install whose binding reads another workspace case type fails'
);

reset role;

-- 3. That failure left no install behind.
select is (
  (
    select count(*)::int
    from public.plugin_installations
    where
      workspace_id = 'd1701001-0000-4000-8000-000000000001'::uuid and
      plugin_id = 'avandar.other'
  ),
  0,
  'a failing binding rolls back its install'
);

-- 4. An install with no bindings writes only the install.
select lives_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_installation public.plugin_installations;
  begin
    v_installation := public.rpc_plugin_installations__install(
      'd1701001-0000-4000-8000-000000000001'::uuid,
      'avandar.mozambique',
      '0.1.0',
      array[]::text[],
      '[]'::jsonb
    );
    if (select count(*)::int from public.plugin_data_slot_bindings where installation_id = v_installation.id) <> 0 then
      raise exception 'an install without bindings wrote a binding';
    end if;
  end $chk$;
  $t4$,
  'an install with no bindings writes no data slot bindings'
);

-- 5. A plain member cannot install.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.by-member',
    '0.1.0',
    array[]::text[],
    '[]'::jsonb
  );
  $t5$,
  '42501',
  null,
  'a member without settings admin cannot install through the rpc'
);

-- 6. An outsider cannot install into another workspace.
select throws_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1700003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select public.rpc_plugin_installations__install(
    'd1701001-0000-4000-8000-000000000001'::uuid,
    'avandar.by-outsider',
    '0.1.0',
    array[]::text[],
    '[]'::jsonb
  );
  $t6$,
  '42501',
  null,
  'an outsider cannot install into another workspace through the rpc'
);

select * from finish ();

rollback;
```

`supabase/tests/database/rpc_plugin_data_slot_bindings__save.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * `rpc_plugin_data_slot_bindings__save` binds one data slot of an install,
 * replacing the slot's binding when it has one. A settings admin binds and
 * rebinds a slot, and it keeps one row. Nobody else can bind, and a binding
 * still cannot read another workspace's case type.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('d1800001-0000-4000-8000-000000000001'::uuid, 'save_binding_owner@test.dev', 'authenticated', 'authenticated'),
  ('d1800002-0000-4000-8000-000000000002'::uuid, 'save_binding_member@test.dev', 'authenticated', 'authenticated'),
  ('d1800003-0000-4000-8000-000000000003'::uuid, 'save_binding_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('d1801001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid, 'save binding ws a', 'save-binding-ws-a'),
  ('d1801002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid, 'save binding ws b', 'save-binding-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('d1802001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid),
  ('d1802002-0000-4000-8000-000000000002'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1800002-0000-4000-8000-000000000002'::uuid),
  ('d1802003-0000-4000-8000-000000000003'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.user_profiles (
  id, user_id, workspace_id, membership_id, full_name, display_name
)
values (
  'd1803001-0000-4000-8000-000000000001'::uuid,
  'd1800001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'd1802001-0000-4000-8000-000000000001'::uuid,
  'Owner',
  'Owner'
)
on conflict (id) do nothing;

-- One case type per workspace, each defaulting to its own Active status.
insert into public.concepts (id, owner_id, workspace_id, name, allow_manual_creation, default_status_id)
values
  ('d1804001-0000-4000-8000-000000000001'::uuid, 'd1800001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'save binding cases a', true, 'd1805001-0000-4000-8000-000000000001'::uuid),
  ('d1804002-0000-4000-8000-000000000002'::uuid, 'd1800003-0000-4000-8000-000000000003'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'save binding cases b', true, 'd1805002-0000-4000-8000-000000000002'::uuid);

insert into public.concept_statuses (id, workspace_id, concept_id, name, color, position)
values
  ('d1805001-0000-4000-8000-000000000001'::uuid, 'd1801001-0000-4000-8000-000000000001'::uuid, 'd1804001-0000-4000-8000-000000000001'::uuid, 'Active', '#40c057', 0),
  ('d1805002-0000-4000-8000-000000000002'::uuid, 'd1801002-0000-4000-8000-000000000002'::uuid, 'd1804002-0000-4000-8000-000000000002'::uuid, 'Active', '#40c057', 0);

insert into public.datasets (
  id, workspace_id, owner_id, owner_profile_id, name, source_type
)
values (
  'd1806001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'd1800001-0000-4000-8000-000000000001'::uuid,
  'd1803001-0000-4000-8000-000000000001'::uuid,
  'save binding line list',
  'csv_file'::public.datasets__source_type
)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values (
  'd180a001-0000-4000-8000-000000000001'::uuid,
  'd1801001-0000-4000-8000-000000000001'::uuid,
  'avandar.epidemiology',
  '0.2.0',
  array['data:slots']
);

select plan (5);

-- 1. The owner binds a slot that had no binding.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  do $chk$
  declare
    v_binding public.plugin_data_slot_bindings;
  begin
    v_binding := public.rpc_plugin_data_slot_bindings__save(
      'd180a001-0000-4000-8000-000000000001'::uuid,
      'cases',
      'concept',
      'd1804001-0000-4000-8000-000000000001'::uuid,
      null,
      '{"onsetDate": "d1807001-0000-4000-8000-000000000001"}'::jsonb
    );
    if v_binding.workspace_id is distinct from 'd1801001-0000-4000-8000-000000000001'::uuid
      or v_binding.bound_by is distinct from 'd1800001-0000-4000-8000-000000000001'::uuid then
      raise exception 'the binding did not take the install workspace and the caller';
    end if;
  end $chk$;
  $t1$,
  'a settings admin binds a data slot through the rpc'
);

-- 2. Saving the slot again replaces its binding instead of adding one.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'cases',
    'dataset',
    null,
    'd1806001-0000-4000-8000-000000000001'::uuid,
    '{"onsetDate": "d1807002-0000-4000-8000-000000000002"}'::jsonb
  );
  reset role;
  do $chk$
  begin
    if (
      select count(*)::int
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases'
    ) <> 1 then
      raise exception 'saving a bound slot again added a second binding';
    end if;
    if not exists (
      select 1
      from public.plugin_data_slot_bindings binding
      where
        binding.installation_id = 'd180a001-0000-4000-8000-000000000001'::uuid and
        binding.slot_id = 'cases' and
        binding.source_type = 'dataset' and
        binding.concept_id is null and
        binding.dataset_id = 'd1806001-0000-4000-8000-000000000001'::uuid and
        binding.attribute_map ->> 'onsetDate' = 'd1807002-0000-4000-8000-000000000002'
    ) then
      raise exception 'saving a bound slot again did not replace its source and map';
    end if;
  end $chk$;
  $t2$,
  'saving a bound data slot again replaces its binding'
);

-- 3. A plain member cannot bind a slot.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'dataset',
    null,
    'd1806001-0000-4000-8000-000000000001'::uuid,
    '{}'::jsonb
  );
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot bind a data slot through the rpc'
);

-- 4. An outsider cannot read the install, so cannot bind its slots.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'concept',
    'd1804002-0000-4000-8000-000000000002'::uuid,
    null,
    '{}'::jsonb
  );
  $t4$,
  '42501',
  null,
  'an outsider cannot bind a data slot of another workspace install'
);

-- 5. The rpc cannot bind a slot to another workspace's case type.
select throws_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"d1800001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select public.rpc_plugin_data_slot_bindings__save(
    'd180a001-0000-4000-8000-000000000001'::uuid,
    'deaths',
    'concept',
    'd1804002-0000-4000-8000-000000000002'::uuid,
    null,
    '{}'::jsonb
  );
  $t5$,
  '23514',
  null,
  'a data slot cannot be bound to a case type of another workspace'
);

select * from finish ();

rollback;
```

- [ ] **Step 5: Run the database tests and confirm they pass**

Repeat Step 1's status check, then run: `pnpm test:db`
Expected: PASS. pg_prove prints each suite's path followed by dots and
`ok`, including these five:

```text
.../permissions/exact_data_api_grants.test.sql ......... ok
.../permissions/rls_plugin_content_imports.test.sql .... ok
.../permissions/rls_plugin_data_slot_bindings.test.sql . ok
.../rpc_plugin_data_slot_bindings__save.test.sql ....... ok
.../rpc_plugin_installations__install.test.sql ......... ok
```

and ends with `All tests successful.` and `Result: PASS`. The four new suites
plan 18, 15, 6, and 5 assertions. The `reconcile-privileges` and dashboard
publishing checks that `pnpm test:db` runs afterwards also pass.

For a faster loop while fixing one suite, run only that file, still after
the Step 1 check: `supabase test db supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql`.

- [ ] **Step 6: Commit**

```bash
git add supabase/tests/database/permissions/rls_plugin_data_slot_bindings.test.sql supabase/tests/database/permissions/rls_plugin_content_imports.test.sql supabase/tests/database/rpc_plugin_installations__install.test.sql supabase/tests/database/rpc_plugin_data_slot_bindings__save.test.sql supabase/tests/database/permissions/exact_data_api_grants.test.sql
git commit -m "test(plugins): cover data slot binding and content import RLS and RPCs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- These SQL files were drafted without a database to run them against. If a
  suite fails, read the pgTAP diagnostic first: a wrong expectation in the
  test is as likely as a schema bug. Fix the test only when Task 10's schema
  matches the spec; otherwise fix the schema in Task 10's files and
  regenerate the migration (Task 10 Steps 8 to 11).
- `throws_ok` runs its SQL in a savepoint, so `set local role` inside a
  failing case is undone. A passing `lives_ok` keeps the role, which is why
  the cases that need `postgres` start with `reset role;`.
- Expected error codes: RLS refusals and the missing `update` grant are
  `42501`; the workspace trigger and the check constraints are `23514`; a
  duplicate import is `23505`; a cross-workspace import dataset is `23503`
  (the composite foreign key).
- Rows are scoped by fixed UUIDs (`d15...` to `d18...`), so data already in
  the shared seed does not change the counts. Each file rolls back.

---

### Task 12: Data slot binding and content import models and clients

**Design note:** none to names or signatures. Two shape details:
`PluginDataSlotBinding.Draft` is
`Pick<PluginDataSlotBinding.T, "attributeMap" | "conceptId" | "datasetId" | "slotId" | "sourceType">`
(the contract's fields, without the `Readonly` wrapper, per the "type aliases
stay mutable" rule; TypeScript ignores `readonly` on properties for
assignability, so callers are unaffected), and `attributeMap` is
`Record<string, string>` on the read model.

**Goal:** Add the `PluginDataSlotBinding` and `PluginContentImport` models
with their parsers, the `PluginDataSlotBindingClient` (with `saveBinding`)
and `PluginContentImportClient`, and an `install` mutation on
`PluginInstallationClient`.

**Files:**
- Create: `shared/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts`
- Create: `shared/models/PluginDataSlotBinding/PluginDataSlotBinding.ts`
- Create: `shared/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts`
- Test: `shared/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.test.ts`
- Create: `shared/models/PluginContentImport/PluginContentImport.types.ts`
- Create: `shared/models/PluginContentImport/PluginContentImport.ts`
- Create: `shared/models/PluginContentImport/PluginContentImportParsers.ts`
- Test: `shared/models/PluginContentImport/PluginContentImportParsers.test.ts`
- Create: `src/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient.ts`
- Test: `src/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient.test.ts`
- Create: `src/clients/plugins/PluginContentImportClient/PluginContentImportClient.ts`
- Modify: `src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts` (add `install`)
- Test: `src/clients/plugins/PluginInstallationClient/PluginInstallationClient.test.ts`

**Depends on:** Task 10 (`plugin_data_slot_bindings`,
`plugin_content_imports`, the `plugin_data_slot_bindings__source_type` enum,
and both RPCs in `shared/types/database.types.ts`).

- [ ] **Step 1: Write the binding model's types and namespace**

`shared/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts`:

```ts
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a data slot binding. */
export type PluginDataSlotBindingId = UUID<"PluginDataSlotBinding">;

/**
 * What kind of workspace record a data slot reads: a case type (`concept`)
 * or a dataset. Mirrors the `plugin_data_slot_bindings__source_type`
 * database enum.
 */
export type PluginDataSlotBindingSourceType =
  Enums<"plugin_data_slot_bindings__source_type">;

/**
 * Which workspace records one installed plugin's data slot reads, and which
 * field fills each slot attribute. A plugin command reads the records
 * through it with `avandar.data.querySlot`.
 */
export type PluginDataSlotBindingRead = Model.Base<
  "PluginDataSlotBinding",
  {
    /**
     * Slot attribute key to the case type attribute id or the dataset column
     * id that fills it. An attribute with no entry is unmapped.
     */
    attributeMap: Record<string, string>;

    /** User who last bound the slot, if that user still exists. */
    boundBy: User.Id | undefined;

    /**
     * The case type the slot reads. Undefined unless `sourceType` is
     * `concept`, and undefined again once that case type is deleted.
     */
    conceptId: Concept.Id | undefined;

    /** Timestamp of when the slot was first bound. */
    createdAt: string;

    /**
     * The dataset the slot reads. Undefined unless `sourceType` is
     * `dataset`, and undefined again once that dataset is deleted.
     */
    datasetId: Dataset.Id | undefined;

    /** The binding's unique identifier. */
    id: PluginDataSlotBindingId;

    /** The plugin install this binding belongs to. */
    installationId: PluginInstallation.Id;

    /** The manifest's data slot id, e.g. `cases`. */
    slotId: string;

    /** Whether the slot reads a case type or a dataset. */
    sourceType: PluginDataSlotBindingSourceType;

    /** Timestamp of the last change to this binding. */
    updatedAt: string;

    /** Workspace of the binding, always the install's workspace. */
    workspaceId: Workspace.Id;
  }
>;

/**
 * One slot's binding as an admin chose it, before it is saved. The install
 * wizard collects one per bound slot, and the plugin card in Settings saves
 * one when a slot is rebound.
 */
export type PluginDataSlotBindingDraft = Pick<
  PluginDataSlotBindingRead,
  "attributeMap" | "conceptId" | "datasetId" | "slotId" | "sourceType"
>;

type PluginDataSlotBindingCrudSpec = {
  tableName: "plugin_data_slot_bindings";
  modelName: "PluginDataSlotBinding";
  modelPrimaryKeyType: PluginDataSlotBindingId;
  modelTypes: {
    Read: PluginDataSlotBindingRead;
    Insert: SetOptional<
      PluginDataSlotBindingRead,
      | "attributeMap"
      | "boundBy"
      | "conceptId"
      | "createdAt"
      | "datasetId"
      | "id"
      | "updatedAt"
    >;
    Update: Partial<PluginDataSlotBindingRead>;
  };
};

/** CRUD type definitions for the PluginDataSlotBinding model. */
export type PluginDataSlotBindingModel = SupabaseCrudModelSpec<
  PluginDataSlotBindingCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
```

`shared/models/PluginDataSlotBinding/PluginDataSlotBinding.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PluginDataSlotBindingDraft,
  PluginDataSlotBindingId,
  PluginDataSlotBindingModel,
  PluginDataSlotBindingSourceType,
} from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts";

/** Parsers for persisted data slot binding rows. */
export { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts";

/** Public namespace for the plugin data slot binding model. */
export namespace PluginDataSlotBinding {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginDataSlotBindingModel = "Read"> =
    PluginDataSlotBindingModel[K];

  /** Identifies a data slot binding. */
  export type Id = PluginDataSlotBindingId;

  /** Whether a slot reads a case type (`concept`) or a dataset. */
  export type SourceType = PluginDataSlotBindingSourceType;

  /** One slot's binding as an admin chose it, before it is saved. */
  export type Draft = PluginDataSlotBindingDraft;
}
```

- [ ] **Step 2: Write the failing binding parser test**

`shared/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  attribute_map: {
    onsetDate: "d1507001-0000-4000-8000-000000000001",
    district_2: "d1507002-0000-4000-8000-000000000002",
  },
  bound_by: null,
  concept_id: "d1504001-0000-4000-8000-000000000001",
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: null,
  id: "d150b001-0000-4000-8000-000000000001",
  installation_id: "d150a001-0000-4000-8000-000000000001",
  slot_id: "cases",
  source_type: "concept" as const,
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: "d1501001-0000-4000-8000-000000000001",
};

describe("PluginDataSlotBindingParsers", () => {
  describe("reading a database row", () => {
    it("keeps the attribute map's keys exactly as stored", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead(DB_ROW);
      expect(model.attributeMap).toEqual({
        onsetDate: "d1507001-0000-4000-8000-000000000001",
        district_2: "d1507002-0000-4000-8000-000000000002",
      });
    });

    it("reads a null dataset_id and bound_by as undefined", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead(DB_ROW);
      expect(model.datasetId).toBeUndefined();
      expect(model.boundBy).toBeUndefined();
    });

    it("drops attribute map entries whose value is not a string", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead({
        ...DB_ROW,
        attribute_map: { onsetDate: 42, district: "d1507002" },
      });
      expect(model.attributeMap).toEqual({ district: "d1507002" });
    });

    it("reads an attribute map that is not an object as empty", () => {
      const model = PluginDataSlotBindingParsers.fromDBReadToModelRead({
        ...DB_ROW,
        attribute_map: ["onsetDate"],
      });
      expect(model.attributeMap).toEqual({});
    });
  });

  describe("inserting a model", () => {
    const insert = () => {
      return PluginDataSlotBindingParsers.fromModelInsertToDBInsert(
        Model.make("PluginDataSlotBinding", {
          attributeMap: { onsetDate: "d1507001" },
          conceptId: undefined,
          datasetId: undefined,
          installationId: DB_ROW.installation_id as PluginInstallation.Id,
          slotId: "cases",
          sourceType: "dataset",
          workspaceId: DB_ROW.workspace_id as Workspace.Id,
        }) as PluginDataSlotBinding.T<"Insert">,
      );
    };

    it("writes the attribute map's keys exactly as given", () => {
      expect(insert().attribute_map).toEqual({ onsetDate: "d1507001" });
    });

    it("writes the other fields in snake case", () => {
      expect(insert()).toMatchObject({
        installation_id: DB_ROW.installation_id,
        slot_id: "cases",
        source_type: "dataset",
        workspace_id: DB_ROW.workspace_id,
      });
    });

    it("sends no concept_id or dataset_id key when both are undefined", () => {
      expect(insert()).not.toHaveProperty("concept_id");
      expect(insert()).not.toHaveProperty("dataset_id");
    });
  });

  describe("updating a model", () => {
    it("sends only the attribute map when only the map changes", () => {
      const update = PluginDataSlotBindingParsers.fromModelUpdateToDBUpdate({
        attributeMap: { onsetDate: "d1507009" },
      });
      expect(update).toEqual({ attribute_map: { onsetDate: "d1507009" } });
    });
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `pnpm vitest run shared/models/PluginDataSlotBinding`
Expected: FAIL, `Error: Failed to resolve import "$/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts" from "shared/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.test.ts". Does the file exist?`

- [ ] **Step 4: Implement the binding parsers**

`shared/models/PluginDataSlotBinding/PluginDataSlotBindingParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  isPlainObject,
  isString,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type {
  PluginDataSlotBindingId,
  PluginDataSlotBindingModel,
} from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  attribute_map: supabaseJsonSchema,
  bound_by: z.uuid().nullable(),
  concept_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid().nullable(),
  id: z.uuid(),
  installation_id: z.uuid(),
  slot_id: z.string(),
  source_type: z.enum(["concept", "dataset"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

type ModelReadWithoutMap = Omit<
  PluginDataSlotBindingModel["Read"],
  "attributeMap"
>;

/**
 * The string entries of a stored attribute map. Any signed-in settings admin
 * can write the column directly, so a value that is not a string is dropped
 * and its attribute reads as unmapped.
 */
function _getAttributeMapFromJson(json: Json): Record<string, string> {
  if (!isPlainObject(json)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(json).filter((entry): entry is [string, string] => {
      return isString(entry[1]);
    }),
  );
}

function _snakeCaseRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return excludeNullsDeep(undefinedsToNullsDeep(snakeCaseKeysDeep(row)));
}

/**
 * Converts `public.plugin_data_slot_bindings` rows to and from the
 * `PluginDataSlotBinding` model. `PluginDataSlotBindingClient` uses it to
 * read and write which records a plugin's data slots read.
 *
 * The attribute map stays outside the deep key transforms: its keys are the
 * plugin's own attribute keys, which must reach the plugin unchanged.
 */
export const PluginDataSlotBindingParsers =
  makeParserRegistry<PluginDataSlotBindingModel>().build({
    modelName: "PluginDataSlotBinding",
    DBReadSchema,
    fromDBReadToModelRead: (
      databaseReadRow,
    ): PluginDataSlotBindingModel["Read"] => {
      const { attribute_map: attributeMap, ...row } = databaseReadRow;
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(row),
      ) as ModelReadWithoutMap;
      return Model.make("PluginDataSlotBinding", {
        ...modelRow,
        attributeMap: _getAttributeMapFromJson(attributeMap),
        boundBy: modelRow.boundBy as User.Id | undefined,
        conceptId: modelRow.conceptId as Concept.Id | undefined,
        datasetId: modelRow.datasetId as Dataset.Id | undefined,
        id: modelRow.id as PluginDataSlotBindingId,
        installationId: modelRow.installationId as PluginInstallation.Id,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { attributeMap, ...row } = model;
      return {
        ..._snakeCaseRow(row),
        attribute_map: attributeMap,
      } as PluginDataSlotBindingModel["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { attributeMap, ...row } = model;
      return {
        ..._snakeCaseRow(row),
        attribute_map: attributeMap,
      } as PluginDataSlotBindingModel["DBUpdate"];
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginDataSlotBindingModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `pnpm vitest run shared/models/PluginDataSlotBinding`
Expected: PASS (8 tests)

- [ ] **Step 6: Write the content import model's types and namespace**

`shared/models/PluginContentImport/PluginContentImport.types.ts`:

```ts
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a plugin content import. */
export type PluginContentImportId = UUID<"PluginContentImport">;

/**
 * One plugin content item a workspace imported as a dataset. The install
 * wizard and the plugin card in Settings read it to tell which items the
 * workspace already has. It outlives the plugin's install.
 */
export type PluginContentImportRead = Model.Base<
  "PluginContentImport",
  {
    /** The manifest's content id, e.g. `provinces`. */
    contentId: string;

    /** Timestamp of when the item was imported. */
    createdAt: string;

    /** The dataset the item was imported as. */
    datasetId: Dataset.Id;

    /** The import's unique identifier. */
    id: PluginContentImportId;

    /** User who imported the item, if that user still exists. */
    importedBy: User.Id | undefined;

    /** Plugin id in `publisher.name` form. */
    pluginId: string;

    /** Workspace the item was imported into. */
    workspaceId: Workspace.Id;
  }
>;

type PluginContentImportCrudSpec = {
  tableName: "plugin_content_imports";
  modelName: "PluginContentImport";
  modelPrimaryKeyType: PluginContentImportId;
  modelTypes: {
    Read: PluginContentImportRead;
    Insert: SetOptional<
      PluginContentImportRead,
      "createdAt" | "id" | "importedBy"
    >;
    Update: Partial<PluginContentImportRead>;
  };
};

/** CRUD type definitions for the PluginContentImport model. */
export type PluginContentImportModel = SupabaseCrudModelSpec<
  PluginContentImportCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
```

`shared/models/PluginContentImport/PluginContentImport.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PluginContentImportId,
  PluginContentImportModel,
} from "$/models/PluginContentImport/PluginContentImport.types.ts";

/** Parsers for persisted plugin content import rows. */
export { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImportParsers.ts";

/** Public namespace for the plugin content import model. */
export namespace PluginContentImport {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginContentImportModel = "Read"> =
    PluginContentImportModel[K];

  /** Identifies a plugin content import. */
  export type Id = PluginContentImportId;
}
```

- [ ] **Step 7: Write the failing content import parser test**

`shared/models/PluginContentImport/PluginContentImportParsers.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImportParsers.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { PluginContentImport } from "$/models/PluginContentImport/PluginContentImport.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  content_id: "provinces",
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: "d1606001-0000-4000-8000-000000000001",
  id: "d160c001-0000-4000-8000-000000000001",
  imported_by: null,
  plugin_id: "avandar.mozambique",
  workspace_id: "d1601001-0000-4000-8000-000000000001",
};

describe("PluginContentImportParsers", () => {
  it("reads a database row into camel case with a null importer left undefined", () => {
    const model = PluginContentImportParsers.fromDBReadToModelRead(DB_ROW);
    expect(model).toMatchObject({
      contentId: "provinces",
      datasetId: DB_ROW.dataset_id,
      pluginId: "avandar.mozambique",
    });
    expect(model.importedBy).toBeUndefined();
  });

  it("writes an insert in snake case that omits imported_by when it is unset", () => {
    const insert = PluginContentImportParsers.fromModelInsertToDBInsert(
      Model.make("PluginContentImport", {
        contentId: "districts",
        datasetId: DB_ROW.dataset_id as Dataset.Id,
        importedBy: undefined,
        pluginId: "avandar.mozambique",
        workspaceId: DB_ROW.workspace_id as Workspace.Id,
      }) as PluginContentImport.T<"Insert">,
    );
    expect(insert).toEqual({
      content_id: "districts",
      dataset_id: DB_ROW.dataset_id,
      plugin_id: "avandar.mozambique",
      workspace_id: DB_ROW.workspace_id,
    });
  });
});
```

- [ ] **Step 8: Run it and confirm it fails**

Run: `pnpm vitest run shared/models/PluginContentImport`
Expected: FAIL, `Error: Failed to resolve import "$/models/PluginContentImport/PluginContentImportParsers.ts" from "shared/models/PluginContentImport/PluginContentImportParsers.test.ts". Does the file exist?`

- [ ] **Step 9: Implement the content import parsers**

`shared/models/PluginContentImport/PluginContentImportParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type {
  PluginContentImportId,
  PluginContentImportModel,
} from "$/models/PluginContentImport/PluginContentImport.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  content_id: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  id: z.uuid(),
  imported_by: z.uuid().nullable(),
  plugin_id: z.string(),
  workspace_id: z.uuid(),
});

/**
 * Converts `public.plugin_content_imports` rows to and from the
 * `PluginContentImport` model. `PluginContentImportClient` uses it to read
 * and record which plugin content a workspace imported.
 */
export const PluginContentImportParsers =
  makeParserRegistry<PluginContentImportModel>().build({
    modelName: "PluginContentImport",
    DBReadSchema,
    fromDBReadToModelRead: (
      databaseReadRow,
    ): PluginContentImportModel["Read"] => {
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(databaseReadRow),
      ) as PluginContentImportModel["Read"];
      return Model.make("PluginContentImport", {
        ...modelRow,
        datasetId: modelRow.datasetId as Dataset.Id,
        id: modelRow.id as PluginContentImportId,
        importedBy: modelRow.importedBy as User.Id | undefined,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
    ),
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginContentImportModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

- [ ] **Step 10: Run it and confirm it passes**

Run: `pnpm vitest run shared/models/PluginContentImport`
Expected: PASS (2 tests)

- [ ] **Step 11: Write the failing client tests**

`src/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { PluginDataSlotBindingClient } =
  await import("./PluginDataSlotBindingClient");

const INSTALLATION_ID = uuid<PluginInstallation.Id>();
const CONCEPT_ID = uuid<Concept.Id>();
const ONSET_ATTRIBUTE_ID = uuid();

const DRAFT: PluginDataSlotBinding.Draft = {
  slotId: "cases",
  sourceType: "concept",
  conceptId: CONCEPT_ID,
  datasetId: undefined,
  attributeMap: { onsetDate: ONSET_ATTRIBUTE_ID },
};

const SAVED_ROW = {
  attribute_map: { onsetDate: ONSET_ATTRIBUTE_ID },
  bound_by: uuid(),
  concept_id: CONCEPT_ID,
  created_at: "2026-11-11T10:00:00+00:00",
  dataset_id: null,
  id: uuid(),
  installation_id: INSTALLATION_ID,
  slot_id: "cases",
  source_type: "concept",
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: uuid(),
};

describe("PluginDataSlotBindingClient.saveBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: SAVED_ROW });
      },
    });
  });

  it("sends the draft to the save RPC under its parameter names", async () => {
    await PluginDataSlotBindingClient.saveBinding({
      installationId: INSTALLATION_ID,
      draft: DRAFT,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_plugin_data_slot_bindings__save",
      {
        p_installation_id: INSTALLATION_ID,
        p_slot_id: "cases",
        p_source_type: "concept",
        p_concept_id: CONCEPT_ID,
        p_attribute_map: { onsetDate: ONSET_ATTRIBUTE_ID },
      },
    );
  });

  it("returns the saved row with the plugin's attribute keys unchanged", async () => {
    const binding = await PluginDataSlotBindingClient.saveBinding({
      installationId: INSTALLATION_ID,
      draft: DRAFT,
    });

    expect(binding.attributeMap).toEqual({ onsetDate: ONSET_ATTRIBUTE_ID });
    expect(binding.datasetId).toBeUndefined();
  });
});
```

`src/clients/plugins/PluginInstallationClient/PluginInstallationClient.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { PluginInstallationClient } = await import("./PluginInstallationClient");

const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const DATE_COLUMN_ID = uuid();

const INSTALL_ROW = {
  created_at: "2026-11-11T10:00:00+00:00",
  granted_permissions: ["data:slots"],
  id: uuid(),
  installed_by: uuid(),
  installed_version: "0.2.0",
  is_enabled: true,
  plugin_id: "avandar.epidemiology",
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: WORKSPACE_ID,
};

describe("PluginInstallationClient.install", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: INSTALL_ROW });
      },
    });
  });

  it("sends each binding to the install RPC with null for the unused source", async () => {
    await PluginInstallationClient.install({
      workspaceId: WORKSPACE_ID,
      pluginId: "avandar.epidemiology",
      installedVersion: "0.2.0",
      grantedPermissions: ["data:slots"],
      bindings: [
        {
          slotId: "cases",
          sourceType: "dataset",
          conceptId: undefined,
          datasetId: DATASET_ID,
          attributeMap: { onsetDate: DATE_COLUMN_ID },
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith("rpc_plugin_installations__install", {
      p_workspace_id: WORKSPACE_ID,
      p_plugin_id: "avandar.epidemiology",
      p_installed_version: "0.2.0",
      p_granted_permissions: ["data:slots"],
      p_bindings: [
        {
          slot_id: "cases",
          source_type: "dataset",
          concept_id: null,
          dataset_id: DATASET_ID,
          attribute_map: { onsetDate: DATE_COLUMN_ID },
        },
      ],
    });
  });

  it("returns the new install as a model", async () => {
    const installation = await PluginInstallationClient.install({
      workspaceId: WORKSPACE_ID,
      pluginId: "avandar.epidemiology",
      installedVersion: "0.2.0",
      grantedPermissions: ["data:slots"],
      bindings: [],
    });

    expect(installation).toMatchObject({
      id: INSTALL_ROW.id,
      pluginId: "avandar.epidemiology",
      grantedPermissions: ["data:slots"],
    });
  });
});
```

- [ ] **Step 12: Run them and confirm they fail**

Run: `pnpm vitest run src/clients/plugins`
Expected: FAIL. `PluginDataSlotBindingClient.test.ts` fails with
`Error: Failed to resolve import "./PluginDataSlotBindingClient"`, and both
`PluginInstallationClient.install` tests fail with
`TypeError: PluginInstallationClient.install is not a function`.

- [ ] **Step 13: Implement the clients**

Create the two new clients, and replace the whole of
`src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts`:

`src/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient.ts`:

```ts
import { PluginDataSlotBindingParsers } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * Reads and writes which workspace records a plugin's data slots read. A
 * slot is bound or rebound through `saveBinding`, which replaces the slot's
 * binding in one call. Unbinding a slot is a plain `delete`.
 */
export const PluginDataSlotBindingClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginDataSlotBinding",
    tableName: "plugin_data_slot_bindings",
    dbTablePrimaryKey: "id",
    parsers: PluginDataSlotBindingParsers,
    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * Binds one data slot of an install, replacing its binding when it
         * has one, and returns the saved binding.
         */
        saveBinding: async (params: {
          installationId: PluginInstallation.Id;
          draft: PluginDataSlotBinding.Draft;
        }): Promise<PluginDataSlotBinding.T> => {
          const logger = clientLogger.appendName("saveBinding");
          logger.log("Saving data slot binding", params);
          const { draft } = params;
          const { data } = await dbClient
            .rpc("rpc_plugin_data_slot_bindings__save", {
              p_installation_id: params.installationId,
              p_slot_id: draft.slotId,
              p_source_type: draft.sourceType,
              p_concept_id: draft.conceptId,
              p_dataset_id: draft.datasetId,
              p_attribute_map: draft.attributeMap,
            })
            .throwOnError();
          return parsers.fromDBReadToModelRead(data);
        },
      };
    },
  }),
  {
    mutationFns: ["saveBinding"],
  },
);
```

`src/clients/plugins/PluginContentImportClient/PluginContentImportClient.ts`:

```ts
import { PluginContentImportParsers } from "$/models/PluginContentImport/PluginContentImport";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * Reads and records the plugin content a workspace imported as datasets. For
 * example, the install wizard reads it to skip content the workspace already
 * has, and inserts a row once an item's dataset is uploaded.
 */
export const PluginContentImportClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginContentImport",
    tableName: "plugin_content_imports",
    dbTablePrimaryKey: "id",
    parsers: PluginContentImportParsers,
  }),
);
```

`src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts`:

```ts
import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { Json } from "$/types/database.types";

type PluginInstallParams = {
  workspaceId: Workspace.Id;
  pluginId: string;
  installedVersion: string;
  grantedPermissions: readonly string[];
  bindings: readonly PluginDataSlotBinding.Draft[];
};

function _makeBindingPayloadFromDraft(
  draft: PluginDataSlotBinding.Draft,
): Json {
  return {
    slot_id: draft.slotId,
    source_type: draft.sourceType,
    concept_id: draft.conceptId ?? null,
    dataset_id: draft.datasetId ?? null,
    attribute_map: draft.attributeMap,
  };
}

/**
 * Reads and writes the plugins installed in a workspace. A plugin is
 * installed through `install`, which writes the install and its data slot
 * bindings together.
 */
export const PluginInstallationClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginInstallation",
    tableName: "plugin_installations",
    dbTablePrimaryKey: "id",
    parsers: PluginInstallationParsers,
    mutations: ({ clientLogger, dbClient, parsers }) => {
      return {
        /**
         * Installs a plugin with its data slot bindings in one transaction
         * and returns the install. A binding that fails leaves no install
         * behind.
         */
        install: async (
          params: Readonly<PluginInstallParams>,
        ): Promise<PluginInstallation.T> => {
          const logger = clientLogger.appendName("install");
          logger.log("Installing plugin", params);
          const { data } = await dbClient
            .rpc("rpc_plugin_installations__install", {
              p_workspace_id: params.workspaceId,
              p_plugin_id: params.pluginId,
              p_installed_version: params.installedVersion,
              p_granted_permissions: [...params.grantedPermissions],
              p_bindings: params.bindings.map(_makeBindingPayloadFromDraft),
            })
            .throwOnError();
          return parsers.fromDBReadToModelRead(data);
        },
      };
    },
  }),
  {
    mutationFns: ["install"],
  },
);
```

- [ ] **Step 14: Run the tests and confirm they pass**

Run: `pnpm vitest run shared/models/PluginDataSlotBinding shared/models/PluginContentImport shared/models/PluginInstallation src/clients/plugins`
Expected: PASS (24 tests in 5 files)

- [ ] **Step 15: Type check, format, lint**

Run:

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/PluginDataSlotBinding/*.ts shared/models/PluginContentImport/*.ts src/clients/plugins/*/*.ts
pnpm exec eslint shared/models/PluginDataSlotBinding shared/models/PluginContentImport src/clients/plugins
pnpm exec tsc -p tsconfig.app.json --noEmit
deno check shared/models/PluginDataSlotBinding shared/models/PluginContentImport
```

Expected: no errors, and `git status --short` shows no formatting changes.

- [ ] **Step 16: Commit**

```bash
git add shared/models/PluginDataSlotBinding shared/models/PluginContentImport src/clients/plugins
git commit -m "feat(plugins): add data slot binding and content import models and clients" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `attribute_map` stays outside the deep key transforms. Its keys are the
  plugin's own attribute keys, and `camelCaseKeysDeep` or
  `snakeCaseKeysDeep` would rename `onsetDate` to `onset_date` on the way
  in. `AvaMapParsers` keeps `config` out of them for the same reason.
- The parser drops attribute map values that are not strings. Any settings
  admin can write the column through PostgREST, and a dropped entry reads as
  an unmapped attribute (a broken binding) instead of crashing the card.
- `saveBinding` passes `undefined` for the unused source id. supabase-js
  serializes it away, and the RPC's `default null` applies.
- `install` sends `null` (not `undefined`) for the unused source inside
  `p_bindings`, because that array is JSON the RPC reads with
  `jsonb_to_recordset`.
- Both new tables are excluded from the desktop SQLite mirror (Task 10), the
  same as `plugin_installations`. On desktop, the generated CRUD reads go to
  SQLite like every other client; the RPC mutations always go to Supabase.
- `deno check` matters: `shared/` is Deno-reachable, so its imports keep
  their `.ts` extensions. `src/` imports do not.

---

### Task 13: Data slot sources and binding status (`src/lib/pluginDataSlots/`, part 1)

**Goal:** Add the shared data slot logic the settings UI and the command
runtime both use: which field types each slot attribute accepts, the
`DataSlotSource` shape built from a case type or a dataset, a non-hook loader
for a binding's source, and `getDataSlotBindingStatus`.

**Files:**
- Create: `src/lib/pluginDataSlots/DataSlotSource.types.ts`
- Create: `src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.ts`
- Test: `src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.test.ts`
- Create: `src/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept.ts`
- Test: `src/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept.test.ts`
- Create: `src/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset.ts`
- Test: `src/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset.test.ts`
- Create: `src/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource.ts`
- Test: `src/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource.test.ts`
- Create: `src/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus.ts`
- Test: `src/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus.test.ts`

**Depends on:** Task 2 (`DataSlotAttributeType`, `PluginDataSlot`, and
`PluginDataSlotAttribute`, exported as types from
`@avandar/plugin-manifest/runtime`), Task 12 (`PluginDataSlotBinding`).

- [ ] **Step 1: Write the failing accepted-types test**

`src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

const ALL_DATA_TYPES: readonly AvaDataType.T[] = [
  "boolean",
  "bigint",
  "double",
  "time",
  "date",
  "timestamp",
  "varchar",
];

const ACCEPTED_CASES: ReadonlyArray<
  [DataSlotAttributeType, readonly AvaDataType.T[]]
> = [
  ["number", ["bigint", "double"]],
  ["date", ["date", "timestamp"]],
  ["text", ["varchar"]],
  ["boolean", ["boolean"]],
  ["geo.admin1", ["varchar"]],
  ["geo.admin2", ["varchar"]],
];

describe("isDataTypeAcceptedBySlotAttribute", () => {
  it.each(ACCEPTED_CASES)(
    "accepts exactly the listed field types for a %s attribute",
    (type, acceptedDataTypes) => {
      const accepted = ALL_DATA_TYPES.filter((dataType) => {
        return isDataTypeAcceptedBySlotAttribute({ type, dataType });
      });
      expect(accepted).toEqual(acceptedDataTypes);
    },
  );
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute`
Expected: FAIL, `Error: Failed to resolve import "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute" ... Does the file exist?`

- [ ] **Step 3: Implement it**

`src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute.ts`:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

/**
 * The field types each data slot attribute type can be bound to. A `geo`
 * type binds to text, because a province or district is stored as a name or
 * a code. Read when a binding UI lists the fields an attribute may take, and
 * when a saved binding is checked.
 */
export const DATA_SLOT_ACCEPTED_DATA_TYPES: Readonly<
  Record<DataSlotAttributeType, readonly AvaDataType.T[]>
> = {
  number: ["bigint", "double"],
  date: ["date", "timestamp"],
  text: ["varchar"],
  boolean: ["boolean"],
  "geo.admin1": ["varchar"],
  "geo.admin2": ["varchar"],
};

/**
 * Whether a case type attribute or dataset column of `dataType` can fill a
 * data slot attribute of `type`. Use it wherever a field is offered for, or
 * checked against, a slot attribute, for example to filter a field picker.
 */
export function isDataTypeAcceptedBySlotAttribute(
  options: Readonly<{ type: DataSlotAttributeType; dataType: AvaDataType.T }>,
): boolean {
  return DATA_SLOT_ACCEPTED_DATA_TYPES[options.type].includes(options.dataType);
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm vitest run src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute`
Expected: PASS (6 tests)

- [ ] **Step 5: Write the source types**

`src/lib/pluginDataSlots/DataSlotSource.types.ts`:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";

/**
 * One field of a data slot source that a slot attribute can be bound to: a
 * case type attribute or a dataset column. The binding UI lists these, a
 * binding's `attributeMap` stores their `id`, and the slot query selects
 * their `columnName`.
 */
export type DataSlotSourceField = Readonly<{
  /** The case type attribute id or dataset column id. */
  id: string;

  /** The field's column name in the source's DuckDB relation. */
  columnName: string;

  /** The name the binding UI shows for the field. */
  label: string;

  /** The field's type, which decides the slot attributes it can fill. */
  dataType: AvaDataType.T;
}>;

/**
 * A case type or dataset a data slot can read, with the fields a slot
 * attribute can be bound to. Built from the stored records by
 * `loadDataSlotSource`, then read to check a binding and to build the slot
 * query.
 *
 * - `concept`: a case type, queried through its `concept_<id>` view. List
 *   fields are left out, since a slot attribute holds one value per row.
 * - `dataset`: a dataset, queried through its own relation.
 */
export type DataSlotSource =
  | Readonly<{
      kind: "concept";
      conceptId: Concept.Id;
      name: string;
      fields: readonly DataSlotSourceField[];
    }>
  | Readonly<{
      kind: "dataset";
      datasetId: Dataset.Id;
      name: string;
      fields: readonly DataSlotSourceField[];
    }>;
```

- [ ] **Step 6: Write the failing source builder tests**

`src/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const CONCEPT = Model.make("Concept", {
  id: "concept_cases",
  name: "Measles cases",
}) as Concept.T;

function _makeAttribute(
  id: string,
  name: string,
  options: Readonly<{ dataType?: AvaDataType.T; isArray?: boolean }> = {},
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: CONCEPT.id,
    workspaceId: "workspace_1",
    name,
    description: undefined,
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    dataType: options.dataType ?? "varchar",
    mappingType: "dataset_column",
    isLabel: false,
    isIdentifier: false,
    allowManualEdit: false,
    isArray: options.isArray ?? false,
    bucketGrain: undefined,
  }) as ConceptAttribute.T;
}

describe("makeDataSlotSourceFromConcept", () => {
  it("names the case type and lists its single-value fields", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_onset", "Onset date", { dataType: "date" }),
        _makeAttribute("attr_district", "District"),
      ],
    });

    expect(source).toEqual({
      kind: "concept",
      conceptId: "concept_cases",
      name: "Measles cases",
      fields: [
        {
          id: "attr_district",
          columnName: "District",
          label: "District",
          dataType: "varchar",
        },
        {
          id: "attr_onset",
          columnName: "Onset date",
          label: "Onset date",
          dataType: "date",
        },
      ],
    });
  });

  it("leaves out list fields, which hold several values per record", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_onset", "Onset date", { dataType: "date" }),
        _makeAttribute("attr_symptoms", "Symptoms", { isArray: true }),
      ],
    });

    expect(
      source.fields.map((field) => {
        return field.id;
      }),
    ).toEqual(["attr_onset"]);
  });

  it("takes the view's suffixed column name for a field named like the record key", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [_makeAttribute("attr_key", "external_id")],
    });

    expect(source.fields[0]).toMatchObject({
      columnName: "external_id_2",
      label: "external_id",
    });
  });

  it("names columns against every field, so a list field still claims its name", () => {
    const source = makeDataSlotSourceFromConcept({
      concept: CONCEPT,
      attributes: [
        _makeAttribute("attr_a", "District", { isArray: true }),
        _makeAttribute("attr_b", "District"),
      ],
    });

    expect(source.fields).toEqual([
      {
        id: "attr_b",
        columnName: "District_2",
        label: "District",
        dataType: "varchar",
      },
    ]);
  });
});
```

`src/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

const DATASET = Model.make("Dataset", {
  id: "dataset_line_list",
  name: "line_list.csv",
}) as Dataset.T;

function _makeColumn(
  options: Readonly<{
    id: string;
    name: string;
    columnIdx: number;
    dataType: AvaDataType.T;
  }>,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    ...options,
    datasetId: DATASET.id,
    originalName: `original ${options.name}`,
  }) as DatasetColumn.T;
}

describe("makeDataSlotSourceFromDataset", () => {
  it("lists the dataset's columns in column order, named as the relation names them", () => {
    const source = makeDataSlotSourceFromDataset({
      dataset: DATASET,
      columns: [
        _makeColumn({
          id: "col_district",
          name: "district",
          columnIdx: 1,
          dataType: "varchar",
        }),
        _makeColumn({
          id: "col_onset",
          name: "onset",
          columnIdx: 0,
          dataType: "date",
        }),
      ],
    });

    expect(source).toEqual({
      kind: "dataset",
      datasetId: "dataset_line_list",
      name: "line_list.csv",
      fields: [
        {
          id: "col_onset",
          columnName: "onset",
          label: "onset",
          dataType: "date",
        },
        {
          id: "col_district",
          columnName: "district",
          label: "district",
          dataType: "varchar",
        },
      ],
    });
  });
});
```

- [ ] **Step 7: Run them and confirm they fail**

Run: `pnpm vitest run src/lib/pluginDataSlots/makeDataSlotSourceFromConcept src/lib/pluginDataSlots/makeDataSlotSourceFromDataset`
Expected: FAIL, both files with `Error: Failed to resolve import "@/lib/pluginDataSlots/makeDataSlotSourceFrom..." ... Does the file exist?`

- [ ] **Step 8: Implement the source builders**

`src/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept.ts`:

```ts
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Makes the data slot source for a case type: one field per single-value
 * attribute, named by the column the case type's view gives it. List
 * attributes are left out, since a slot attribute holds one value per row.
 *
 * `attributes` must be every attribute of the case type, list ones
 * included, because they all claim column names in the view.
 */
export function makeDataSlotSourceFromConcept(
  options: Readonly<{
    concept: Concept.T;
    attributes: readonly ConceptAttribute.T[];
  }>,
): DataSlotSource {
  const viewColumnsById = ConceptAttribute.getViewColumnNames(
    options.attributes,
  );
  const fields = [...options.attributes]
    .sort(ConceptAttribute.compareInViewOrder)
    .filter((attribute) => {
      return !attribute.isArray;
    })
    .map((attribute): DataSlotSourceField => {
      return {
        id: attribute.id,
        columnName: viewColumnsById.get(attribute.id)!.columnName,
        label: attribute.name,
        dataType: attribute.dataType,
      };
    });
  return {
    kind: "concept",
    conceptId: options.concept.id,
    name: options.concept.name,
    fields,
  };
}
```

`src/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset.ts`:

```ts
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Makes the data slot source for a dataset: one field per column, in column
 * order. A column's `name` is both its label and its column in the
 * dataset's DuckDB relation.
 */
export function makeDataSlotSourceFromDataset(
  options: Readonly<{
    dataset: Dataset.T;
    columns: readonly DatasetColumn.T[];
  }>,
): DataSlotSource {
  const fields = [...options.columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column): DataSlotSourceField => {
      return {
        id: column.id,
        columnName: column.name,
        label: column.name,
        dataType: column.dataType,
      };
    });
  return {
    kind: "dataset",
    datasetId: options.dataset.id,
    name: options.dataset.name,
    fields,
  };
}
```

- [ ] **Step 9: Run them and confirm they pass**

Run: `pnpm vitest run src/lib/pluginDataSlots/makeDataSlotSourceFromConcept src/lib/pluginDataSlots/makeDataSlotSourceFromDataset`
Expected: PASS (5 tests)

- [ ] **Step 10: Write the failing loader test**

`src/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource.test.ts`:

```ts
import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const {
  getAttributesMock,
  getColumnsMock,
  getConceptByIdMock,
  getDatasetByIdMock,
} = vi.hoisted(() => {
  return {
    getAttributesMock: vi.fn(),
    getColumnsMock: vi.fn(),
    getConceptByIdMock: vi.fn(),
    getDatasetByIdMock: vi.fn(),
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getById: getConceptByIdMock } };
});

vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return { ConceptAttributeClient: { getAll: getAttributesMock } };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { getById: getDatasetByIdMock } };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { getAll: getColumnsMock } };
});

const { loadDataSlotSource } =
  await import("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource");

const CONCEPT = Model.make("Concept", {
  id: "concept_cases",
  name: "Measles cases",
}) as Concept.T;

const ONSET_ATTRIBUTE = Model.make("ConceptAttribute", {
  id: "attr_onset",
  conceptId: CONCEPT.id,
  name: "Onset date",
  dataType: "date",
  isArray: false,
}) as ConceptAttribute.T;

const DATASET = Model.make("Dataset", {
  id: "dataset_line_list",
  name: "line_list.csv",
}) as Dataset.T;

const ONSET_COLUMN = Model.make("DatasetColumn", {
  id: "col_onset",
  datasetId: DATASET.id,
  name: "onset",
  columnIdx: 0,
  dataType: "date",
}) as DatasetColumn.T;

describe("loadDataSlotSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConceptByIdMock.mockResolvedValue(CONCEPT);
    getAttributesMock.mockResolvedValue([ONSET_ATTRIBUTE]);
    getDatasetByIdMock.mockResolvedValue(DATASET);
    getColumnsMock.mockResolvedValue([ONSET_COLUMN]);
  });

  it("builds a case type source from the stored case type and its attributes", async () => {
    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(source).toEqual({
      kind: "concept",
      conceptId: CONCEPT.id,
      name: "Measles cases",
      fields: [
        {
          id: "attr_onset",
          columnName: "Onset date",
          label: "Onset date",
          dataType: "date",
        },
      ],
    });
  });

  it("reads only the bound case type's attributes", async () => {
    await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(getAttributesMock).toHaveBeenCalledWith(
      where("concept_id", "eq", CONCEPT.id),
    );
  });

  it("is undefined when the case type is gone or the user cannot read it", async () => {
    getConceptByIdMock.mockResolvedValue(undefined);

    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: CONCEPT.id,
      datasetId: undefined,
    });

    expect(source).toBeUndefined();
  });

  it("is undefined without reading anything when the bound id was cleared", async () => {
    const source = await loadDataSlotSource({
      sourceType: "concept",
      conceptId: undefined,
      datasetId: undefined,
    });

    expect(source).toBeUndefined();
    expect(getConceptByIdMock).not.toHaveBeenCalled();
  });

  it("builds a dataset source from the stored dataset and its columns", async () => {
    const source = await loadDataSlotSource({
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET.id,
    });

    expect(source).toEqual({
      kind: "dataset",
      datasetId: DATASET.id,
      name: "line_list.csv",
      fields: [
        {
          id: "col_onset",
          columnName: "onset",
          label: "onset",
          dataType: "date",
        },
      ],
    });
    expect(getColumnsMock).toHaveBeenCalledWith(
      where("dataset_id", "eq", DATASET.id),
    );
  });

  it("is undefined when the dataset is gone or the user cannot read it", async () => {
    getDatasetByIdMock.mockResolvedValue(undefined);

    const source = await loadDataSlotSource({
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET.id,
    });

    expect(source).toBeUndefined();
  });
});
```

- [ ] **Step 11: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/pluginDataSlots/loadDataSlotSource`
Expected: FAIL, `Error: Failed to resolve import "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource" ... Does the file exist?`

- [ ] **Step 12: Implement the loader**

`src/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource.ts`:

```ts
import { where } from "@avandar/utils";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";

async function _loadConceptSource(
  conceptId: Concept.Id | undefined,
): Promise<DataSlotSource | undefined> {
  if (conceptId === undefined) {
    return undefined;
  }
  const [concept, attributes] = await Promise.all([
    ConceptClient.getById({ id: conceptId }),
    ConceptAttributeClient.getAll(where("concept_id", "eq", conceptId)),
  ]);
  return concept === undefined
    ? undefined
    : makeDataSlotSourceFromConcept({ concept, attributes });
}

async function _loadDatasetSource(
  datasetId: Dataset.Id | undefined,
): Promise<DataSlotSource | undefined> {
  if (datasetId === undefined) {
    return undefined;
  }
  const [dataset, columns] = await Promise.all([
    DatasetClient.getById({ id: datasetId }),
    DatasetColumnClient.getAll(where("dataset_id", "eq", datasetId)),
  ]);
  return dataset === undefined
    ? undefined
    : makeDataSlotSourceFromDataset({ dataset, columns });
}

/**
 * Reads the case type or dataset a data slot binding names, with its
 * fields, as a data slot source. Undefined when the binding's source was
 * deleted or the current user cannot read it, which a binding status reads
 * as a missing source. Not a hook, so the command runtime can call it as
 * well as the settings UI.
 */
export async function loadDataSlotSource(
  options: Readonly<{
    sourceType: PluginDataSlotBinding.SourceType;
    conceptId: Concept.Id | undefined;
    datasetId: Dataset.Id | undefined;
  }>,
): Promise<DataSlotSource | undefined> {
  return await match(options.sourceType)
    .with("concept", () => {
      return _loadConceptSource(options.conceptId);
    })
    .with("dataset", () => {
      return _loadDatasetSource(options.datasetId);
    })
    .exhaustive();
}
```

- [ ] **Step 13: Run it and confirm it passes**

Run: `pnpm vitest run src/lib/pluginDataSlots/loadDataSlotSource`
Expected: PASS (6 tests)

- [ ] **Step 14: Write the failing binding status test**

`src/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

const CONCEPT_ID = "concept_cases" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  concept: "Case",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD = {
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
} as const;

const DISTRICT_FIELD = {
  id: "attr_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
} as const;

const SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

function _makeBinding(
  attributeMap: Readonly<Record<string, string>>,
): Pick<
  PluginDataSlotBinding.T,
  "attributeMap" | "conceptId" | "datasetId" | "sourceType"
> {
  return {
    sourceType: "concept",
    conceptId: CONCEPT_ID,
    datasetId: undefined,
    attributeMap: { ...attributeMap },
  };
}

describe("getDataSlotBindingStatus", () => {
  it("is unbound when the slot has no binding", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: undefined,
        source: undefined,
      }),
    ).toEqual({ kind: "unbound" });
  });

  it("is broken with a missing source when the bound case type was deleted", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: {
          ..._makeBinding({ onsetDate: ONSET_FIELD.id }),
          conceptId: undefined,
        },
        source: undefined,
      }),
    ).toEqual({ kind: "broken", problems: [{ kind: "source_missing" }] });
  });

  it("is broken with a missing source when the source is a different record", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: ONSET_FIELD.id }),
        source: { ...SOURCE, conceptId: "concept_other" as Concept.Id },
      }),
    ).toEqual({ kind: "broken", problems: [{ kind: "source_missing" }] });
  });

  it("is broken with a missing field when a mapped field no longer exists", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({
          onsetDate: ONSET_FIELD.id,
          district: "attr_deleted",
        }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [{ kind: "field_missing", attributeKey: "district" }],
    });
  });

  it("is broken with a type mismatch when a mapped field's type no longer fits", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: DISTRICT_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [
        {
          kind: "type_mismatch",
          attributeKey: "onsetDate",
          dataType: "varchar",
        },
      ],
    });
  });

  it("is broken when a required attribute is unmapped", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ district: DISTRICT_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "broken",
      problems: [{ kind: "required_unmapped", attributeKey: "onsetDate" }],
    });
  });

  it("lists every problem when several attributes are wrong", () => {
    const status = getDataSlotBindingStatus({
      slot: CASES_SLOT,
      binding: _makeBinding({ district: "attr_deleted" }),
      source: SOURCE,
    });

    expect(status).toEqual({
      kind: "broken",
      problems: [
        { kind: "required_unmapped", attributeKey: "onsetDate" },
        { kind: "field_missing", attributeKey: "district" },
      ],
    });
  });

  it("is bound with an unmapped optional attribute read as undefined", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({ onsetDate: ONSET_FIELD.id }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "bound",
      fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
    });
  });

  it("is bound with every attribute's field when all are mapped", () => {
    expect(
      getDataSlotBindingStatus({
        slot: CASES_SLOT,
        binding: _makeBinding({
          onsetDate: ONSET_FIELD.id,
          district: DISTRICT_FIELD.id,
        }),
        source: SOURCE,
      }),
    ).toEqual({
      kind: "bound",
      fieldsByAttributeKey: {
        onsetDate: ONSET_FIELD,
        district: DISTRICT_FIELD,
      },
    });
  });

  it("ignores attribute map entries the slot does not declare", () => {
    const status = getDataSlotBindingStatus({
      slot: CASES_SLOT,
      binding: _makeBinding({
        onsetDate: ONSET_FIELD.id,
        retired: "attr_deleted",
      }),
      source: SOURCE,
    });

    expect(status.kind).toBe("bound");
  });
});
```

- [ ] **Step 15: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/pluginDataSlots/getDataSlotBindingStatus`
Expected: FAIL, `Error: Failed to resolve import "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus" ... Does the file exist?`

- [ ] **Step 16: Implement the binding status**

`src/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus.ts`:

```ts
import { match } from "ts-pattern";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  PluginDataSlot,
  PluginDataSlotAttribute,
} from "@avandar/plugin-manifest/runtime";

/**
 * One reason a data slot binding is broken. Settings shows each one next to
 * the slot, and `querySlot` names them in its `SlotBroken` error.
 *
 * - `source_missing`: the case type or dataset was deleted, or the current
 *   user cannot read it.
 * - `field_missing`: the attribute is mapped to a field that no longer
 *   exists.
 * - `type_mismatch`: the mapped field's type no longer fits the attribute.
 * - `required_unmapped`: a required attribute has no field.
 */
export type DataSlotBindingProblem =
  | Readonly<{ kind: "source_missing" }>
  | Readonly<{ kind: "field_missing"; attributeKey: string }>
  | Readonly<{
      kind: "type_mismatch";
      attributeKey: string;
      dataType: AvaDataType.T;
    }>
  | Readonly<{ kind: "required_unmapped"; attributeKey: string }>;

/**
 * Whether a data slot can be read, worked out from its binding when it is
 * read. Settings shows it on the plugin card, and `querySlot` refuses to
 * run unless it is `bound`.
 *
 * - `unbound`: the slot has no binding.
 * - `broken`: the binding cannot be read, for every listed reason.
 * - `bound`: every mapped attribute's field, by attribute key. An unmapped
 *   optional attribute is present with `undefined`.
 */
export type DataSlotBindingStatus =
  | Readonly<{ kind: "unbound" }>
  | Readonly<{ kind: "broken"; problems: readonly DataSlotBindingProblem[] }>
  | Readonly<{
      kind: "bound";
      fieldsByAttributeKey: Readonly<
        Record<string, DataSlotSourceField | undefined>
      >;
    }>;

type BindingSourceFields = Pick<
  PluginDataSlotBinding.T,
  "attributeMap" | "conceptId" | "datasetId" | "sourceType"
>;

type AttributeCheck = {
  attributeKey: string;
  attribute: PluginDataSlotAttribute;
  fieldId: string | undefined;
  field: DataSlotSourceField | undefined;
};

function _isSourceOfBinding(
  source: DataSlotSource,
  binding: Readonly<BindingSourceFields>,
): boolean {
  return match(source)
    .with({ kind: "concept" }, (conceptSource) => {
      return (
        binding.sourceType === "concept" &&
        conceptSource.conceptId === binding.conceptId
      );
    })
    .with({ kind: "dataset" }, (datasetSource) => {
      return (
        binding.sourceType === "dataset" &&
        datasetSource.datasetId === binding.datasetId
      );
    })
    .exhaustive();
}

function _getAttributeProblem(
  check: Readonly<AttributeCheck>,
): DataSlotBindingProblem | undefined {
  const { attributeKey, attribute, fieldId, field } = check;
  if (fieldId === undefined) {
    return attribute.required
      ? { kind: "required_unmapped", attributeKey }
      : undefined;
  }
  if (field === undefined) {
    return { kind: "field_missing", attributeKey };
  }
  return isDataTypeAcceptedBySlotAttribute({
    type: attribute.type,
    dataType: field.dataType,
  })
    ? undefined
    : { kind: "type_mismatch", attributeKey, dataType: field.dataType };
}

/**
 * Works out whether a data slot's binding can be read: unbound, broken with
 * every reason, or bound with the field behind each slot attribute. Pass the
 * source `loadDataSlotSource` read for the binding, or `undefined` when it
 * found none. Use it wherever a slot is shown or read, for example the
 * plugin card's Data section or a command's `querySlot`.
 */
export function getDataSlotBindingStatus(
  options: Readonly<{
    slot: PluginDataSlot;
    binding: Readonly<BindingSourceFields> | undefined;
    source: DataSlotSource | undefined;
  }>,
): DataSlotBindingStatus {
  const { slot, binding, source } = options;
  if (binding === undefined) {
    return { kind: "unbound" };
  }
  if (source === undefined || !_isSourceOfBinding(source, binding)) {
    return { kind: "broken", problems: [{ kind: "source_missing" }] };
  }
  const fieldsById = new Map(
    source.fields.map((field) => {
      return [field.id, field];
    }),
  );
  const problems: DataSlotBindingProblem[] = [];
  const fieldsByAttributeKey: Record<string, DataSlotSourceField | undefined> =
    {};
  Object.entries(slot.attributes).forEach(([attributeKey, attribute]) => {
    const fieldId = binding.attributeMap[attributeKey];
    const field = fieldId === undefined ? undefined : fieldsById.get(fieldId);
    const problem = _getAttributeProblem({
      attributeKey,
      attribute,
      fieldId,
      field,
    });
    if (problem !== undefined) {
      problems.push(problem);
    }
    fieldsByAttributeKey[attributeKey] =
      problem === undefined ? field : undefined;
  });
  return problems.length > 0
    ? { kind: "broken", problems }
    : { kind: "bound", fieldsByAttributeKey };
}
```

- [ ] **Step 17: Run every test in the folder and confirm they pass**

Run: `pnpm vitest run src/lib/pluginDataSlots`
Expected: PASS (27 tests in 5 files)

- [ ] **Step 18: Type check, format, lint**

Run:

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore $(git ls-files --others --exclude-standard src/lib/pluginDataSlots)
pnpm exec eslint src/lib/pluginDataSlots
pnpm exec tsc -p tsconfig.app.json --noEmit
```

Expected: no errors, and no formatting changes.

- [ ] **Step 19: Commit**

```bash
git add src/lib/pluginDataSlots
git commit -m "feat(plugins): read data slot sources and binding status" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `src/lib/pluginDataSlots/` is outside the paths
  `pnpm check:plugin-bundle` counts. Import manifest types from
  `@avandar/plugin-manifest/runtime` with `import type` only.
- `makeDataSlotSourceFromConcept` must receive every attribute of the case
  type, list attributes included: `ConceptAttribute.getViewColumnNames`
  hands out suffixed names (`District_2`) in view order across all fields, so
  leaving list fields out before naming would give a field the wrong column.
- A dataset column's `name` is its column in the DuckDB relation (the same
  name `generateIndividuals` passes as a needed column).
- `getDataSlotBindingStatus` checks that the source is the one the binding
  names, so a stale source reads as `source_missing`. Attribute map entries
  the slot does not declare are ignored.

---

### Task 14: Data slot SQL, query runner, and binding check (`src/lib/pluginDataSlots/`, part 2)

**Design note:** `runDataSlotQuery` takes one more, optional, option:
`fields?: readonly DataSlotSourceField[]`, the fields the SQL reads. For a
dataset source it becomes `neededColumnsByDatasetId`, so the engine loads
only those columns; when omitted, every field of the source is named. The
three-option call `runDataSlotQuery({ workspaceId, source, sql })` still works.
`querySlot` (Task 19) may pass the bound fields
(`Object.values(fieldsByAttributeKey).filter(isDefined)`) to load less.

**Goal:** Build the SQL that reads a bound data slot, run it through the
workspace query session, and check a mapping before it is saved (row count,
filled count per attribute, first 5 rows).

**Files:**
- Create: `src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding.ts` (also exports `QUERY_SLOT_MAX_ROWS`)
- Test: `src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/__tests__/makeDataSlotSqlFromBinding.test.ts`
- Test: `src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/__tests__/makeDataSlotSqlFromBinding.executed.test.ts`
- Create: `src/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery.ts`
- Test: `src/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery.test.ts`
- Create: `src/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding.ts`
- Test: `src/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding.test.ts`

**Depends on:** Task 2 (`PluginDataSlot`, `DataSlotAttributeType`), Task 13
(`DataSlotSource`, `DataSlotSourceField`).

- [ ] **Step 1: Write the failing SQL builder tests**

The builder has a unit test and an executed DuckDB test, so both live in
`__tests__/`.

`src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/__tests__/makeDataSlotSqlFromBinding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";

const CONCEPT_ID = "7a1c0e52-3f1d-4c55-9a43-1d2b5e6f7a80" as Concept.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "attr_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
};

const CONCEPT_SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

const DATASET_SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

describe("makeDataSlotSqlFromBinding", () => {
  it("selects each mapped field under its attribute key from the case type's view", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: CONCEPT_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    ).toBe(
      `SELECT "Onset date" AS "onsetDate", "District" AS "district"\n` +
        `FROM "concept_${CONCEPT_ID}"`,
    );
  });

  it("reads a dataset from the relation named by its bare id", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    ).toBe(
      `SELECT "Onset date" AS "onsetDate", "District" AS "district"\n` +
        `FROM "${DATASET_ID}"`,
    );
  });

  it("ends with a LIMIT when one is given", () => {
    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
        limit: 200_001,
      }),
    ).toMatch(/\nLIMIT 200001$/);
  });

  it("quotes a column name that holds a double quote", () => {
    const quotedField: DataSlotSourceField = {
      ...ONSET_FIELD,
      columnName: `Onset "first" date`,
    };

    expect(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: DATASET_SOURCE,
        fieldsByAttributeKey: { onsetDate: quotedField, district: undefined },
      }),
    ).toContain(`"Onset ""first"" date" AS "onsetDate"`);
  });

  it.each<[DataSlotAttributeType, string]>([
    ["number", "DOUBLE"],
    ["date", "DATE"],
    ["text", "VARCHAR"],
    ["boolean", "BOOLEAN"],
    ["geo.admin1", "VARCHAR"],
    ["geo.admin2", "VARCHAR"],
  ])(
    "selects an unmapped optional %s attribute as a NULL of type %s",
    (type, sqlType) => {
      const slot: PluginDataSlot = {
        ...CASES_SLOT,
        attributes: {
          extra: { type, title: "%slot.cases.extra%", required: false },
        },
      };

      expect(
        makeDataSlotSqlFromBinding({
          slot,
          source: DATASET_SOURCE,
          fieldsByAttributeKey: { extra: undefined },
        }),
      ).toBe(
        `SELECT CAST(NULL AS ${sqlType}) AS "extra"\nFROM "${DATASET_ID}"`,
      );
    },
  );
});
```

`src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/__tests__/makeDataSlotSqlFromBinding.executed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { DuckDBConnection } from "@duckdb/node-api";

const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;
const CONCEPT_ID = "7a1c0e52-3f1d-4c55-9a43-1d2b5e6f7a80" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "col_district",
  columnName: "District",
  label: "District",
  dataType: "varchar",
};

/**
 * A three-case line list stored under the dataset's bare id, plus a case
 * type view over it named the way the query engine names one.
 */
async function _createRelations(connection: DuckDBConnection): Promise<void> {
  await connection.run(`
    CREATE TABLE "${DATASET_ID}" AS
    SELECT * FROM (VALUES
      (DATE '2026-01-05', 'Maputo', 'ignored'),
      (DATE '2026-01-06', 'Beira', 'ignored'),
      (DATE '2026-01-06', NULL, 'ignored')
    ) AS cases("Onset date", "District", "Notes")
  `);
  await connection.run(`
    CREATE VIEW "concept_${CONCEPT_ID}" AS
    SELECT "Onset date", "District" FROM "${DATASET_ID}"
  `);
}

async function _runRows(
  sql: string,
): Promise<{ columnNames: string[]; rows: Array<Record<string, unknown>> }> {
  return await withDuckDb(async (connection) => {
    await _createRelations(connection);
    const reader = await connection.runAndReadAll(sql);
    return {
      columnNames: reader.columnNames(),
      rows: reader.getRowObjectsJson() as Array<Record<string, unknown>>,
    };
  });
}

describe("makeDataSlotSqlFromBinding in DuckDB", () => {
  it("reads a dataset's mapped columns under the slot's attribute keys", async () => {
    const { columnNames, rows } = await _runRows(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source: {
          kind: "dataset",
          datasetId: DATASET_ID,
          name: "line_list.csv",
          fields: [ONSET_FIELD, DISTRICT_FIELD],
        },
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
      }),
    );

    expect(columnNames).toEqual(["onsetDate", "district"]);
    expect(rows).toEqual([
      { onsetDate: "2026-01-05", district: "Maputo" },
      { onsetDate: "2026-01-06", district: "Beira" },
      { onsetDate: "2026-01-06", district: null },
    ]);
  });

  it("reads a case type through its concept view", async () => {
    const source: DataSlotSource = {
      kind: "concept",
      conceptId: CONCEPT_ID,
      name: "Measles cases",
      fields: [ONSET_FIELD, DISTRICT_FIELD],
    };

    const { rows } = await _runRows(
      makeDataSlotSqlFromBinding({
        slot: CASES_SLOT,
        source,
        fieldsByAttributeKey: {
          onsetDate: ONSET_FIELD,
          district: DISTRICT_FIELD,
        },
        limit: 2,
      }),
    );

    expect(rows).toHaveLength(2);
  });

  it("returns a NULL text column for an unmapped optional attribute", async () => {
    const sql = makeDataSlotSqlFromBinding({
      slot: CASES_SLOT,
      source: {
        kind: "dataset",
        datasetId: DATASET_ID,
        name: "line_list.csv",
        fields: [ONSET_FIELD],
      },
      fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
    });

    const columnTypes = await withDuckDb(async (connection) => {
      await _createRelations(connection);
      const reader = await connection.runAndReadAll(
        `SELECT any_value(typeof("district")) AS district_type, count("district") AS filled FROM (${sql})`,
      );
      return reader.getRowObjectsJson();
    });

    expect(columnTypes).toEqual([{ district_type: "VARCHAR", filled: "0" }]);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run:

```bash
pnpm vitest run src/lib/pluginDataSlots/makeDataSlotSqlFromBinding
pnpm test:executed src/lib/pluginDataSlots/makeDataSlotSqlFromBinding
```

Expected: FAIL. The unit test fails with `Error: Failed to resolve import "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding" ... Does the file exist?`,
and the executed test with `Error: Cannot find package '@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding'`.

- [ ] **Step 3: Implement the SQL builder**

`src/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding.ts`:

```ts
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";

/** Rows `querySlot` returns at most. It queries one more to set isTruncated. */
export const QUERY_SLOT_MAX_ROWS = 200_000;

/**
 * The SQL type of the NULL an unmapped optional attribute is selected as, so
 * a slot's result has the same column types whatever is mapped.
 */
const NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE: Readonly<
  Record<DataSlotAttributeType, string>
> = {
  number: "DOUBLE",
  date: "DATE",
  text: "VARCHAR",
  boolean: "BOOLEAN",
  "geo.admin1": "VARCHAR",
  "geo.admin2": "VARCHAR",
};

function _getTableNameFromSource(source: DataSlotSource): string {
  return source.kind === "concept"
    ? RelationRef.toTableName({ kind: "concept", id: source.conceptId })
    : RelationRef.toTableName({ kind: "dataset", id: source.datasetId });
}

/**
 * Makes the SQL that reads a bound data slot: one column per slot attribute,
 * in manifest order, named by the attribute key, from the case type's view or
 * the dataset's relation. An unmapped optional attribute is a typed NULL, so
 * the plugin sees the same columns for every binding and never a workspace
 * field name.
 *
 * Use it wherever a slot's records are read, for example a command's
 * `querySlot` or the binding check in Settings.
 */
export function makeDataSlotSqlFromBinding(
  options: Readonly<{
    slot: PluginDataSlot;
    source: DataSlotSource;
    fieldsByAttributeKey: Readonly<
      Record<string, DataSlotSourceField | undefined>
    >;
    limit?: number;
  }>,
): string {
  const { slot, source, fieldsByAttributeKey, limit } = options;
  const selectList = Object.entries(slot.attributes).map(
    ([attributeKey, attribute]) => {
      const field = fieldsByAttributeKey[attributeKey];
      const expression =
        field === undefined
          ? `CAST(NULL AS ${NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE[attribute.type]})`
          : quoteSqlIdentifier(field.columnName);
      return `${expression} AS ${quoteSqlIdentifier(attributeKey)}`;
    },
  );
  const fromClause = `FROM ${quoteSqlIdentifier(_getTableNameFromSource(source))}`;
  const limitClause = limit === undefined ? "" : `\nLIMIT ${limit}`;
  return `SELECT ${selectList.join(", ")}\n${fromClause}${limitClause}`;
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run:

```bash
pnpm vitest run src/lib/pluginDataSlots/makeDataSlotSqlFromBinding
pnpm test:executed src/lib/pluginDataSlots/makeDataSlotSqlFromBinding
```

Expected: PASS (10 unit tests, then 3 executed tests)

- [ ] **Step 5: Write the failing query runner test**

`src/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { runDataSlotQuery } =
  await import("@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;
const SQL = `SELECT "onset" AS "onsetDate"\nFROM "${DATASET_ID}"`;

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const DISTRICT_FIELD: DataSlotSourceField = {
  id: "col_district",
  columnName: "district",
  label: "district",
  dataType: "varchar",
};

const DATASET_SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

const RESULT: QueryResult.T = {
  id: "c6f1d1e2-3a4b-4c5d-8e6f-7a8b9c0d1e2f" as QueryResult.Id,
  columns: [{ name: "onsetDate", dataType: "date" }],
  data: [{ onsetDate: "2026-01-05" }],
  numRows: 1,
};

describe("runDataSlotQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runQueryMock.mockResolvedValue(RESULT);
  });

  it("returns the rows the workspace query session read", async () => {
    const result = await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
    });

    expect(result).toBe(RESULT);
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ rawSql: SQL, workspaceId: WORKSPACE_ID }),
    );
  });

  it("loads only the given fields' columns of a dataset", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
      fields: [ONSET_FIELD],
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset"] },
      }),
    );
  });

  it("loads every field's column of a dataset when no fields are given", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: DATASET_SOURCE,
      sql: SQL,
    });

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset", "district"] },
      }),
    );
  });

  it("names no dataset columns for a case type, whose view plans its own", async () => {
    await runDataSlotQuery({
      workspaceId: WORKSPACE_ID,
      source: {
        kind: "concept",
        conceptId: "concept_cases" as Concept.Id,
        name: "Measles cases",
        fields: [ONSET_FIELD],
      },
      sql: SQL,
    });

    expect(runQueryMock.mock.calls[0]![0].neededColumnsByDatasetId).toBe(
      undefined,
    );
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/pluginDataSlots/runDataSlotQuery`
Expected: FAIL, `Error: Failed to resolve import "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery" ... Does the file exist?`

- [ ] **Step 7: Implement the query runner**

`src/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery.ts`:

```ts
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * Runs SQL that reads a data slot's source in the browser's DuckDB, with
 * the current user's own access to that source. For a dataset it names the
 * columns to load, the given `fields` or every field of the source, so the
 * engine does not have to infer them from the SQL. A case type's view plans
 * its own columns.
 *
 * Use it for SQL made by `makeDataSlotSqlFromBinding`, or SQL that wraps it,
 * for example a count over a slot's rows.
 */
export async function runDataSlotQuery(
  options: Readonly<{
    workspaceId: Workspace.Id;
    source: DataSlotSource;
    sql: string;
    fields?: readonly DataSlotSourceField[];
  }>,
): Promise<QueryResult.T> {
  const { workspaceId, source, sql, fields = source.fields } = options;
  return await WorkspaceQuerySession.runQuery({
    rawSql: sql,
    workspaceId,
    neededColumnsByDatasetId:
      source.kind === "dataset"
        ? {
            [source.datasetId]: fields.map((field) => {
              return field.columnName;
            }),
          }
        : undefined,
  });
}
```

- [ ] **Step 8: Run it and confirm it passes**

Run: `pnpm vitest run src/lib/pluginDataSlots/runDataSlotQuery`
Expected: PASS (4 tests)

- [ ] **Step 9: Write the failing binding check test**

`src/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { checkDataSlotBinding } =
  await import("@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const DATASET_ID = "0b6f4f0e-8f7e-4d8e-9b0a-2c1d3e4f5a6b" as Dataset.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: DATASET_ID,
  name: "line_list.csv",
  fields: [
    ONSET_FIELD,
    {
      id: "col_notes",
      columnName: "notes",
      label: "notes",
      dataType: "varchar",
    },
  ],
};

const SAMPLE_ROWS = [
  { onsetDate: "2026-01-05", district: null },
  { onsetDate: "2026-01-06", district: null },
];

function _mockQueryResults(countsRow: Readonly<Record<string, unknown>>): void {
  runQueryMock.mockImplementation(async (params: { rawSql: string }) => {
    return params.rawSql.startsWith("SELECT count(*)")
      ? { id: "counts", columns: [], data: [countsRow], numRows: 1 }
      : { id: "sample", columns: [], data: SAMPLE_ROWS, numRows: 2 };
  });
}

async function _checkOnsetOnly(): ReturnType<typeof checkDataSlotBinding> {
  return await checkDataSlotBinding({
    workspaceId: WORKSPACE_ID,
    slot: CASES_SLOT,
    source: SOURCE,
    fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
  });
}

describe("checkDataSlotBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts the slot's rows and each attribute's filled rows as numbers", async () => {
    _mockQueryResults({
      row_count: 120n,
      filled_count_0: 118n,
      filled_count_1: 0n,
    });

    const result = await _checkOnsetOnly();

    expect(result.rowCount).toBe(120);
    expect(result.filledCountsByAttributeKey).toEqual({
      onsetDate: 118,
      district: 0,
    });
  });

  it("reads counts the engine already returned as numbers", async () => {
    _mockQueryResults({ row_count: 3, filled_count_0: 2, filled_count_1: 0 });

    const result = await _checkOnsetOnly();

    expect(result.rowCount).toBe(3);
    expect(result.filledCountsByAttributeKey.onsetDate).toBe(2);
  });

  it("returns the slot's first rows as samples, from a query of at most 5 rows", async () => {
    _mockQueryResults({
      row_count: 2n,
      filled_count_0: 2n,
      filled_count_1: 0n,
    });

    const result = await _checkOnsetOnly();

    expect(result.sampleRows).toEqual(SAMPLE_ROWS);
    expect(runQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ rawSql: expect.stringMatching(/\nLIMIT 5$/) }),
    );
  });

  it("loads only the dataset columns the binding maps", async () => {
    _mockQueryResults({
      row_count: 2n,
      filled_count_0: 2n,
      filled_count_1: 0n,
    });

    await _checkOnsetOnly();

    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        neededColumnsByDatasetId: { [DATASET_ID]: ["onset"] },
      }),
    );
  });
});
```

- [ ] **Step 10: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/pluginDataSlots/checkDataSlotBinding`
Expected: FAIL, `Error: Failed to resolve import "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding" ... Does the file exist?`

- [ ] **Step 11: Implement the binding check**

`src/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding.ts`:

```ts
import { isDefined } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { makeDataSlotSqlFromBinding } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { runDataSlotQuery } from "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

/** How many of the slot's first rows the check returns. */
const SAMPLE_ROW_COUNT = 5;

/**
 * What a data slot's current mapping reads: how many rows, how many of them
 * have a value for each slot attribute, and the first rows. The binding UI
 * shows it so an admin can tell the mapping reads what they meant.
 */
export type DataSlotCheckResult = Readonly<{
  rowCount: number;
  filledCountsByAttributeKey: Readonly<Record<string, number>>;
  sampleRows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

type DataSlotCheckOptions = {
  workspaceId: Workspace.Id;
  slot: PluginDataSlot;
  source: DataSlotSource;
  fieldsByAttributeKey: Readonly<
    Record<string, DataSlotSourceField | undefined>
  >;
};

/** A DuckDB count, which the query session may return as a bigint. */
function _getNumberFromCount(value: unknown): number {
  return typeof value === "bigint" || typeof value === "number"
    ? Number(value)
    : 0;
}

/**
 * Counts every row, and each attribute's non-null rows, of the slot query.
 * Counts are aliased by position, so attribute keys that differ only in
 * case cannot collide.
 */
function _makeCountsSql(
  options: Readonly<{ attributeKeys: readonly string[]; slotSql: string }>,
): string {
  const filledCounts = options.attributeKeys.map((attributeKey, index) => {
    return `count(${quoteSqlIdentifier(attributeKey)}) AS filled_count_${index}`;
  });
  return [
    `SELECT count(*) AS row_count, ${filledCounts.join(", ")}`,
    `FROM (${options.slotSql}) AS slot_rows`,
  ].join("\n");
}

/**
 * Runs a data slot's query on a mapping before it is saved, and reports
 * what it reads: the row count, each attribute's filled count, and the
 * first rows. Use it wherever an admin is choosing a slot's fields, for
 * example the install wizard's data slot step.
 */
export async function checkDataSlotBinding(
  options: Readonly<DataSlotCheckOptions>,
): Promise<DataSlotCheckResult> {
  const { workspaceId, slot, source, fieldsByAttributeKey } = options;
  const attributeKeys = Object.keys(slot.attributes);
  const mappedFields = Object.values(fieldsByAttributeKey).filter(isDefined);
  const fields = mappedFields.length > 0 ? mappedFields : undefined;
  const slotSql = makeDataSlotSqlFromBinding({
    slot,
    source,
    fieldsByAttributeKey,
  });
  const counts = await runDataSlotQuery({
    workspaceId,
    source,
    fields,
    sql: _makeCountsSql({ attributeKeys, slotSql }),
  });
  const sample = await runDataSlotQuery({
    workspaceId,
    source,
    fields,
    sql: makeDataSlotSqlFromBinding({
      slot,
      source,
      fieldsByAttributeKey,
      limit: SAMPLE_ROW_COUNT,
    }),
  });
  const countsRow = counts.data[0] ?? {};
  return {
    rowCount: _getNumberFromCount(countsRow.row_count),
    filledCountsByAttributeKey: Object.fromEntries(
      attributeKeys.map((attributeKey, index) => {
        return [
          attributeKey,
          _getNumberFromCount(countsRow[`filled_count_${index}`]),
        ];
      }),
    ),
    sampleRows: sample.data,
  };
}
```

- [ ] **Step 12: Run every test in the folder and confirm they pass**

Run:

```bash
pnpm vitest run src/lib/pluginDataSlots
pnpm test:executed src/lib/pluginDataSlots
```

Expected: PASS (45 tests in 8 files, then 3 executed tests in 1 file)

- [ ] **Step 13: Type check, format, lint**

Run:

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore $(git ls-files --others --exclude-standard src/lib/pluginDataSlots)
pnpm exec eslint src/lib/pluginDataSlots
pnpm exec tsc -p tsconfig.app.json --noEmit
```

Expected: no errors, and no formatting changes.

- [ ] **Step 14: Commit**

```bash
git add src/lib/pluginDataSlots
git commit -m "feat(plugins): build, run, and check data slot queries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The relation is quoted: a dataset's table name is its bare UUID, and a
  case type's is `concept_<uuid>`, the same names the query session plans
  and loads (`buildGeometrySampleSql` quotes them the same way).
- DuckDB returns `count(*)` as a `BIGINT`, which the browser session hands
  back as a JS `bigint`. `checkDataSlotBinding` converts it with `Number`,
  and a test covers both `bigint` and `number`.
- The counts query aliases each attribute's count by position
  (`filled_count_0`, ...), so two attribute keys that differ only in case
  cannot collide in DuckDB, which ignores identifier case.
- The two check queries run one after the other, not in parallel, so they do
  not compete for the same DuckDB dataset lease.
- `pnpm test:executed` runs under Node, not jsdom. Only
  `*.executed.test.ts` files run there.

---

### Task 15: Install wizard shell, Review and Confirm, and the Install action

**Goal:** The plugin card's Install button opens an install wizard: a Mantine `Stepper` in a large modal titled "Install <plugin name>" that reviews the plugin, lists only the steps its manifest needs, and installs it with `PluginInstallationClient.install`. The Data slots and Content pages render nothing until Tasks 16 and 17 fill them in.

**Files:**
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/openPluginInstallWizard.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest.ts` (moved out of `PluginDetails.tsx` so the Review step can reuse it)
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginInstallButton.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection.tsx`, `PluginAdditionsSection.tsx`, `PluginDataAccessSection.tsx` (a `headingOrder` prop; an AI tools line), `PluginDetails.tsx` (uses the moved helper, passes `aiToolCount`)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.tsx`, `PluginActionButton.tsx`, `PluginActions.types.ts`, `usePluginActionCopy.ts` (Install opens the wizard; the other actions keep their confirm modals)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.ts`, `usePluginInstallationMutations.ts` (install opens the wizard; the insert mutation goes), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard.tsx` (passes `manifestModule`)
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest.test.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`
- Modify (tests): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`

**Depends on:** Task 2 (`dataSlots` on the manifest and `PluginAdditionsSection.dataSlotTitles`), Task 3 (`contributes.content` and `PluginAdditionsSection.contentCount`), Task 12 (`PluginInstallationClient.install` and its `useInstall` hook).

- [ ] **Step 1: Write the failing test for the wizard's steps**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

function _makeManifest(
  options: { hasDataSlots?: boolean; hasContent?: boolean } = {},
): PluginManifest {
  return {
    dataSlots: options.hasDataSlots
      ? { cases: { title: "%slot.cases.title%", attributes: {} } }
      : {},
    contributes: {
      content: options.hasContent ? [{ id: "provinces", kind: "dataset" }] : [],
    },
  } as unknown as PluginManifest;
}

describe("getInstallWizardStepsFromManifest", () => {
  it("skips Data slots and Content for a plugin that declares neither", () => {
    expect(getInstallWizardStepsFromManifest(_makeManifest())).toEqual([
      "review",
      "confirm",
    ]);
  });

  it("adds Data slots between Review and Confirm when the plugin declares data slots", () => {
    expect(
      getInstallWizardStepsFromManifest(_makeManifest({ hasDataSlots: true })),
    ).toEqual(["review", "dataSlots", "confirm"]);
  });

  it("adds Content between Review and Confirm when the plugin bundles content", () => {
    expect(
      getInstallWizardStepsFromManifest(_makeManifest({ hasContent: true })),
    ).toEqual(["review", "content", "confirm"]);
  });

  it("puts Data slots before Content when the plugin declares both", () => {
    expect(
      getInstallWizardStepsFromManifest(
        _makeManifest({ hasDataSlots: true, hasContent: true }),
      ),
    ).toEqual(["review", "dataSlots", "content", "confirm"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest"`

- [ ] **Step 3: Implement the step list**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest.ts`:

```ts
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * One step of the plugin install wizard, in the order the wizard shows them.
 *
 * - `review`: what the plugin adds and which data it can read.
 * - `dataSlots`: choose the records each data slot reads.
 * - `content`: choose which bundled datasets to import.
 * - `confirm`: a summary, the Install button, and import progress.
 */
export type InstallWizardStep = "review" | "dataSlots" | "content" | "confirm";

/**
 * Gets the install wizard steps a manifest needs, leaving out the steps it
 * has nothing for: Data slots without data slots, and Content without
 * bundled content. The wizard reads it to build its stepper.
 */
export function getInstallWizardStepsFromManifest(
  manifest: PluginManifest,
): readonly InstallWizardStep[] {
  const hasDataSlots = Object.keys(manifest.dataSlots).length > 0;
  const hasContent = manifest.contributes.content.length > 0;
  return [
    "review",
    ...(hasDataSlots ? (["dataSlots"] as const) : []),
    ...(hasContent ? (["content"] as const) : []),
    "confirm",
  ];
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing tests for the AI tools line in "What it adds"**

The Review step reuses the card's additions section, and the spec lists AI tools among what a plugin adds, so the section gains a count of the tools a plugin gives Ask Avandar.

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.test.tsx`:

```diff
@@ -21,15 +21,17 @@ function _makeManifest(options: {
   hasChartTypes: boolean;
   permissions: string[];
   dataSlots?: Record<string, unknown>;
   contentCount?: number;
+  aiToolCount?: number;
 }): PluginManifest {
   const {
     hasToolbarCommand,
     hasChartTypes,
     permissions,
     dataSlots = {},
     contentCount = 0,
+    aiToolCount = 0,
   } = options;
   return {
     id: "avandar.epidemiology",
     permissions,
@@ -53,8 +55,11 @@ function _makeManifest(options: {
         : [],
       content: Array.from({ length: contentCount }, (_value, index) => {
         return { id: `item-${index}`, kind: "dataset" };
       }),
+      aiTools: Array.from({ length: aiToolCount }, (_value, index) => {
+        return { name: `tool_${index}` };
+      }),
     },
   } as unknown as PluginManifest;
 }
 
@@ -236,8 +241,28 @@ describe("PluginDetails", () => {
       expect(screen.queryByText("Nothing yet.")).not.toBeInTheDocument();
     },
   );
 
+  it.each([
+    ["1 tool Ask Avandar can use", 1],
+    ["2 tools Ask Avandar can use", 2],
+  ])(
+    "lists %s when the plugin declares that many AI tools",
+    async (text, aiToolCount) => {
+      await _renderExpandedDetails(
+        _makeManifest({
+          hasToolbarCommand: false,
+          hasChartTypes: false,
+          permissions: [],
+          aiToolCount,
+        }),
+      );
+
+      expect(screen.getByText(text)).toBeInTheDocument();
+      expect(screen.queryByText("Nothing yet.")).not.toBeInTheDocument();
+    },
+  );
+
   it("says its charts see only their own rows when the plugin adds chart types", async () => {
     await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);
 
     expect(
@@ -268,8 +293,9 @@ describe("PluginDetails", () => {
     expect(
       screen.queryByText(/Records you choose for it:/),
     ).not.toBeInTheDocument();
     expect(screen.queryByText(/to import/)).not.toBeInTheDocument();
+    expect(screen.queryByText(/Ask Avandar can use/)).not.toBeInTheDocument();
   });
 
   it("says the plugin uses no workspace data when it has no permissions and no chart types", async () => {
     await _renderExpandedDetails(EMPTY_MANIFEST);
```

- [ ] **Step 6: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails`
Expected: FAIL, 2 failed | 17 passed, `Unable to find an element with the text: 1 tool Ask Avandar can use` (and `2 tools ...`)

- [ ] **Step 7: Add `headingOrder`, the AI tools line, and the shared titles helper**

`headingOrder` lets the wizard nest these sections under its own step heading (modal title h2, step h3, sections h4) instead of the card's h6. The titles helper moves out of `PluginDetails.tsx` unchanged.

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection.tsx` with:

```tsx
import { Stack, Title } from "@mantine/core";
import type { TitleOrder } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{
  title: ReactNode;
  children: ReactNode;

  /**
   * The heading level of the title. 6 by default, which nests it under the
   * plugin name's order 5 heading on a plugin's settings card.
   */
  headingOrder?: TitleOrder;
}>;

/**
 * One labeled block inside a plugin's expanded details, such as "What it
 * adds". Used by `PluginAdditionsSection` and `PluginDataAccessSection` so
 * both read as the same kind of heading, under the plugin's name on its
 * settings card or under a step heading in the install wizard.
 */
export function PluginDetailsSection({
  title,
  children,
  headingOrder = 6,
}: Props): JSX.Element {
  return (
    <Stack gap="xxs">
      <Title order={headingOrder} size="sm" fw={500}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection.tsx` with:

```tsx
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { useMemo } from "react";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import type { TitleOrder } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Data Explorer toolbar command titles, already localized. */
  toolbarCommandTitles: readonly string[];

  /** Chart type titles, already localized. */
  chartTypeTitles: readonly string[];

  /** Data slot titles, already localized. */
  dataSlotTitles: readonly string[];

  /** How many datasets the plugin bundles under `contributes.content`. */
  contentCount: number;

  /** How many tools the plugin gives Ask Avandar under `aiTools`. */
  aiToolCount: number;

  /** The section heading's level. See `PluginDetailsSection`. */
  headingOrder?: TitleOrder;
}>;

type AdditionLine = { key: string; isShown: boolean; text: ReactNode };

/** Each list of titles joined the way the reader's language joins a list. */
function useJoinedTitles(props: Props): {
  toolbarCommands: string;
  chartTypes: string;
  dataSlots: string;
} {
  const { i18n } = useLingui();
  // Narrow conjunctions keep a short run of names as "A, B" in English and
  // still use each locale's own separator, such as "、" in Chinese.
  const listFormat = useMemo(() => {
    return new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
      style: "narrow",
    });
  }, [i18n.locale]);
  return {
    toolbarCommands: listFormat.format(props.toolbarCommandTitles),
    chartTypes: listFormat.format(props.chartTypeTitles),
    dataSlots: listFormat.format(props.dataSlotTitles),
  };
}

function useAdditionLines(props: Props): AdditionLine[] {
  const { t } = useLingui();
  const { toolbarCommands, chartTypes, dataSlots } = useJoinedTitles(props);
  return [
    {
      key: "toolbar",
      isShown: props.toolbarCommandTitles.length > 0,
      text: t`Data Explorer toolbar: ${toolbarCommands}`,
    },
    {
      key: "chartTypes",
      isShown: props.chartTypeTitles.length > 0,
      text: t`Chart types: ${chartTypes}`,
    },
    {
      key: "aiTools",
      isShown: props.aiToolCount > 0,
      text: (
        <Plural
          value={props.aiToolCount}
          one="# tool Ask Avandar can use"
          other="# tools Ask Avandar can use"
        />
      ),
    },
    {
      key: "dataSlots",
      isShown: props.dataSlotTitles.length > 0,
      text: t`Records you choose for it: ${dataSlots}`,
    },
    {
      key: "content",
      isShown: props.contentCount > 0,
      text: (
        <Plural
          value={props.contentCount}
          one="# dataset to import"
          other="# datasets to import"
        />
      ),
    },
  ];
}

/**
 * The "What it adds" block of a plugin's details: one line per place in the
 * app the plugin adds to, naming each addition, plus how many tools it gives
 * Ask Avandar, the records it asks an admin to choose for it, and how many
 * datasets it can import, so an admin knows what to look for and what to set
 * up after installing it. Lines with nothing to name are left out.
 */
export function PluginAdditionsSection(props: Props): JSX.Element {
  const lines = useAdditionLines(props).filter((line) => {
    return line.isShown;
  });
  return (
    <PluginDetailsSection
      title={<Trans>What it adds</Trans>}
      headingOrder={props.headingOrder}
    >
      {lines.length > 0 ? (
        <List size="sm">
          {lines.map((line) => {
            return <List.Item key={line.key}>{line.text}</List.Item>;
          })}
        </List>
      ) : (
        <Text size="sm" c="dimmed">
          <Trans>Nothing yet.</Trans>
        </Text>
      )}
    </PluginDetailsSection>
  );
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection.tsx`:

```diff
@@ -2,14 +2,18 @@ import { matchLiteral } from "@avandar/utils";
 import { Trans, useLingui } from "@lingui/react/macro";
 import { List, Text } from "@mantine/core";
 import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
 import type { PluginPermission } from "@avandar/plugin-manifest/runtime";
+import type { TitleOrder } from "@mantine/core";
 
 type Props = Readonly<{
   permissions: readonly PluginPermission[];
 
   /** Whether the plugin adds chart types, which read their own rows. */
   hasChartTypes: boolean;
+
+  /** The section heading's level. See `PluginDetailsSection`. */
+  headingOrder?: TitleOrder;
 }>;
 
 /**
  * The "Data it can read" block of a plugin's details: each permission the
@@ -18,8 +22,9 @@ type Props = Readonly<{
  */
 export function PluginDataAccessSection({
   permissions,
   hasChartTypes,
+  headingOrder,
 }: Props): JSX.Element {
   const { t } = useLingui();
   const permissionLines = permissions.map((permission) => {
     return {
@@ -40,9 +45,12 @@ export function PluginDataAccessSection({
         },
       ]
     : permissionLines;
   return (
-    <PluginDetailsSection title={<Trans>Data it can read</Trans>}>
+    <PluginDetailsSection
+      title={<Trans>Data it can read</Trans>}
+      headingOrder={headingOrder}
+    >
       {lines.length === 0 ? (
         <Text size="sm" c="dimmed">
           <Trans>Uses no workspace data.</Trans>
         </Text>
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest.ts`:

```ts
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { getContributionsFromManifest } from "@/lib/plugins/getContributionsFromManifest/getContributionsFromManifest";
import type {
  PluginLocaleMessages,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/** What a plugin adds, by kind, with each title in the reader's language. */
export type LocalizedContributionTitles = {
  toolbarCommandTitles: string[];
  chartTypeTitles: string[];
  dataSlotTitles: string[];
};

/**
 * Gets the titles of a plugin's toolbar commands, chart types, and data
 * slots, localized with the plugin's own strings. Use it to fill
 * `PluginAdditionsSection`, for example on a plugin's settings card or in the
 * install wizard's review step.
 */
export function getLocalizedContributionTitlesFromManifest(options: {
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
  locale: string;
}): LocalizedContributionTitles {
  const { manifest, strings, locale } = options;
  const { dataExplorerToolbarCommands, chartTypes } =
    getContributionsFromManifest(manifest);
  const getTitles = (contributions: ReadonlyArray<{ title: string }>) => {
    return contributions.map((contribution) => {
      return getLocalizedTextFromManifestStrings({
        strings,
        locale,
        value: contribution.title,
      });
    });
  };
  return {
    toolbarCommandTitles: getTitles(dataExplorerToolbarCommands),
    chartTypeTitles: getTitles(chartTypes),
    dataSlotTitles: getTitles(Object.values(manifest.dataSlots)),
  };
}
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails.tsx` with:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Box, Collapse, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useId } from "react";
import { getLocalizedContributionTitlesFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest";
import { PluginAdditionsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection";
import { PluginDataAccessSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection";
import { PluginDetailsToggle } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsToggle";
import type {
  PluginLocaleMessages,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  manifest: PluginManifest;

  /** The plugin's locale strings, for localizing its contribution titles. */
  strings: PluginLocaleMessages;

  /** The id of the card's heading, which describes the toggle. */
  headingId: string;
}>;

/**
 * What a plugin adds and which data it can read, in plain language, behind a
 * "See more" toggle so a plugin's settings card stays short until an admin
 * wants the detail to judge the plugin before installing it.
 */
export function PluginDetails({
  manifest,
  strings,
  headingId,
}: Props): JSX.Element {
  const { i18n } = useLingui();
  const [isExpanded, { toggle }] = useDisclosure(false);
  const regionId = useId();
  const titles = getLocalizedContributionTitlesFromManifest({
    manifest,
    strings,
    locale: i18n.locale,
  });
  return (
    <>
      <PluginDetailsToggle
        isExpanded={isExpanded}
        regionId={regionId}
        headingId={headingId}
        onToggle={toggle}
      />
      {/* The id sits on a wrapper because Collapse renders nothing while
          closed under reduced motion, and the toggle must always point at
          an element. */}
      <Box id={regionId}>
        <Collapse expanded={isExpanded}>
          <Stack gap="sm" pt="xxs">
            <PluginAdditionsSection
              {...titles}
              contentCount={manifest.contributes.content.length}
              aiToolCount={manifest.contributes.aiTools.length}
            />
            <PluginDataAccessSection
              permissions={manifest.permissions}
              hasChartTypes={titles.chartTypeTitles.length > 0}
            />
          </Stack>
        </Collapse>
      </Box>
    </>
  );
}
```

- [ ] **Step 8: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails`
Expected: PASS (19 tests)

- [ ] **Step 9: Write the failing wizard tests**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

type InstallOptions = {
  onSuccess: (installation: unknown) => void;
  onError: (error: Error) => void;
};

const mocks = vi.hoisted(() => {
  return {
    install: vi.fn(),
    installOptions: undefined as InstallOptions | undefined,
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginInstallationClient", "getAll"];
          },
        },
        useInstall: (options: InstallOptions) => {
          mocks.installOptions = options;
          return [mocks.install, false, {}];
        },
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyError: mocks.notifyError,
  };
});

const INSTALLATION = {
  id: "installation-id",
  pluginId: "avandar.epidemiology",
};

let queryClient: QueryClient;
let onClose: ReturnType<typeof vi.fn>;

function _makeManifestModule(
  manifestOverrides: Record<string, unknown> = {},
): PluginManifestModule {
  return {
    manifest: {
      id: "avandar.epidemiology",
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      license: "MIT",
      icon: "chart-dots",
      permissions: ["data:context"],
      dataSlots: {},
      contributes: {
        commands: [{ id: "run", title: "%run.title%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
        vizTypes: [],
        aiTools: [],
        content: [],
      },
      ...manifestOverrides,
    },
    strings: {
      en: {
        name: "Epidemiology",
        description: "Charts disease spread.",
        "run.title": "Linear regression",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderWizard(manifestModule = _makeManifestModule()): void {
  render(
    <PluginInstallWizard
      pluginName="Epidemiology"
      manifestModule={manifestModule}
      onClose={onClose}
    />,
    { wrapper: QueryWrapper },
  );
}

function _clickButton(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function _succeedInstall(): void {
  mocks.install.mockImplementation(() => {
    mocks.installOptions?.onSuccess(INSTALLATION);
  });
}

describe("PluginInstallWizard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.install.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    onClose = vi.fn();
  });

  it("opens on Review with the plugin's version, license, and additions", () => {
    _renderWizard();

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
    expect(
      screen.getByText("avandar · version 1.2.0 · MIT license"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Data Explorer toolbar: Linear regression"),
    ).toBeInTheDocument();
  });

  it("marks only Review and Confirm in the stepper for a plugin with no data slots or content", () => {
    _renderWizard();

    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.queryByText("Records")).not.toBeInTheDocument();
    expect(screen.queryByText("Datasets")).not.toBeInTheDocument();
  });

  it("moves focus to the Summary heading when Next is pressed on Review", () => {
    _renderWizard();

    _clickButton("Next");

    expect(screen.getByRole("heading", { name: "Summary" })).toHaveFocus();
  });

  it("moves focus back to the Review heading when Back is pressed", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Back");

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
  });

  it("offers no Back on the first page", () => {
    _renderWizard();

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("installs with the manifest's version, every permission, and no bindings", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.install).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      pluginId: "avandar.epidemiology",
      installedVersion: "1.2.0",
      grantedPermissions: ["data:context"],
      bindings: [],
    });
  });

  it("refreshes every plugin installs query once installed", () => {
    _renderWizard();

    expect(mocks.installOptions).toMatchObject({
      queriesToInvalidate: [["PluginInstallationClient", "getAll"]],
    });
  });

  it("shows the installed notification and status once the install succeeds", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifySuccess).toHaveBeenCalledWith("Epidemiology installed");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Epidemiology is installed.",
    );
  });

  it("swaps Install and Back for Done once installed, and Done closes the wizard", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");
    _clickButton("Install");

    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    _clickButton("Done");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Install available and reports the error when the install fails", () => {
    mocks.install.mockImplementation(() => {
      mocks.installOptions?.onError(new Error("permission denied"));
    });
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not install Epidemiology",
      message: "permission denied",
    });
    expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
  });
});
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard"`

- [ ] **Step 11: Implement the wizard**

The heading of every page takes focus when the page mounts (each page is keyed, so moving remounts it), which is how focus follows Next and Back. The stepper's markers are progress, not navigation, so the wizard never passes `onStepClick`.

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading.tsx`:

```tsx
import { Title } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

/**
 * The heading of one install wizard page. It takes focus when the page
 * opens, so a keyboard or screen reader user lands on the new page's title
 * after pressing Next or Back instead of on a button that has moved. Every
 * step of `PluginInstallWizard` starts with one.
 */
export function InstallWizardStepHeading({ children }: Props): JSX.Element {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    // Order 3 nests the step under the modal's order 2 title. The modal's
    // focus trap also lands here first, because of `data-autofocus`.
    <Title ref={headingRef} order={3} size="h5" tabIndex={-1} data-autofocus>
      {children}
    </Title>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts`:

```ts
import { useState } from "react";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * One screen of the install wizard. `key` is unique per page, so a page
 * remounts, and its heading takes focus, whenever the wizard moves.
 */
export type InstallWizardPage = Readonly<{
  key: string;
  step: InstallWizardStep;
}>;

/**
 * Where an admin is in the install wizard. `PluginInstallWizard` reads it to
 * pick the page to draw and the footer buttons to offer.
 */
export type InstallWizardState = Readonly<{
  steps: readonly InstallWizardStep[];
  page: InstallWizardPage;
  isFirstPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
}>;

function _makePagesFromSteps(
  steps: readonly InstallWizardStep[],
): InstallWizardPage[] {
  return steps.map((step) => {
    return { key: step, step };
  });
}

/**
 * Tracks the install wizard's current page for one plugin's manifest, with
 * the steps the manifest needs. Moving past the last page or before the
 * first does nothing.
 */
export function useInstallWizardState(
  manifest: PluginManifest,
): InstallWizardState {
  const [pageIndex, setPageIndex] = useState(0);
  const steps = getInstallWizardStepsFromManifest(manifest);
  const pages = _makePagesFromSteps(steps);
  return {
    steps,
    page: pages[pageIndex]!,
    isFirstPage: pageIndex === 0,
    goToNextPage: () => {
      setPageIndex(Math.min(pageIndex + 1, pages.length - 1));
    },
    goToPreviousPage: () => {
      setPageIndex(Math.max(pageIndex - 1, 0));
    },
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/** The install wizard's Install action and what it has done so far. */
export type PluginInstaller = Readonly<{
  /** Installs the plugin with every permission it asks for. */
  install: (bindings: readonly PluginDataSlotBinding.Draft[]) => void;
  isInstalling: boolean;

  /** The new install, once the install succeeded. */
  installation: PluginInstallation.T | undefined;
}>;

/**
 * Installs one plugin in the current workspace, together with the data slot
 * bindings an admin chose, from the install wizard's Confirm step. It shows
 * the same success and error notifications as the other plugin actions, and
 * refreshes every plugin installs query so the plugin turns on right away.
 */
export function useInstallPlugin(options: {
  pluginName: string;
  manifest: PluginManifest;
}): PluginInstaller {
  const { pluginName, manifest } = options;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [installation, setInstallation] = useState<PluginInstallation.T>();
  const [installPlugin, isInstalling] = PluginInstallationClient.useInstall({
    queriesToInvalidate: [PluginInstallationClient.QueryKeys.getAll()],
    onSuccess: (newInstallation) => {
      notifySuccess(t`${pluginName} installed`);
      setInstallation(newInstallation);
    },
    onError: (error) => {
      notifyError({
        title: t`Could not install ${pluginName}`,
        message: error.message,
      });
    },
  });
  return {
    isInstalling,
    installation,
    install: (bindings) => {
      installPlugin({
        workspaceId: workspace.id,
        pluginId: manifest.id,
        installedVersion: manifest.version,
        grantedPermissions: [...manifest.permissions],
        bindings,
      });
    },
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stepper } from "@mantine/core";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { ReactNode } from "react";

type Props = Readonly<{
  steps: readonly InstallWizardStep[];
  activeStep: InstallWizardStep;

  /** The page of the active step. */
  children: ReactNode;
}>;

/**
 * The install wizard's row of steps, with the active step's page below it.
 * The steps are progress markers, not navigation: the wizard moves only
 * through its Back and Next buttons, so each marker is out of the tab order
 * and the active one is marked as the current step.
 */
export function InstallWizardStepper({
  steps,
  activeStep,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const labels: Record<InstallWizardStep, string> = {
    review: t`Review`,
    dataSlots: t`Records`,
    content: t`Datasets`,
    confirm: t`Confirm`,
  };
  const activeIndex = steps.indexOf(activeStep);
  return (
    <Stepper active={activeIndex} size="sm">
      {steps.map((step, index) => {
        return (
          <Stepper.Step
            key={step}
            label={labels[step]}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            {index === activeIndex ? children : null}
          </Stepper.Step>
        );
      })}
    </Stepper>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep.tsx`:

```tsx
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { getLocalizedContributionTitlesFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest";
import { PluginAdditionsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection";
import { PluginDataAccessSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{ manifestModule: PluginManifestModule }>;

/**
 * The install wizard's first page: who publishes the plugin, its version and
 * license, what it does, what it adds, and which data it can read, all shown
 * at once so an admin can judge the plugin before going on.
 */
export function ReviewStep({ manifestModule }: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const { manifest, strings } = manifestModule;
  const titles = getLocalizedContributionTitlesFromManifest({
    manifest,
    strings,
    locale: i18n.locale,
  });
  const publisher = manifest.id.split(".")[0] ?? "";
  const { version, license } = manifest;
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{t`About this plugin`}</InstallWizardStepHeading>
        <Text size="sm" c="dimmed">
          {t`${publisher} · version ${version} · ${license} license`}
        </Text>
        <Text size="sm">
          {getLocalizedTextFromManifestStrings({
            strings,
            locale: i18n.locale,
            value: manifest.description,
          })}
        </Text>
      </Stack>
      <PluginAdditionsSection
        {...titles}
        contentCount={manifest.contributes.content.length}
        aiToolCount={manifest.contributes.aiTools.length}
        headingOrder={4}
      />
      <PluginDataAccessSection
        permissions={manifest.permissions}
        hasChartTypes={titles.chartTypeTitles.length > 0}
        headingOrder={4}
      />
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";

type Props = Readonly<{
  pluginName: string;
  installer: PluginInstaller;
}>;

/**
 * The install wizard's last page: what installing does, and, once the
 * footer's Install button has run, a status line saying the plugin is
 * installed.
 */
export function ConfirmStep({ pluginName, installer }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <InstallWizardStepHeading>{t`Summary`}</InstallWizardStepHeading>
      <Text size="sm">
        {t`${pluginName} will be available to every member of this workspace.`}
      </Text>
      <Text size="sm" role="status">
        {installer.installation === undefined
          ? null
          : t`${pluginName} is installed.`}
      </Text>
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  wizard: InstallWizardState;
  installer: PluginInstaller;
  onInstall: () => void;
  onClose: () => void;
}>;

function PrimaryButton({
  wizard,
  installer,
  onInstall,
  onClose,
}: Props): JSX.Element {
  const { t } = useLingui();
  if (wizard.page.step !== "confirm") {
    return <Button onClick={wizard.goToNextPage}>{t`Next`}</Button>;
  }
  if (installer.installation !== undefined) {
    return <Button onClick={onClose}>{t`Done`}</Button>;
  }
  return (
    <Button loading={installer.isInstalling} onClick={onInstall}>
      {t`Install`}
    </Button>
  );
}

/**
 * The install wizard's buttons: Back, then Next on every page but the last,
 * Install on the last, and Done once installed. Back goes away once the
 * install starts, because the choices it would return to are already saved.
 */
export function InstallWizardFooter(props: Props): JSX.Element {
  const { t } = useLingui();
  const { wizard, installer } = props;
  const hasInstallStarted =
    installer.isInstalling || installer.installation !== undefined;
  return (
    <Group justify="flex-end" gap="xs">
      {wizard.isFirstPage || hasInstallStarted ? null : (
        <Button variant="default" me="auto" onClick={wizard.goToPreviousPage}>
          {t`Back`}
        </Button>
      )}
      <PrimaryButton {...props} />
    </Group>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx`:

```tsx
import { match } from "ts-pattern";
import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
import { ReviewStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { ReactNode } from "react";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
}>;

/** The page `PluginInstallWizard` shows for its current step. */
export function InstallWizardPageContent({
  pluginName,
  manifestModule,
  wizard,
  installer,
}: Props): ReactNode {
  return match(wizard.page.step)
    .with("review", () => {
      return <ReviewStep manifestModule={manifestModule} />;
    })
    .with("dataSlots", "content", () => {
      return null;
    })
    .with("confirm", () => {
      return <ConfirmStep pluginName={pluginName} installer={installer} />;
    })
    .exhaustive();
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx`:

```tsx
import { Stack } from "@mantine/core";
import { InstallWizardFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter";
import { InstallWizardPageContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent";
import { InstallWizardStepper } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper";
import { useInstallPlugin } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import { useInstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;

  /** Closes the modal the wizard is in. */
  onClose: () => void;
}>;

/**
 * The plugin install wizard: Review, then the steps the manifest needs, then
 * Confirm, which installs the plugin. Opened in a modal by
 * `openPluginInstallWizard` from a plugin's settings card.
 */
export function PluginInstallWizard({
  pluginName,
  manifestModule,
  onClose,
}: Props): JSX.Element {
  const wizard = useInstallWizardState(manifestModule.manifest);
  const installer = useInstallPlugin({
    pluginName,
    manifest: manifestModule.manifest,
  });
  return (
    <Stack gap="lg">
      <InstallWizardStepper steps={wizard.steps} activeStep={wizard.page.step}>
        <Stack key={wizard.page.key} pt="md">
          <InstallWizardPageContent
            pluginName={pluginName}
            manifestModule={manifestModule}
            wizard={wizard}
            installer={installer}
          />
        </Stack>
      </InstallWizardStepper>
      <InstallWizardFooter
        wizard={wizard}
        installer={installer}
        onInstall={() => {
          installer.install([]);
        }}
        onClose={onClose}
      />
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/openPluginInstallWizard.tsx`:

```tsx
import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Opens the install wizard for one plugin in a large modal titled
 * "Install <plugin name>". A plugin's settings card calls it from its Install
 * button. A click outside does not close it, so a half-made choice is not
 * lost; the close button and Escape still do.
 */
export function openPluginInstallWizard(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;
}): void {
  const { pluginName, manifestModule } = options;
  const modalId = modals.open({
    title: t`Install ${pluginName}`,
    size: "xl",
    closeOnClickOutside: false,
    closeButtonProps: { "aria-label": t`Close` },
    children: (
      <PluginInstallWizard
        pluginName={pluginName}
        manifestModule={manifestModule}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}
```

- [ ] **Step 12: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard`
Expected: PASS (14 tests in 2 files)

- [ ] **Step 13: Write the failing tests for the card's Install action**

Install no longer asks to confirm, the hook test loses its two insert tests (installing no longer inserts a row directly), and the tab test opens the wizard. The tab test's wrapper gains a `ModalsProvider` inside the query client, as in the app, so a modal a card opens can read queries.

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.test.tsx`:

```diff
@@ -106,16 +106,16 @@ describe("PluginActions", () => {
 
     expect(actions.uninstall).toHaveBeenCalledTimes(1);
   });
 
-  it("installs after the user confirms", async () => {
+  it("starts the install without a confirmation, because the install wizard is the confirmation", () => {
     const actions = _makeActions();
     _renderActions({ status: "not_installed", actions });
 
     fireEvent.click(screen.getByRole("button", { name: "Install" }));
-    await _confirmInDialog("Install");
 
     expect(actions.install).toHaveBeenCalledTimes(1);
+    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
   });
 
   it("approves the new permissions after the user confirms", async () => {
     const actions = _makeActions();
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.test.tsx`:

```diff
@@ -3,8 +3,9 @@ import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { beforeEach, describe, expect, it, vi } from "vitest";
 import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
 import { cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
 import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
+import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { PluginManifest } from "@avandar/plugin-manifest/runtime";
 import type { ReactNode } from "react";
 
 type DatabaseRow = Record<string, unknown>;
@@ -14,15 +15,13 @@ const INSTALLED_BY = "00000000-0000-4000-8000-000000000009";
 
 const fakeDatabase = vi.hoisted(() => {
   return {
     rows: [] as Array<Record<string, unknown>>,
-    insertedPayloads: [] as Array<Record<string, unknown>>,
-    nextRowNumber: 1,
   };
 });
 
 type QueryState = {
-  operation: "select" | "insert" | "update" | "delete";
+  operation: "select" | "update" | "delete";
   payload: DatabaseRow;
   filters: Array<[string, unknown]>;
 };
 
@@ -33,29 +32,9 @@ function _getMatchingRows(state: QueryState): DatabaseRow[] {
     });
   });
 }
 
-function _insertRow(payload: DatabaseRow): DatabaseRow {
-  const rowNumber = fakeDatabase.nextRowNumber;
-  fakeDatabase.nextRowNumber += 1;
-  fakeDatabase.insertedPayloads.push(payload);
-  // The database supplies these columns when the insert leaves them out.
-  const row = {
-    id: `00000000-0000-4000-8000-0000000001${String(rowNumber).padStart(2, "0")}`,
-    created_at: "2026-01-01T00:00:00.000Z",
-    updated_at: "2026-01-01T00:00:00.000Z",
-    installed_by: INSTALLED_BY,
-    is_enabled: true,
-    ...payload,
-  };
-  fakeDatabase.rows.push(row);
-  return row;
-}
-
 function _runQuery(state: QueryState): unknown {
-  if (state.operation === "insert") {
-    return _insertRow(state.payload);
-  }
   const matchingRows = _getMatchingRows(state);
   if (state.operation === "update") {
     matchingRows.forEach((row) => {
       Object.assign(row, state.payload);
@@ -85,13 +64,8 @@ vi.mock("$/db/supabase/AvaSupabase", () => {
             const query = {
               select: () => {
                 return query;
               },
-              insert: (payload: DatabaseRow) => {
-                state.operation = "insert";
-                state.payload = payload;
-                return query;
-              },
               update: (payload: DatabaseRow) => {
                 state.operation = "update";
                 state.payload = payload;
                 return query;
@@ -123,22 +97,21 @@ vi.mock("$/db/supabase/AvaSupabase", () => {
       },
     },
   };
 });
-vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
-  return {
-    useCurrentWorkspace: () => {
-      return { id: WORKSPACE_ID, slug: "slug" };
-    },
-  };
-});
 
 const MANIFEST = {
   id: "avandar.epidemiology",
   version: "1.2.0",
   permissions: ["data:context"],
 } as unknown as PluginManifest;
 
+const MANIFEST_MODULE = {
+  manifest: MANIFEST,
+  strings: {},
+  icons: {},
+} as unknown as PluginManifestModule;
+
 let queryClient: QueryClient;
 
 function _seedInstallation(overrides: DatabaseRow): void {
   fakeDatabase.rows.push({
@@ -166,9 +139,9 @@ function Harness(): ReactNode {
   );
   const installation = installations[0];
   const actions = usePluginInstallationActions({
     pluginName: "Epidemiology",
-    manifest: MANIFEST,
+    manifestModule: MANIFEST_MODULE,
     installation,
   });
   return (
     <div>
@@ -177,11 +150,8 @@ function Harness(): ReactNode {
         {installation
           ? `${installation.pluginId} enabled=${installation.isEnabled} version=${installation.installedVersion} granted=${installation.grantedPermissions.join(",")}`
           : "no installation"}
       </p>
-      <button type="button" onClick={actions.install}>
-        install
-      </button>
       <button
         type="button"
         onClick={() => {
           actions.setIsEnabled(false);
@@ -218,36 +188,8 @@ describe("usePluginInstallationActions", () => {
     queryClient = new QueryClient({
       defaultOptions: { queries: { retry: false } },
     });
     fakeDatabase.rows = [];
-    fakeDatabase.insertedPayloads = [];
-    fakeDatabase.nextRowNumber = 1;
-  });
-
-  it("shows a new install to the host's installs query right away", async () => {
-    await _renderAfterFirstLoad();
-
-    fireEvent.click(screen.getByText("install"));
-
-    expect(
-      await screen.findByText(
-        "avandar.epidemiology enabled=true version=1.2.0 granted=data:context",
-      ),
-    ).toBeInTheDocument();
-  });
-
-  it("leaves installed_by out of the insert so the database supplies it", async () => {
-    await _renderAfterFirstLoad();
-
-    fireEvent.click(screen.getByText("install"));
-    await screen.findByText(/avandar\.epidemiology/);
-
-    expect(fakeDatabase.insertedPayloads).toHaveLength(1);
-    expect(fakeDatabase.insertedPayloads[0]).not.toHaveProperty("installed_by");
-    expect(fakeDatabase.insertedPayloads[0]).toMatchObject({
-      workspace_id: WORKSPACE_ID,
-      plugin_id: "avandar.epidemiology",
-    });
   });
 
   it("shows a disabled install to the host's installs query right away", async () => {
     _seedInstallation({});
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`:

```diff
@@ -1,7 +1,9 @@
+import { ModalsProvider } from "@mantine/modals";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { beforeEach, describe, expect, it, vi } from "vitest";
 import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
+import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
 import { cleanup, fireEvent, render, screen, within } from "@/test-utils";
 import { WorkspacePluginsTab } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab";
 import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
 import type {
@@ -56,9 +58,9 @@ vi.mock(
             mocks.isLoadingInstallations,
             { isError: mocks.hasInstallationsError },
           ];
         },
-        useInsert: useMutationStub,
+        useInstall: useMutationStub,
         useUpdate: useMutationStub,
         useDelete: useMutationStub,
       },
     };
@@ -95,15 +97,17 @@ function _makeManifestModule(
       id: pluginId,
       name: "%name%",
       description: "%description%",
       version: "1.2.0",
+      license: "MIT",
       icon: "chart-dots",
       permissions: ["data:context"],
       dataSlots: {},
       contributes: {
         commands: [{ id: "run", title: "%run.title%", icon: "chart-dots" }],
         menus: { "dataExplorer.toolbar": [{ command: "run" }] },
         vizTypes: [],
+        aiTools: [],
         content: [],
       },
     },
     strings: {
@@ -141,11 +145,17 @@ function _addInstallation(overrides: Partial<PluginInstallation.T>): void {
     ...overrides,
   });
 }
 
+// The modals provider sits inside the query client, as in the app, so a
+// modal a card opens can read queries too.
 function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
   return (
-    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
+    <QueryClientProvider client={queryClient}>
+      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
+        {children}
+      </ModalsProvider>
+    </QueryClientProvider>
   );
 }
 
 function _renderTab(): void {
@@ -246,8 +256,23 @@ describe("WorkspacePluginsTab", () => {
       await screen.findByText("No plugins are available in this deployment."),
     ).toBeInTheDocument();
   });
 
+  it("opens the install wizard, titled with the plugin's name, from Install", async () => {
+    _addBundledPlugin();
+    _renderTab();
+    const card = await screen.findByRole("region", { name: "Epidemiology" });
+
+    fireEvent.click(within(card).getByRole("button", { name: "Install" }));
+
+    const wizard = await screen.findByRole("dialog", {
+      name: "Install Epidemiology",
+    });
+    expect(
+      within(wizard).getByRole("heading", { name: "About this plugin" }),
+    ).toBeInTheDocument();
+  });
+
   it("disables the actions for users who cannot manage plugins", async () => {
     mocks.canManage = false;
     _addBundledPlugin();
 
```

- [ ] **Step 14: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`
Expected: FAIL. `PluginActions > starts the install without a confirmation...` fails with `expected "spy" to be called 1 times, but got 0 times`; every card test in `WorkspacePluginsTab.test.tsx` fails with `TypeError: PluginInstallationClient.useInsert is not a function or its return value is not iterable` (the mock now offers `useInstall` instead); the hook test's approve test fails because the hook still reads `manifest`.

- [ ] **Step 15: Route Install through the wizard**

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types.ts`:

```diff
@@ -7,4 +7,10 @@ export type PluginActionKind =
   | "review"
   | "enable"
   | "disable"
   | "uninstall";
+
+/**
+ * An action that asks the user to confirm before it runs. Install is left
+ * out because it opens the install wizard, which is its own confirmation.
+ */
+export type ConfirmedPluginActionKind = Exclude<PluginActionKind, "install">;
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy.ts`:

```diff
@@ -1,6 +1,6 @@
 import { useLingui } from "@lingui/react/macro";
-import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
+import type { ConfirmedPluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
 
 /** The translated words of one action: its button and its confirmation. */
 export type PluginActionCopy = Readonly<{
   label: string;
@@ -9,23 +9,18 @@ export type PluginActionCopy = Readonly<{
   confirmLabel: string;
 }>;
 
 /**
- * The translated button label and confirmation text of every plugin action,
- * naming the plugin the action applies to. A plugin action button reads its
- * own entry before it asks the user to confirm.
+ * The translated button label and confirmation text of every plugin action
+ * that asks before it runs, naming the plugin the action applies to. A
+ * plugin action button reads its own entry before it asks the user to
+ * confirm.
  */
 export function usePluginActionCopy(
   pluginName: string,
-): Record<PluginActionKind, PluginActionCopy> {
+): Record<ConfirmedPluginActionKind, PluginActionCopy> {
   const { t } = useLingui();
   return {
-    install: {
-      label: t`Install`,
-      confirmTitle: t`Install ${pluginName}?`,
-      confirmBody: t`${pluginName} will be available to every member of this workspace.`,
-      confirmLabel: t`Install`,
-    },
     review: {
       label: t`Review new permissions`,
       confirmTitle: t`Approve new permissions for ${pluginName}?`,
       confirmBody: t`This version asks for permissions listed on its card. It stays hidden until you approve them.`,
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActionButton.tsx`:

```diff
@@ -1,14 +1,14 @@
 import { useLingui } from "@lingui/react/macro";
 import { Button, Text } from "@mantine/core";
 import { modals } from "@mantine/modals";
 import { usePluginActionCopy } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy";
-import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
+import type { ConfirmedPluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
 import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
 import type { ButtonProps } from "@mantine/core";
 
 type Props = Readonly<{
-  kind: PluginActionKind;
+  kind: ConfirmedPluginActionKind;
   pluginName: string;
 
   /** The id of the plugin's card heading, which describes this button. */
   headingId: string;
@@ -17,23 +17,21 @@ type Props = Readonly<{
 }>;
 
 /** How each kind of action looks. Uninstall is the only destructive one. */
 const STYLE_BY_KIND: Record<
-  PluginActionKind,
+  ConfirmedPluginActionKind,
   Pick<ButtonProps, "variant" | "color">
 > = {
-  install: {},
   review: {},
   enable: { variant: "outline" },
   disable: { variant: "outline", color: "neutral" },
   uninstall: { variant: "subtle", color: "danger" },
 };
 
 function _makeOnConfirmByKind(
   actions: PluginInstallationActions,
-): Record<PluginActionKind, () => void> {
+): Record<ConfirmedPluginActionKind, () => void> {
   return {
-    install: actions.install,
     review: actions.approvePermissions,
     enable: () => {
       actions.setIsEnabled(true);
     },
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginInstallButton.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";

type Props = Readonly<{
  /** The id of the plugin's card heading, which describes this button. */
  headingId: string;
  isDisabled: boolean;
  onInstall: () => void;
}>;

/**
 * The Install button on the card of a plugin the workspace does not have.
 * Unlike the other actions it asks for no confirmation, because it opens the
 * install wizard, which reviews the plugin before anything is saved.
 */
export function PluginInstallButton({
  headingId,
  isDisabled,
  onInstall,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Button
      size="compact-sm"
      aria-describedby={headingId}
      disabled={isDisabled}
      onClick={onInstall}
    >
      {t`Install`}
    </Button>
  );
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.tsx`:

```diff
@@ -1,6 +1,7 @@
 import { Group } from "@mantine/core";
 import { PluginActionButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActionButton";
+import { PluginInstallButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginInstallButton";
 import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
 import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
 import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
 
@@ -28,27 +29,36 @@ const ACTION_KINDS_BY_STATUS: Record<
 
 /**
  * The buttons for one plugin's current status, such as Install for a plugin
  * the workspace does not have yet. Users who cannot manage plugins see them
- * disabled, and so does everyone while a change is saving.
+ * disabled, and so does everyone while a change is saving. Install opens the
+ * install wizard; every other action asks the user to confirm first.
  */
 export function PluginActions({
   status,
   pluginName,
   headingId,
   canManage,
   actions,
 }: Props): JSX.Element {
+  const isDisabled = !canManage || actions.isPending;
   return (
     <Group gap="xs" wrap="nowrap">
       {ACTION_KINDS_BY_STATUS[status].map((kind) => {
-        return (
+        return kind === "install" ? (
+          <PluginInstallButton
+            key={kind}
+            headingId={headingId}
+            isDisabled={isDisabled}
+            onInstall={actions.install}
+          />
+        ) : (
           <PluginActionButton
             key={kind}
             kind={kind}
             pluginName={pluginName}
             headingId={headingId}
-            isDisabled={!canManage || actions.isPending}
+            isDisabled={isDisabled}
             actions={actions}
           />
         );
       })}
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions.ts` with:

```ts
import { openPluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/openPluginInstallWizard";
import { usePluginInstallationMutations } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationMutations";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * What a settings card can do to one plugin in the current workspace. Each
 * action does nothing when it lacks what it needs, such as `install` without
 * a manifest or `uninstall` without an install.
 */
export type PluginInstallationActions = Readonly<{
  /** True while any action is saving, so the card can disable its buttons. */
  isPending: boolean;

  /** Opens the install wizard, which installs the plugin when it finishes. */
  install: () => void;
  setIsEnabled: (isEnabled: boolean) => void;
  approvePermissions: () => void;
  uninstall: () => void;
}>;

/** Everything the actions of one plugin read, gathered by the hook. */
type ActionContext = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
  mutations: ReturnType<typeof usePluginInstallationMutations>;
}>;

/** Builds the actions that add a plugin to the workspace or remove it. */
function _makeInstallActionsFromContext(
  context: ActionContext,
): Pick<PluginInstallationActions, "install" | "uninstall"> {
  const { pluginName, manifestModule, installation, mutations } = context;
  return {
    install: () => {
      if (manifestModule !== undefined) {
        openPluginInstallWizard({ pluginName, manifestModule });
      }
    },
    uninstall: () => {
      if (installation !== undefined) {
        mutations.deleteInstallation({ id: installation.id });
      }
    },
  };
}

/** Builds the actions that change an install the workspace already has. */
function _makeUpdateActionsFromContext(
  context: ActionContext,
): Pick<PluginInstallationActions, "setIsEnabled" | "approvePermissions"> {
  const { installation, mutations } = context;
  const manifest = context.manifestModule?.manifest;
  return {
    setIsEnabled: (isEnabled) => {
      if (installation !== undefined) {
        mutations.updateInstallation({
          id: installation.id,
          data: { isEnabled },
        });
      }
    },
    approvePermissions: () => {
      if (installation !== undefined && manifest !== undefined) {
        mutations.updateInstallation({
          id: installation.id,
          data: {
            grantedPermissions: [...manifest.permissions],
            installedVersion: manifest.version,
          },
        });
      }
    },
  };
}

/** Combines every action of one plugin with its saving state. */
function _makeActionsFromContext(
  context: ActionContext,
): PluginInstallationActions {
  return {
    isPending: context.mutations.isPending,
    ..._makeInstallActionsFromContext(context),
    ..._makeUpdateActionsFromContext(context),
  };
}

/**
 * Install, enable, disable, approve, and uninstall for one plugin. The
 * Plugins settings tab gives each plugin card one, so the card's buttons only
 * call the returned actions.
 */
export function usePluginInstallationActions(options: {
  pluginName: string;
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
}): PluginInstallationActions {
  const mutations = usePluginInstallationMutations(options.pluginName);
  return _makeActionsFromContext({ ...options, mutations });
}
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationMutations.ts` with:

```ts
import { useLingui } from "@lingui/react/macro";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

/**
 * The update and uninstall mutations for one plugin, with the success and
 * error notifications the Plugins settings tab shows. Every mutation
 * invalidates all plugin installation `getAll` queries, which are keyed by
 * prefix, so the plugin host's workspace-filtered query refetches and a
 * change shows up in the running app without a reload. Installing goes
 * through the install wizard instead.
 */
export function usePluginInstallationMutations(pluginName: string): {
  updateInstallation: ReturnType<typeof PluginInstallationClient.useUpdate>[0];
  deleteInstallation: ReturnType<typeof PluginInstallationClient.useDelete>[0];
  isPending: boolean;
} {
  const { t } = useLingui();
  const queriesToInvalidate = [PluginInstallationClient.QueryKeys.getAll()];
  const onError = (error: Error): void => {
    notifyError({
      title: t`Could not update ${pluginName}`,
      message: error.message,
    });
  };
  const [updateInstallation, isUpdating] = PluginInstallationClient.useUpdate({
    queriesToInvalidate,
    onError,
  });
  const [deleteInstallation, isDeleting] = PluginInstallationClient.useDelete({
    queriesToInvalidate,
    onSuccess: () => {
      notifySuccess(t`${pluginName} uninstalled`);
    },
    onError,
  });
  return {
    updateInstallation,
    deleteInstallation,
    isPending: isUpdating || isDeleting,
  };
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard.tsx`:

```diff
@@ -37,9 +37,9 @@ export function PluginSettingsCard({
     manifestPermissions: manifest?.permissions,
   });
   const actions = usePluginInstallationActions({
     pluginName,
-    manifest,
+    manifestModule,
     installation,
   });
   return (
     <Card component="section" aria-labelledby={headingId} padding="lg">
```

- [ ] **Step 16: Run the whole tab's tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS (70 tests in 6 files)

- [ ] **Step 17: Type check, format, lint**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit && pnpm exec oxfmt --ignore-path .oxfmtignore src/views/WorkspaceSettingsPage/WorkspacePluginsTab && pnpm exec eslint src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: no errors (tsc takes about 25 seconds)

- [ ] **Step 18: Commit**

```bash
git add src/views/WorkspaceSettingsPage/WorkspacePluginsTab
git commit -m "feat(plugins): install plugins through a wizard with Review and Confirm steps" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `matchLiteral` cannot return JSX (its values must be plain objects), so page switches use `ts-pattern`'s `match`.
- Non-exported hooks are named `useX`, not `_useX`: `react-hooks/rules-of-hooks` rejects a hook whose name starts with `_`.
- In zsh, `$FILES` does not word-split. Pass a directory to oxfmt and eslint, or pipe a list through `xargs`.
- `openPluginInstallWizard` uses the `t` macro from `@lingui/core/macro`, like `makePluginApi`, because it runs outside a component. The modal sets `closeOnClickOutside: false` so a half-made choice is not lost; Escape and the close button still close it.
- The Lingui catalogs are refreshed by the pre-push hook, not by this task.
- `PluginSettingsCard` was already over 45 lines before this slice; this task only changes one argument in it.
- User-visible copy added here (Task 21's E2E helper selects on it): dialog title `Install <plugin name>`; buttons `Next`, `Back`, `Install`, `Done`; step labels `Review`, `Records`, `Datasets`, `Confirm`; headings `About this plugin` (Review) and `Summary` (Confirm); status `<plugin name> is installed.`; notifications `<plugin name> installed` and `Could not install <plugin name>`; the line `<publisher> · version <version> · <license> license`; additions line `<n> tool(s) Ask Avandar can use`. The card's Install button keeps the name `Install` and no longer opens `Install <plugin name>?`.

---

### Task 16: Data slot panel, check preview, and the Data slots step

**Design note:** `DataSlotPanel` takes one more prop, `slotId: string`. A panel with no draft yet cannot otherwise build the first draft, because `PluginDataSlotBinding.Draft` needs a `slotId`. The other props are as pinned.

**Goal:** An admin binds each data slot in the install wizard: a page per slot with a source picker grouped into "Case types" and "Datasets" (case types named like the slot's `concept` hint first), one field picker per attribute that offers only compatible fields, and a live check of what the mapping reads. A required slot blocks Next until it is bound; an optional one offers "Skip for now". The chosen bindings are installed with the plugin.

**Files:**
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSummary.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSampleTable.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotSourceSelect.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeFields.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeSelect.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts` (a page per data slot, drafts, skip, bindings), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx` (`canGoNext`, Skip for now), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx` (the Data slots page), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx` (the records summary), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx` (Next waits for a complete binding; installs the bindings)
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel.test.tsx`
- Modify (tests): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx` (stub the data clients the wizard now imports)

**Depends on:** Task 15 (the wizard), Task 12 (`PluginDataSlotBinding.Draft`), Task 13 (`isDataTypeAcceptedBySlotAttribute`, `makeDataSlotSourceFromConcept`, `makeDataSlotSourceFromDataset`, `getDataSlotBindingStatus`, `DataSlotSource`), Task 14 (`checkDataSlotBinding`, `DataSlotCheckResult`).

- [ ] **Step 1: Write the failing check preview tests**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@/test-utils";
import { DataSlotCheckPreview } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const { checkDataSlotBindingMock } = vi.hoisted(() => {
  return { checkDataSlotBindingMock: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
  () => {
    return { checkDataSlotBinding: checkDataSlotBindingMock };
  },
);

const SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: { type: "date", title: "%onset%", required: true },
    district: { type: "geo.admin2", title: "%district%", required: false },
  },
};

const ONSET_FIELD: DataSlotSourceField = {
  id: "col_onset",
  columnName: "onset",
  label: "onset",
  dataType: "date",
};

const REPORTED_FIELD: DataSlotSourceField = {
  id: "col_reported",
  columnName: "reported_at",
  label: "reported_at",
  dataType: "timestamp",
};

const SOURCE: DataSlotSource = {
  kind: "dataset",
  datasetId: "dataset-id" as Dataset.Id,
  name: "line_list.csv",
  fields: [ONSET_FIELD, REPORTED_FIELD],
};

const TITLES: Record<string, string> = {
  "%onset%": "Onset date",
  "%district%": "District",
};

let queryClient: QueryClient;

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _makePreview(onsetField: DataSlotSourceField): JSX.Element {
  return (
    <DataSlotCheckPreview
      slot={SLOT}
      slotTitle="Cases"
      localize={(value) => {
        return TITLES[value] ?? value;
      }}
      source={SOURCE}
      fieldsByAttributeKey={{ onsetDate: onsetField, district: undefined }}
    />
  );
}

describe("DataSlotCheckPreview", () => {
  beforeEach(() => {
    cleanup();
    checkDataSlotBindingMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("says it is checking while the check runs", () => {
    checkDataSlotBindingMock.mockReturnValue(new Promise(() => {}));

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking these records",
    );
  });

  it("checks the mapping it is given in the current workspace", async () => {
    checkDataSlotBindingMock.mockReturnValue(new Promise(() => {}));

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    await waitFor(() => {
      expect(checkDataSlotBindingMock).toHaveBeenCalledWith({
        workspaceId: "workspace-id",
        slot: SLOT,
        source: SOURCE,
        fieldsByAttributeKey: { onsetDate: ONSET_FIELD, district: undefined },
      });
    });
  });

  it("shows the row count, each attribute's filled count, and the first rows", async () => {
    checkDataSlotBindingMock.mockResolvedValue({
      rowCount: 12,
      filledCountsByAttributeKey: { onsetDate: 12, district: 0 },
      sampleRows: [{ onsetDate: "2026-01-05", district: null }],
    });

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(await screen.findByText("12 records")).toBeInTheDocument();
    expect(
      screen.getByText("Onset date: 12 of 12 have a value"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("District: 0 of 12 have a value"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Onset date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "2026-01-05" }),
    ).toBeInTheDocument();
  });

  it("says why when the records cannot be read", async () => {
    checkDataSlotBindingMock.mockRejectedValue(
      new Error("Catalog Error: Table does not exist"),
    );

    render(_makePreview(ONSET_FIELD), { wrapper: QueryWrapper });

    expect(
      await screen.findByText(
        "Could not read these records. Catalog Error: Table does not exist",
      ),
    ).toBeInTheDocument();
  });

  it("checks again when a mapped field changes", async () => {
    checkDataSlotBindingMock.mockResolvedValue({
      rowCount: 1,
      filledCountsByAttributeKey: { onsetDate: 1, district: 0 },
      sampleRows: [],
    });
    const { rerender } = render(_makePreview(ONSET_FIELD), {
      wrapper: QueryWrapper,
    });
    await screen.findByText("1 record");

    rerender(_makePreview(REPORTED_FIELD));

    await waitFor(() => {
      expect(checkDataSlotBindingMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fieldsByAttributeKey: {
            onsetDate: REPORTED_FIELD,
            district: undefined,
          },
        }),
      );
    });
    expect(checkDataSlotBindingMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview"`

- [ ] **Step 3: Implement the check preview**

The query is keyed by the slot, source, and fields themselves (React Query hashes them by content), so it reruns whenever a mapped field changes. It is never persisted, because the sample holds workspace records.

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSampleTable.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  sampleRows: DataSlotCheckResult["sampleRows"];
}>;

function _getTextFromCellValue(value: unknown, locale: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value instanceof Date
    ? value.toLocaleDateString(locale)
    : String(value);
}

/**
 * The first rows a data slot's mapping reads, one column per slot attribute
 * titled in the plugin's words, so an admin can see the fields line up.
 * Part of `DataSlotCheckSummary`.
 */
export function DataSlotCheckSampleTable({
  slot,
  slotTitle,
  localize,
  sampleRows,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const attributeKeys = Object.keys(slot.attributes);
  return (
    <Table.ScrollContainer minWidth={320}>
      <Table withTableBorder fz="sm">
        <Table.Caption>{t`First rows of ${slotTitle}`}</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            {Object.entries(slot.attributes).map(
              ([attributeKey, attribute]) => {
                return (
                  <Table.Th key={attributeKey}>
                    {localize(attribute.title)}
                  </Table.Th>
                );
              },
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sampleRows.map((row, rowIndex) => {
            return (
              // Sample rows have no id, and their order never changes.
              <Table.Tr key={rowIndex}>
                {attributeKeys.map((attributeKey) => {
                  return (
                    <Table.Td key={attributeKey}>
                      {_getTextFromCellValue(row[attributeKey], i18n.locale)}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSummary.tsx`:

```tsx
import { Plural, useLingui } from "@lingui/react/macro";
import { List, Stack, Text } from "@mantine/core";
import { DataSlotCheckSampleTable } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSampleTable";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  result: DataSlotCheckResult;
}>;

/**
 * What a data slot check found: the row count, each attribute's count of
 * rows with a value, and the first rows. `DataSlotCheckPreview` shows it
 * once the check finishes.
 */
export function DataSlotCheckSummary({
  slot,
  slotTitle,
  localize,
  result,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const rowCount = i18n.number(result.rowCount);
  return (
    <Stack gap="sm">
      <Text size="sm" fw={500} role="status">
        <Plural value={result.rowCount} one="# record" other="# records" />
      </Text>
      <List size="sm">
        {Object.entries(slot.attributes).map(([attributeKey, attribute]) => {
          const title = localize(attribute.title);
          const filledCount = i18n.number(
            result.filledCountsByAttributeKey[attributeKey] ?? 0,
          );
          return (
            <List.Item key={attributeKey}>
              {t`${title}: ${filledCount} of ${rowCount} have a value`}
            </List.Item>
          );
        })}
      </List>
      <DataSlotCheckSampleTable
        slot={slot}
        slotTitle={slotTitle}
        localize={localize}
        sampleRows={result.sampleRows}
      />
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview.tsx`:

```tsx
import { useQuery } from "@avandar/query-hooks";
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { checkDataSlotBinding } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import { DataSlotCheckSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckSummary";
import type { DataSlotCheckResult } from "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  source: DataSlotSource;

  /** The field behind each attribute, from a `bound` binding status. */
  fieldsByAttributeKey: Readonly<
    Record<string, DataSlotSourceField | undefined>
  >;
}>;

function useDataSlotCheck(
  props: Props,
): UseQueryResultTuple<DataSlotCheckResult> {
  const { slot, source, fieldsByAttributeKey } = props;
  const workspace = useCurrentWorkspace();
  return useQuery({
    // Keyed by content, so the check runs again whenever the source or a
    // mapped field changes.
    queryKey: [
      "pluginDataSlots",
      "check",
      workspace.id,
      slot,
      source,
      fieldsByAttributeKey,
    ],
    queryFn: () => {
      return checkDataSlotBinding({
        workspaceId: workspace.id,
        slot,
        source,
        fieldsByAttributeKey,
      });
    },
    // The sample holds workspace records, so it is never written to disk.
    meta: { persist: false },
    retry: false,
  });
}

/**
 * Runs a data slot's query on the mapping an admin is choosing and shows
 * what it reads: the row count, how many rows fill each attribute, and the
 * first rows. It runs again whenever the source or a mapped field changes.
 * A data slot panel shows it once every required attribute has a field.
 */
export function DataSlotCheckPreview(props: Props): JSX.Element {
  const { t } = useLingui();
  const [result, isLoading, query] = useDataSlotCheck(props);
  if (isLoading) {
    return (
      <Group gap="xs" role="status">
        <Loader size="xs" aria-hidden />
        <Text size="sm">{t`Checking these records`}</Text>
      </Group>
    );
  }
  if (result === undefined) {
    const reason = query.error?.message ?? "";
    return (
      <Callout
        messageSize="sm"
        message={t`Could not read these records. ${reason}`}
      />
    );
  }
  return <DataSlotCheckSummary {...props} result={result} />;
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview`
Expected: PASS (5 tests)

- [ ] **Step 5: Write the failing data slot panel tests**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type GetAllArgument = {
  where?: Record<string, { eq?: unknown }>;
  useQueryOptions?: { enabled?: boolean };
};

const mocks = vi.hoisted(() => {
  return {
    concepts: [] as unknown[],
    datasets: [] as unknown[],
    conceptAttributes: [] as unknown[],
    datasetColumns: [] as unknown[],
    checkDataSlotBinding: vi.fn(),
  };
});

/**
 * A client's `useGetAll` that returns `getRows()`, keeping only the rows
 * whose `filter.field` equals the `filter.column` value of the query.
 */
function _makeUseGetAll(
  getRows: () => unknown[],
  filter?: { column: string; field: string },
): (argument: GetAllArgument) => unknown[] {
  return (argument) => {
    if (argument.useQueryOptions?.enabled === false) {
      return [undefined, false, {}];
    }
    const rows = getRows().filter((row) => {
      return (
        filter === undefined ||
        (row as Record<string, unknown>)[filter.field] ===
          argument.where?.[filter.column]?.eq
      );
    });
    return [rows, false, {}];
  };
}

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: _makeUseGetAll(() => {
        return mocks.concepts;
      }),
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: _makeUseGetAll(() => {
        return mocks.datasets;
      }),
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: _makeUseGetAll(
        () => {
          return mocks.conceptAttributes;
        },
        { column: "concept_id", field: "conceptId" },
      ),
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: _makeUseGetAll(
        () => {
          return mocks.datasetColumns;
        },
        { column: "dataset_id", field: "datasetId" },
      ),
    },
  };
});
vi.mock(
  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
  () => {
    return { checkDataSlotBinding: mocks.checkDataSlotBinding };
  },
);

const SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  concept: "case",
  required: false,
  attributes: {
    onsetDate: { type: "date", title: "%onset%", required: true },
    district: { type: "geo.admin2", title: "%district%", required: false },
  },
};

const TITLES: Record<string, string> = {
  "%onset%": "Onset date",
  "%district%": "District",
};

const DATASET_ID = "dataset-line-list" as Dataset.Id;
const CASE_CONCEPT_ID = "concept-case" as Concept.Id;

let queryClient: QueryClient;
let onDraftChange: ReturnType<typeof vi.fn>;

function _makeConcept(id: string, name: string): Concept.T {
  return Model.make("Concept", { id, name }) as Concept.T;
}

function _makeDatasetColumn(
  id: string,
  dataType: AvaDataType.T,
  columnIdx: number,
): DatasetColumn.T {
  return Model.make("DatasetColumn", {
    id,
    name: id,
    columnIdx,
    dataType,
    datasetId: DATASET_ID,
  }) as DatasetColumn.T;
}

function _makeConceptAttribute(
  id: string,
  dataType: AvaDataType.T,
): ConceptAttribute.T {
  return Model.make("ConceptAttribute", {
    id,
    conceptId: CASE_CONCEPT_ID,
    name: id,
    dataType,
    isArray: false,
    createdAt: "2026-11-11T00:00:00Z",
  }) as ConceptAttribute.T;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function Harness(): JSX.Element {
  const [draft, setDraft] = useState<PluginDataSlotBinding.Draft>();
  return (
    <DataSlotPanel
      slotId="cases"
      slot={SLOT}
      slotTitle="Cases"
      localize={(value) => {
        return TITLES[value] ?? value;
      }}
      draft={draft}
      onDraftChange={(nextDraft) => {
        onDraftChange(nextDraft);
        setDraft(nextDraft);
      }}
    />
  );
}

function _renderPanel(): void {
  render(<Harness />, { wrapper: QueryWrapper });
}

function _getOptionLabels(comboboxName: string): string[] {
  return within(getMantineSelectDropdown(comboboxName))
    .getAllByRole("option", { hidden: true })
    .map((option) => {
      return option.textContent ?? "";
    });
}

describe("DataSlotPanel", () => {
  beforeEach(() => {
    cleanup();
    mocks.checkDataSlotBinding.mockReset();
    mocks.checkDataSlotBinding.mockReturnValue(new Promise(() => {}));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    onDraftChange = vi.fn();
    mocks.concepts = [
      _makeConcept("concept-contacts", "Contacts"),
      _makeConcept(CASE_CONCEPT_ID, "Case"),
    ];
    mocks.datasets = [
      Model.make("Dataset", { id: DATASET_ID, name: "line_list.csv" }),
    ];
    mocks.conceptAttributes = [_makeConceptAttribute("Notes", "varchar")];
    mocks.datasetColumns = [
      _makeDatasetColumn("district", "varchar", 0),
      _makeDatasetColumn("onset", "date", 1),
      _makeDatasetColumn("age", "bigint", 2),
      _makeDatasetColumn("reported_at", "timestamp", 3),
    ];
  });

  it("lists case types named like the slot's hint first, then the rest, then datasets", () => {
    _renderPanel();

    expect(_getOptionLabels("Case type or dataset")).toEqual([
      "Case",
      "Contacts",
      "line_list.csv",
    ]);
  });

  it("groups the sources under Case types and Datasets", () => {
    _renderPanel();

    const dropdown = getMantineSelectDropdown("Case type or dataset");
    expect(within(dropdown).getByText("Case types")).toBeInTheDocument();
    expect(within(dropdown).getByText("Datasets")).toBeInTheDocument();
  });

  it("starts a draft for the chosen dataset with nothing mapped", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(onDraftChange).toHaveBeenLastCalledWith({
      slotId: "cases",
      sourceType: "dataset",
      conceptId: undefined,
      datasetId: DATASET_ID,
      attributeMap: {},
    });
  });

  it("offers only fields whose type fits each attribute", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(_getOptionLabels("Onset date")).toEqual(["onset", "reported_at"]);
    expect(_getOptionLabels("District")).toEqual(["district"]);
  });

  it("marks a required attribute as required and an optional one as not", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(screen.getByRole("combobox", { name: "Onset date" })).toBeRequired();
    expect(
      screen.getByRole("combobox", { name: "District" }),
    ).not.toBeRequired();
  });

  it("describes each attribute picker by the attribute's type", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "line_list.csv");

    expect(
      screen.getByRole("combobox", { name: "District" }),
    ).toHaveAccessibleDescription("District, name or code");
  });

  it("disables an attribute picker when the source has no field of its type", () => {
    _renderPanel();

    pickMantineSelectOption("Case type or dataset", "Case");

    expect(screen.getByRole("combobox", { name: "Onset date" })).toBeDisabled();
  });

  it("starts the mapping over when another source is chosen", () => {
    _renderPanel();
    pickMantineSelectOption("Case type or dataset", "line_list.csv");
    pickMantineSelectOption("Onset date", "onset");

    pickMantineSelectOption("Case type or dataset", "Case");

    expect(onDraftChange).toHaveBeenLastCalledWith({
      slotId: "cases",
      sourceType: "concept",
      conceptId: CASE_CONCEPT_ID,
      datasetId: undefined,
      attributeMap: {},
    });
  });

  it("checks the records only once every required attribute has a field", async () => {
    _renderPanel();
    pickMantineSelectOption("Case type or dataset", "line_list.csv");
    expect(mocks.checkDataSlotBinding).not.toHaveBeenCalled();

    pickMantineSelectOption("Onset date", "onset");

    await waitFor(() => {
      expect(mocks.checkDataSlotBinding).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking these records",
    );
  });
});
```

- [ ] **Step 6: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel"`

- [ ] **Step 7: Implement the panel**

`useDataSlotDraftStatus` loads the draft's source with the same client hooks the panel uses, so the wizard's footer and the rebinding modal can call it too without a second fetch, and a draft is complete exactly when its status is `bound`.

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import type { DataSlotAttributeType } from "@avandar/plugin-manifest/runtime";

/**
 * The name an admin reads for each data slot attribute type, such as "Date"
 * for `date`. Shown under each attribute's field picker when binding a slot,
 * and in the reason a binding broke.
 */
export function useDataSlotAttributeTypeLabels(): Record<
  DataSlotAttributeType,
  string
> {
  const { t } = useLingui();
  return {
    number: t`Number`,
    date: t`Date`,
    text: t`Text`,
    boolean: t`Yes / no`,
    "geo.admin1": t`Province or region, name or code`,
    "geo.admin2": t`District, name or code`,
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions.ts`:

```ts
import { where } from "@avandar/utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";

// Stable defaults, so a list still loading is the same array every render.
const NO_CONCEPTS: Concept.T[] = [];
const NO_DATASETS: Dataset.T[] = [];

/** The case types and datasets of a workspace a data slot can read. */
export type DataSlotSourceOptions = Readonly<{
  concepts: readonly Concept.T[];
  datasets: readonly Dataset.T[];
  isLoading: boolean;
}>;

/**
 * Loads every case type and dataset of a workspace, the sources a data slot
 * can be bound to. Use it wherever a slot's source is picked or named, for
 * example the source picker of a data slot panel or a summary of the slots
 * an admin bound.
 */
export function useDataSlotSourceOptions(
  workspaceId: Workspace.Id,
): DataSlotSourceOptions {
  const [concepts = NO_CONCEPTS, isLoadingConcepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  const [datasets = NO_DATASETS, isLoadingDatasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspaceId),
  );
  return {
    concepts,
    datasets,
    isLoading: isLoadingConcepts || isLoadingDatasets,
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus.ts`:

```ts
import { where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { makeDataSlotSourceFromConcept } from "@/lib/pluginDataSlots/makeDataSlotSourceFromConcept/makeDataSlotSourceFromConcept";
import { makeDataSlotSourceFromDataset } from "@/lib/pluginDataSlots/makeDataSlotSourceFromDataset/makeDataSlotSourceFromDataset";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

/** A data slot draft's source, and the status the draft would save with. */
export type DataSlotDraftStatus = Readonly<{
  /** The case type or dataset the draft names, once its fields load. */
  source: DataSlotSource | undefined;
  isLoadingSource: boolean;

  /** Undefined until there is a slot, a draft, and its loaded source. */
  status: DataSlotBindingStatus | undefined;
}>;

/**
 * Loads the case type or dataset a data slot draft names, with its fields,
 * and works out the status the draft would have if saved. A draft is ready
 * to save once the status is `bound`. Use it wherever a draft is edited or
 * saved, for example the data slot panel and the button that saves it.
 */
export function useDataSlotDraftStatus(options: {
  slot: PluginDataSlot | undefined;
  draft: PluginDataSlotBinding.Draft | undefined;
}): DataSlotDraftStatus {
  const { slot, draft } = options;
  const workspace = useCurrentWorkspace();
  const { concepts, datasets } = useDataSlotSourceOptions(workspace.id);
  const conceptId =
    draft?.sourceType === "concept" ? draft.conceptId : undefined;
  const datasetId =
    draft?.sourceType === "dataset" ? draft.datasetId : undefined;
  const [attributes, isLoadingAttributes] = ConceptAttributeClient.useGetAll({
    ...where("concept_id", "eq", conceptId),
    useQueryOptions: { enabled: conceptId !== undefined },
  });
  const [columns, isLoadingColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", datasetId),
    useQueryOptions: { enabled: datasetId !== undefined },
  });
  const concept = concepts.find((candidate) => {
    return candidate.id === conceptId;
  });
  const dataset = datasets.find((candidate) => {
    return candidate.id === datasetId;
  });
  const source =
    concept !== undefined && attributes !== undefined
      ? makeDataSlotSourceFromConcept({ concept, attributes })
      : dataset !== undefined && columns !== undefined
        ? makeDataSlotSourceFromDataset({ dataset, columns })
        : undefined;
  return {
    source,
    isLoadingSource: isLoadingAttributes || isLoadingColumns,
    status:
      slot === undefined || draft === undefined || source === undefined
        ? undefined
        : getDataSlotBindingStatus({ slot, binding: draft, source }),
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotSourceSelect.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slotId: string;
  slot: PluginDataSlot;
  sourceOptions: DataSlotSourceOptions;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/** Case types named like the slot's `concept` hint first, any case. */
function _sortConceptsByHint(
  concepts: readonly Concept.T[],
  conceptHint: string | undefined,
): Concept.T[] {
  const isHinted = (concept: Concept.T): boolean => {
    return concept.name.toLowerCase() === conceptHint?.toLowerCase();
  };
  return [
    ...concepts.filter(isHinted),
    ...concepts.filter((concept) => {
      return !isHinted(concept);
    }),
  ];
}

function _makeDraftFromValue(
  slotId: string,
  value: string,
): PluginDataSlotBinding.Draft {
  const [sourceType, id] = value.split(":") as ["concept" | "dataset", string];
  return {
    slotId,
    sourceType,
    conceptId: sourceType === "concept" ? (id as Concept.Id) : undefined,
    datasetId: sourceType === "dataset" ? (id as Dataset.Id) : undefined,
    attributeMap: {},
  };
}

/**
 * The picker of a data slot panel that chooses the case type or dataset a
 * slot reads, grouped into "Case types" and "Datasets". Choosing a new
 * source starts the slot's field mapping over.
 */
export function DataSlotSourceSelect(props: Props): JSX.Element {
  const { slotId, slot, sourceOptions, draft, onDraftChange } = props;
  const { t } = useLingui();
  const groups = [
    {
      group: t`Case types`,
      items: _sortConceptsByHint(sourceOptions.concepts, slot.concept).map(
        (concept) => {
          return { value: `concept:${concept.id}`, label: concept.name };
        },
      ),
    },
    {
      group: t`Datasets`,
      items: sourceOptions.datasets.map((dataset) => {
        return { value: `dataset:${dataset.id}`, label: dataset.name };
      }),
    },
  ];
  return (
    <Select
      label={t`Case type or dataset`}
      placeholder={t`Choose where the records come from`}
      searchable
      disabled={sourceOptions.isLoading}
      nothingFoundMessage={t`No case types or datasets match`}
      data={groups.filter((group) => {
        return group.items.length > 0;
      })}
      value={
        draft === undefined
          ? null
          : `${draft.sourceType}:${draft.conceptId ?? draft.datasetId}`
      }
      onChange={(value) => {
        onDraftChange(
          value === null ? undefined : _makeDraftFromValue(slotId, value),
        );
      }}
    />
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeSelect.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { isDataTypeAcceptedBySlotAttribute } from "@/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/isDataTypeAcceptedBySlotAttribute";
import { useDataSlotAttributeTypeLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlotAttribute } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  attribute: PluginDataSlotAttribute;

  /** The attribute's title, already localized. */
  attributeTitle: string;
  source: DataSlotSource;
  fieldId: string | undefined;
  onFieldIdChange: (fieldId: string | undefined) => void;
}>;

/**
 * One row of a data slot panel: the field of the chosen source that fills
 * one slot attribute. It is labeled by the attribute's title, described by
 * its type, starred when required, and lists only fields of a type that
 * fits. An optional attribute can be cleared.
 */
export function DataSlotAttributeSelect({
  attribute,
  attributeTitle,
  source,
  fieldId,
  onFieldIdChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const typeLabels = useDataSlotAttributeTypeLabels();
  const options = source.fields
    .filter((field) => {
      return isDataTypeAcceptedBySlotAttribute({
        type: attribute.type,
        dataType: field.dataType,
      });
    })
    .map((field) => {
      return { value: field.id, label: field.label };
    });
  return (
    <Select
      label={attributeTitle}
      description={typeLabels[attribute.type]}
      required={attribute.required}
      clearable={!attribute.required}
      disabled={options.length === 0}
      placeholder={
        options.length === 0 ? t`No fields of this type` : t`Select a field`
      }
      data={options}
      value={fieldId ?? null}
      onChange={(value) => {
        onFieldIdChange(value ?? undefined);
      }}
    />
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeFields.tsx`:

```tsx
import { omit } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { DataSlotAttributeSelect } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeSelect";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  slotTitle: string;
  localize: (value: string) => string;
  source: DataSlotSource;
  draft: PluginDataSlotBinding.Draft;
  onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
}>;

/**
 * The field pickers of a data slot panel, one per slot attribute in manifest
 * order, grouped and named after the slot so a screen reader hears which
 * records the fields belong to.
 */
export function DataSlotAttributeFields({
  slot,
  slotTitle,
  localize,
  source,
  draft,
  onDraftChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="sm" role="group" aria-label={t`Fields for ${slotTitle}`}>
      {Object.entries(slot.attributes).map(([attributeKey, attribute]) => {
        return (
          <DataSlotAttributeSelect
            key={attributeKey}
            attribute={attribute}
            attributeTitle={localize(attribute.title)}
            source={source}
            fieldId={draft.attributeMap[attributeKey]}
            onFieldIdChange={(fieldId) => {
              onDraftChange({
                ...draft,
                attributeMap:
                  fieldId === undefined
                    ? omit(draft.attributeMap, attributeKey)
                    : { ...draft.attributeMap, [attributeKey]: fieldId },
              });
            }}
          />
        );
      })}
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataSlotCheckPreview } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotCheckPreview/DataSlotCheckPreview";
import { DataSlotAttributeFields } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotAttributeFields";
import { DataSlotSourceSelect } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotSourceSelect";
import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slotId: string;
  slot: PluginDataSlot;

  /** The slot's title, already localized. */
  slotTitle: string;

  /** Localizes the plugin's `%key%` strings, such as attribute titles. */
  localize: (value: string) => string;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/**
 * Binds one data slot: a picker for the case type or dataset it reads, then
 * one field picker per slot attribute, then a check of what the mapping
 * reads once every required attribute has a field. Used by the install
 * wizard's Data slots step and by the modal that rebinds a slot later.
 */
export function DataSlotPanel(props: Props): JSX.Element {
  const { slotId, slot, slotTitle, localize, draft, onDraftChange } = props;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const sourceOptions = useDataSlotSourceOptions(workspace.id);
  const { source, isLoadingSource, status } = useDataSlotDraftStatus({
    slot,
    draft,
  });
  return (
    <Stack gap="md">
      <DataSlotSourceSelect
        slotId={slotId}
        slot={slot}
        sourceOptions={sourceOptions}
        draft={draft}
        onDraftChange={onDraftChange}
      />
      {isLoadingSource ? (
        <Loader size="sm" role="status" aria-label={t`Loading fields`} />
      ) : null}
      {source === undefined || draft === undefined ? null : (
        <DataSlotAttributeFields
          {...{ slot, slotTitle, localize, source, draft, onDraftChange }}
        />
      )}
      {source === undefined || status?.kind !== "bound" ? null : (
        <DataSlotCheckPreview
          {...{ slot, slotTitle, localize, source }}
          fieldsByAttributeKey={status.fieldsByAttributeKey}
        />
      )}
    </Stack>
  );
}
```

- [ ] **Step 8: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding`
Expected: PASS (14 tests in 2 files)

- [ ] **Step 9: Write the failing wizard tests for data slots**

The wizard test swaps the panel for a one-click stand-in and treats any draft as complete, because the panel has its own tests. The tab test stubs the case type and dataset clients: the dataset client's module pulls in DuckDB and storage modules that call `Logger.appendName` at import time, which the tab test's `Logger` mock does not provide.

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`:

```diff
@@ -1,8 +1,9 @@
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { beforeEach, describe, expect, it, vi } from "vitest";
 import { cleanup, fireEvent, render, screen } from "@/test-utils";
 import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
+import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { ReactNode } from "react";
 
 type InstallOptions = {
@@ -43,8 +44,64 @@ vi.mock(
       },
     };
   },
 );
+// The panel has its own tests. This stand-in binds its slot in one click.
+vi.mock(
+  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel",
+  () => {
+    return {
+      DataSlotPanel: (props: {
+        slotId: string;
+        slotTitle: string;
+        onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
+      }) => {
+        return (
+          <button
+            type="button"
+            onClick={() => {
+              props.onDraftChange(_makeDraft(props.slotId));
+            }}
+          >
+            {`Bind ${props.slotTitle}`}
+          </button>
+        );
+      },
+    };
+  },
+);
+// A draft counts as complete as soon as there is one.
+vi.mock(
+  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus",
+  () => {
+    return {
+      useDataSlotDraftStatus: (options: { draft: unknown }) => {
+        return {
+          source: undefined,
+          isLoadingSource: false,
+          status:
+            options.draft === undefined
+              ? undefined
+              : { kind: "bound", fieldsByAttributeKey: {} },
+        };
+      },
+    };
+  },
+);
+vi.mock(
+  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions",
+  () => {
+    return {
+      useDataSlotSourceOptions: () => {
+        return {
+          concepts: [{ id: "concept-deaths", name: "Measles deaths" }],
+          datasets: [],
+          isLoading: false,
+        };
+      },
+    };
+  },
+);
 vi.mock("@/utils/notifications/notify", () => {
   return {
     notifySuccess: mocks.notifySuccess,
     notifyError: mocks.notifyError,
@@ -55,9 +112,37 @@ const INSTALLATION = {
   id: "installation-id",
   pluginId: "avandar.epidemiology",
 };
 
+const DATA_SLOTS = {
+  cases: {
+    title: "%slot.cases.title%",
+    description: "%slot.cases.description%",
+    required: false,
+    attributes: {
+      onsetDate: { type: "date", title: "%onset%", required: true },
+    },
+  },
+  deaths: {
+    title: "%slot.deaths.title%",
+    required: true,
+    attributes: {
+      deathDate: { type: "date", title: "%death%", required: true },
+    },
+  },
+};
+
 let queryClient: QueryClient;
+
+function _makeDraft(slotId: string): PluginDataSlotBinding.Draft {
+  return {
+    slotId,
+    sourceType: "concept",
+    conceptId: `concept-${slotId}` as PluginDataSlotBinding.Draft["conceptId"],
+    datasetId: undefined,
+    attributeMap: { date: `attribute-${slotId}` },
+  };
+}
 let onClose: ReturnType<typeof vi.fn>;
 
 function _makeManifestModule(
   manifestOverrides: Record<string, unknown> = {},
@@ -85,8 +170,11 @@ function _makeManifestModule(
       en: {
         name: "Epidemiology",
         description: "Charts disease spread.",
         "run.title": "Linear regression",
+        "slot.cases.title": "Cases",
+        "slot.cases.description": "The case records the epicurve counts.",
+        "slot.deaths.title": "Deaths",
       },
     },
     icons: {},
   } as unknown as PluginManifestModule;
@@ -247,5 +335,88 @@ describe("PluginInstallWizard", () => {
       message: "permission denied",
     });
     expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
   });
+
+  describe("data slots", () => {
+    function _renderWizardWithDataSlots(): void {
+      _renderWizard(
+        _makeManifestModule({
+          permissions: ["data:slots"],
+          dataSlots: DATA_SLOTS,
+        }),
+      );
+    }
+
+    it("gives each data slot its own page, titled and described by the slot", () => {
+      _renderWizardWithDataSlots();
+
+      _clickButton("Next");
+
+      expect(screen.getByRole("heading", { name: "Cases" })).toHaveFocus();
+      expect(
+        screen.getByText("The case records the epicurve counts."),
+      ).toBeInTheDocument();
+      expect(screen.getByText("Records")).toBeInTheDocument();
+    });
+
+    it("offers Skip for now on an optional data slot and keeps Next off until it is bound", () => {
+      _renderWizardWithDataSlots();
+      _clickButton("Next");
+
+      expect(
+        screen.getByRole("button", { name: "Skip for now" }),
+      ).toBeInTheDocument();
+      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
+      _clickButton("Bind Cases");
+
+      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
+    });
+
+    it("blocks Next on a required data slot until it is bound, with no Skip", () => {
+      _renderWizardWithDataSlots();
+      _clickButton("Next");
+      _clickButton("Skip for now");
+
+      expect(screen.getByRole("heading", { name: "Deaths" })).toHaveFocus();
+      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
+      expect(
+        screen.queryByRole("button", { name: "Skip for now" }),
+      ).not.toBeInTheDocument();
+      _clickButton("Bind Deaths");
+
+      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
+    });
+
+    it("installs with the bindings chosen and none for a skipped slot", () => {
+      _renderWizardWithDataSlots();
+      _clickButton("Next");
+      _clickButton("Bind Cases");
+      _clickButton("Skip for now");
+      _clickButton("Bind Deaths");
+      _clickButton("Next");
+
+      _clickButton("Install");
+
+      expect(mocks.install).toHaveBeenCalledWith(
+        expect.objectContaining({
+          grantedPermissions: ["data:slots"],
+          bindings: [_makeDraft("deaths")],
+        }),
+      );
+    });
+
+    it("lists the records each data slot reads on the Confirm step", () => {
+      _renderWizardWithDataSlots();
+      _clickButton("Next");
+      _clickButton("Skip for now");
+      _clickButton("Bind Deaths");
+
+      _clickButton("Next");
+
+      expect(screen.getByText("Cases: not chosen yet")).toBeInTheDocument();
+      expect(
+        screen.getByText("Deaths: Case type: Measles deaths"),
+      ).toBeInTheDocument();
+    });
+  });
 });
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`:

```diff
@@ -77,8 +77,52 @@ vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
       });
     },
   };
 });
+// The install wizard lists the workspace's case types and datasets. These
+// stubs keep the dataset client's DuckDB and storage modules out of the test.
+vi.mock("@/clients/ontology/ConceptClient", () => {
+  return {
+    ConceptClient: {
+      useGetAll: () => {
+        return [[], false, {}];
+      },
+    },
+  };
+});
+vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
+  return {
+    ConceptAttributeClient: {
+      useGetAll: () => {
+        return [[], false, {}];
+      },
+    },
+  };
+});
+vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
+  return {
+    DatasetClient: {
+      useGetAll: () => {
+        return [[], false, {}];
+      },
+    },
+  };
+});
+vi.mock("@/clients/datasets/DatasetColumnClient", () => {
+  return {
+    DatasetColumnClient: {
+      useGetAll: () => {
+        return [[], false, {}];
+      },
+    },
+  };
+});
+vi.mock(
+  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
+  () => {
+    return { checkDataSlotBinding: vi.fn() };
+  },
+);
 vi.mock("@/utils/Logger", () => {
   return { Logger: { error: vi.fn() } };
 });
 
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`
Expected: FAIL, 5 failed | 10 passed. `gives each data slot its own page...` fails with `Unable to find an accessible element with the role "heading" and name "Cases"`; the others fail looking for the `Skip for now` or `Bind Cases` buttons.

- [ ] **Step 11: Add the Data slots step to the wizard**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText.ts`:

```ts
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import type { PluginLocaleMessages } from "@avandar/plugin-manifest/runtime";

/**
 * A function that turns a plugin's `%key%` manifest strings into the reader's
 * language, using the plugin's own locale files. Use it wherever settings
 * show a plugin's strings, such as a data slot's title in the install
 * wizard or a content item's title on the plugin's card.
 */
export function useLocalizePluginText(
  strings: PluginLocaleMessages,
): (value: string) => string {
  const { i18n } = useLingui();
  return (value) => {
    return getLocalizedTextFromManifestStrings({
      strings,
      locale: i18n.locale,
      value,
    });
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";

/**
 * The words naming a data slot's source by its kind, such as "Case type:
 * Measles cases" or "Dataset: line_list.csv". Use it wherever a bound slot
 * is listed, for example the install wizard's summary or a plugin's card.
 */
export function useDataSlotSourceLabels(): Record<
  DataSlotSource["kind"],
  (name: string) => string
> {
  const { t } = useLingui();
  return {
    concept: (name) => {
      return t`Case type: ${name}`;
    },
    dataset: (name) => {
      return t`Dataset: ${name}`;
    },
  };
}
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts` with:

```ts
import { isDefined } from "@avandar/utils";
import { useState } from "react";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { InstallWizardStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/**
 * One screen of the install wizard. The Data slots step has one page per
 * data slot. `key` is unique per page, so a page remounts, and its heading
 * takes focus, whenever the wizard moves.
 */
export type InstallWizardPage =
  | Readonly<{
      key: string;
      step: "dataSlots";
      slotId: string;
      slot: PluginDataSlot;
    }>
  | Readonly<{ key: string; step: Exclude<InstallWizardStep, "dataSlots"> }>;

/** The binding an admin chose for each data slot so far, by slot id. */
type DraftsBySlotId = Readonly<
  Record<string, PluginDataSlotBinding.Draft | undefined>
>;

/**
 * Where an admin is in the install wizard and what they chose so far.
 * `PluginInstallWizard` reads it to pick the page to draw, the footer
 * buttons to offer, and what to install.
 */
export type InstallWizardState = Readonly<{
  steps: readonly InstallWizardStep[];
  page: InstallWizardPage;
  isFirstPage: boolean;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  draftsBySlotId: DraftsBySlotId;
  setSlotDraft: (
    slotId: string,
    draft: PluginDataSlotBinding.Draft | undefined,
  ) => void;

  /** Leaves the current page's data slot unbound and moves on. */
  skipDataSlot: () => void;

  /** Every data slot binding chosen, to install with the plugin. */
  bindings: readonly PluginDataSlotBinding.Draft[];
}>;

function _makePagesFromManifest(manifest: PluginManifest): InstallWizardPage[] {
  return getInstallWizardStepsFromManifest(manifest).flatMap(
    (step): InstallWizardPage[] => {
      if (step !== "dataSlots") {
        return [{ key: step, step }];
      }
      return Object.entries(manifest.dataSlots).map(([slotId, slot]) => {
        return { key: `dataSlots.${slotId}`, step, slotId, slot };
      });
    },
  );
}

/**
 * Tracks the install wizard for one plugin's manifest: the current page, the
 * steps the manifest needs, and the data slot bindings chosen so far. Moving
 * past the last page or before the first does nothing.
 */
export function useInstallWizardState(
  manifest: PluginManifest,
): InstallWizardState {
  const [pageIndex, setPageIndex] = useState(0);
  const [draftsBySlotId, setDraftsBySlotId] = useState<DraftsBySlotId>({});
  const pages = _makePagesFromManifest(manifest);
  const page = pages[pageIndex]!;
  const setSlotDraft: InstallWizardState["setSlotDraft"] = (slotId, draft) => {
    setDraftsBySlotId({ ...draftsBySlotId, [slotId]: draft });
  };
  const goToNextPage = (): void => {
    setPageIndex(Math.min(pageIndex + 1, pages.length - 1));
  };
  return {
    steps: getInstallWizardStepsFromManifest(manifest),
    page,
    isFirstPage: pageIndex === 0,
    goToNextPage,
    goToPreviousPage: () => {
      setPageIndex(Math.max(pageIndex - 1, 0));
    },
    draftsBySlotId,
    setSlotDraft,
    skipDataSlot: () => {
      if (page.step === "dataSlots") {
        setSlotDraft(page.slotId, undefined);
      }
      goToNextPage();
    },
    bindings: Object.values(draftsBySlotId).filter(isDefined),
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  slotId: string;
  slot: PluginDataSlot;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/**
 * One page of the install wizard's Data slots step: the slot's title and
 * description in the plugin's words, whether it is needed to install, and
 * the panel that binds it.
 */
export function DataSlotsStep({
  pluginName,
  manifestModule,
  slotId,
  slot,
  draft,
  onDraftChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const slotTitle = localize(slot.title);
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{slotTitle}</InstallWizardStepHeading>
        {slot.description === undefined ? null : (
          <Text size="sm">{localize(slot.description)}</Text>
        )}
        <Text size="sm" c="dimmed">
          {slot.required
            ? t`${pluginName} needs these records before it can be installed.`
            : t`Optional. You can choose these records later on the plugin's card.`}
        </Text>
      </Stack>
      <DataSlotPanel
        slotId={slotId}
        slot={slot}
        slotTitle={slotTitle}
        localize={localize}
        draft={draft}
        onDraftChange={onDraftChange}
      />
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useDataSlotSourceLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels";
import { useDataSlotSourceOptions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  draftsBySlotId: InstallWizardState["draftsBySlotId"];
}>;

/**
 * The Confirm step's list of the records each data slot will read, such as
 * "Cases: Case type: Measles cases", or that a skipped slot has none yet.
 * Shows nothing for a plugin without data slots.
 */
export function ConfirmDataSlotsSummary({
  manifestModule,
  draftsBySlotId,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const sourceLabels = useDataSlotSourceLabels();
  const { concepts, datasets } = useDataSlotSourceOptions(
    useCurrentWorkspace().id,
  );
  const slots = Object.entries(manifestModule.manifest.dataSlots);
  if (slots.length === 0) {
    return null;
  }
  const getSourceLabel = (slotId: string): string => {
    const draft = draftsBySlotId[slotId];
    if (draft === undefined) {
      return t`not chosen yet`;
    }
    const sources = draft.sourceType === "concept" ? concepts : datasets;
    const sourceId = draft.conceptId ?? draft.datasetId;
    const name = sources.find((source) => {
      return source.id === sourceId;
    })?.name;
    return sourceLabels[draft.sourceType](name ?? "");
  };
  return (
    <PluginDetailsSection title={t`Records it reads`} headingOrder={4}>
      <List size="sm">
        {slots.map(([slotId, slot]) => {
          const slotTitle = localize(slot.title);
          const sourceLabel = getSourceLabel(slotId);
          return (
            <List.Item
              key={slotId}
            >{t`${slotTitle}: ${sourceLabel}`}</List.Item>
          );
        })}
      </List>
    </PluginDetailsSection>
  );
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx`:

```diff
@@ -1,27 +1,41 @@
 import { useLingui } from "@lingui/react/macro";
 import { Stack, Text } from "@mantine/core";
+import { ConfirmDataSlotsSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary";
 import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
+import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
+import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 
 type Props = Readonly<{
   pluginName: string;
+  manifestModule: PluginManifestModule;
+  wizard: InstallWizardState;
   installer: PluginInstaller;
 }>;
 
 /**
- * The install wizard's last page: what installing does, and, once the
- * footer's Install button has run, a status line saying the plugin is
- * installed.
+ * The install wizard's last page: what installing does, the records each
+ * data slot will read, and, once the footer's Install button has run, a
+ * status line saying the plugin is installed.
  */
-export function ConfirmStep({ pluginName, installer }: Props): JSX.Element {
+export function ConfirmStep({
+  pluginName,
+  manifestModule,
+  wizard,
+  installer,
+}: Props): JSX.Element {
   const { t } = useLingui();
   return (
     <Stack gap="md">
       <InstallWizardStepHeading>{t`Summary`}</InstallWizardStepHeading>
       <Text size="sm">
         {t`${pluginName} will be available to every member of this workspace.`}
       </Text>
+      <ConfirmDataSlotsSummary
+        manifestModule={manifestModule}
+        draftsBySlotId={wizard.draftsBySlotId}
+      />
       <Text size="sm" role="status">
         {installer.installation === undefined
           ? null
           : t`${pluginName} is installed.`}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx`:

```diff
@@ -5,21 +5,29 @@ import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/Workspace
 
 type Props = Readonly<{
   wizard: InstallWizardState;
   installer: PluginInstaller;
+
+  /** False while the current page needs a choice before the next one. */
+  canGoNext: boolean;
   onInstall: () => void;
   onClose: () => void;
 }>;
 
 function PrimaryButton({
   wizard,
   installer,
+  canGoNext,
   onInstall,
   onClose,
 }: Props): JSX.Element {
   const { t } = useLingui();
   if (wizard.page.step !== "confirm") {
-    return <Button onClick={wizard.goToNextPage}>{t`Next`}</Button>;
+    return (
+      <Button disabled={!canGoNext} onClick={wizard.goToNextPage}>
+        {t`Next`}
+      </Button>
+    );
   }
   if (installer.installation !== undefined) {
     return <Button onClick={onClose}>{t`Done`}</Button>;
   }
@@ -31,10 +39,11 @@ function PrimaryButton({
 }
 
 /**
  * The install wizard's buttons: Back, then Next on every page but the last,
- * Install on the last, and Done once installed. Back goes away once the
- * install starts, because the choices it would return to are already saved.
+ * Install on the last, and Done once installed. An optional data slot's page
+ * also offers Skip for now. Back goes away once the install starts, because
+ * the choices it would return to are already saved.
  */
 export function InstallWizardFooter(props: Props): JSX.Element {
   const { t } = useLingui();
   const { wizard, installer } = props;
@@ -46,8 +55,13 @@ export function InstallWizardFooter(props: Props): JSX.Element {
         <Button variant="default" me="auto" onClick={wizard.goToPreviousPage}>
           {t`Back`}
         </Button>
       )}
+      {wizard.page.step === "dataSlots" && !wizard.page.slot.required ? (
+        <Button variant="default" onClick={wizard.skipDataSlot}>
+          {t`Skip for now`}
+        </Button>
+      ) : null}
       <PrimaryButton {...props} />
     </Group>
   );
 }
```

Replace the whole of `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx` with:

```tsx
import { match } from "ts-pattern";
import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
import { DataSlotsStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep";
import { ReviewStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
import type { ReactNode } from "react";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  wizard: InstallWizardState;
  installer: PluginInstaller;
}>;

/** The page `PluginInstallWizard` shows for its current step. */
export function InstallWizardPageContent({
  pluginName,
  manifestModule,
  wizard,
  installer,
}: Props): ReactNode {
  return match(wizard.page)
    .with({ step: "review" }, () => {
      return <ReviewStep manifestModule={manifestModule} />;
    })
    .with({ step: "dataSlots" }, ({ slotId, slot }) => {
      return (
        <DataSlotsStep
          pluginName={pluginName}
          manifestModule={manifestModule}
          slotId={slotId}
          slot={slot}
          draft={wizard.draftsBySlotId[slotId]}
          onDraftChange={(draft) => {
            wizard.setSlotDraft(slotId, draft);
          }}
        />
      );
    })
    .with({ step: "content" }, () => {
      return null;
    })
    .with({ step: "confirm" }, () => {
      return (
        <ConfirmStep
          pluginName={pluginName}
          manifestModule={manifestModule}
          wizard={wizard}
          installer={installer}
        />
      );
    })
    .exhaustive();
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx`:

```diff
@@ -1,11 +1,13 @@
 import { Stack } from "@mantine/core";
+import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
 import { InstallWizardFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter";
 import { InstallWizardPageContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent";
 import { InstallWizardStepper } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper";
 import { useInstallPlugin } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
 import { useInstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
+import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 
 type Props = Readonly<{
   pluginName: string;
   manifestModule: PluginManifestModule;
@@ -13,8 +15,24 @@ type Props = Readonly<{
   /** Closes the modal the wizard is in. */
   onClose: () => void;
 }>;
 
+/**
+ * Whether the wizard's current page lets the admin go on: a data slot's page
+ * does once its binding is complete, and every other page always does.
+ */
+function useCanGoNext(wizard: InstallWizardState): boolean {
+  const slotPage = wizard.page.step === "dataSlots" ? wizard.page : undefined;
+  const { status } = useDataSlotDraftStatus({
+    slot: slotPage?.slot,
+    draft:
+      slotPage === undefined
+        ? undefined
+        : wizard.draftsBySlotId[slotPage.slotId],
+  });
+  return slotPage === undefined || status?.kind === "bound";
+}
+
 /**
  * The plugin install wizard: Review, then the steps the manifest needs, then
  * Confirm, which installs the plugin. Opened in a modal by
  * `openPluginInstallWizard` from a plugin's settings card.
@@ -28,8 +46,9 @@ export function PluginInstallWizard({
   const installer = useInstallPlugin({
     pluginName,
     manifest: manifestModule.manifest,
   });
+  const canGoNext = useCanGoNext(wizard);
   return (
     <Stack gap="lg">
       <InstallWizardStepper steps={wizard.steps} activeStep={wizard.page.step}>
         <Stack key={wizard.page.key} pt="md">
@@ -43,10 +62,11 @@ export function PluginInstallWizard({
       </InstallWizardStepper>
       <InstallWizardFooter
         wizard={wizard}
         installer={installer}
+        canGoNext={canGoNext}
         onInstall={() => {
-          installer.install([]);
+          installer.install(wizard.bindings);
         }}
         onClose={onClose}
       />
     </Stack>
```

- [ ] **Step 12: Run the whole tab's tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS (89 tests in 8 files)

- [ ] **Step 13: Type check, format, lint**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit && pnpm exec oxfmt --ignore-path .oxfmtignore src/views/WorkspaceSettingsPage/WorkspacePluginsTab && pnpm exec eslint src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: no errors

- [ ] **Step 14: Commit**

```bash
git add src/views/WorkspaceSettingsPage/WorkspacePluginsTab
git commit -m "feat(plugins): bind data slots in the install wizard with a live check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- Mantine `Select` inputs have the role `combobox` (not `textbox`), and their dropdowns stay mounted hidden, so the tests read options with `getMantineSelectDropdown` and pick them with `pickMantineSelectOption` from `@/test-utils/pickMantineSelectOption`.
- The source picker's values are `concept:<id>` and `dataset:<id>`, so one picker holds both kinds.
- A case type matches the slot's `concept` hint when its name is equal ignoring case (spec: "compared without case").
- `@tanstack/query/exhaustive-deps` requires every value the query function reads to be in the key; passing the slot, source, and fields objects satisfies it and keys the check by content.
- `DataSlotPanel` reads the workspace with `useCurrentWorkspace`. That works inside a modal, because the app's `ModalsProvider` sits inside the workspace route (`WorkspaceLayoutContents`).
- Not done: matching attributes to fields by name automatically. The spec does not ask for it.
- User-visible copy added here (Task 21's E2E helper selects on it): source picker `Case type or dataset` (placeholder `Choose where the records come from`, groups `Case types` and `Datasets`); each attribute picker is labeled by the attribute's localized title, with the type as its description (`Number`, `Date`, `Text`, `Yes / no`, `Province or region, name or code`, `District, name or code`) and placeholder `Select a field` (or `No fields of this type`); the fields group `Fields for <slot title>`; check states `Checking these records`, `<n> record(s)`, `<attribute>: <n> of <total> have a value`, table caption `First rows of <slot title>`, error `Could not read these records. <reason>`; the slot page's heading is the slot's localized title, with `<plugin name> needs these records before it can be installed.` or `Optional. You can choose these records later on the plugin's card.`; footer button `Skip for now`; Confirm section `Records it reads` with lines `<slot title>: Case type: <name>`, `<slot title>: Dataset: <name>`, or `<slot title>: not chosen yet`.

---

### Task 17: Content step and `importPluginContentItem`

**Goal:** A plugin's bundled datasets are imported into the workspace after it installs. The wizard's Content step lists them as a checklist (all checked; one the workspace already imported is disabled and says so), and the Confirm step imports the chosen ones one at a time after the install, showing each item's progress, and the reason with Retry for one that failed. Each item becomes an ordinary CSV dataset, saved the way a CSV upload is, and a `plugin_content_imports` row is written last.

**Files:**
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ContentStep.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentSummary.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentItemRow.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts` (chosen content ids), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin.ts` (`onInstalled`), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx` (the Content page), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx` (the datasets summary), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx` (Done waits for imports), `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx` (imports after install)
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem.test.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.test.tsx`
- Modify (tests): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`

**Depends on:** Task 3 (`PluginContentItem`), Task 5 (`PluginIndexEntry.loadContentUrls`), Task 12 (`PluginContentImportClient`, `PluginContentImport.T`), Task 15 (the wizard), Task 16 (`useLocalizePluginText` and the wizard state it extended).

- [ ] **Step 1: Write the failing tests for importing one item**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importPluginContentItem } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

const mocks = vi.hoisted(() => {
  return {
    fetch: vi.fn(),
    startCsvImport: vi.fn(),
    dropLocalDataset: vi.fn(),
    insertCsvFileDataset: vi.fn(),
    fullDelete: vi.fn(),
    startDatasetUpload: vi.fn(),
    insertContentImport: vi.fn(),
  };
});

vi.mock("$/lib/uuid", () => {
  return {
    uuid: () => {
      return "00000000-0000-4000-8000-000000000042";
    },
  };
});
vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      startCsvImport: mocks.startCsvImport,
      dropLocalDataset: mocks.dropLocalDataset,
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      insertCsvFileDataset: mocks.insertCsvFileDataset,
      fullDelete: mocks.fullDelete,
    },
  };
});
vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: {
        startDatasetUpload: mocks.startDatasetUpload,
      },
    };
  },
);
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: { insert: mocks.insertContentImport },
    };
  },
);

const DATASET_ID = "00000000-0000-4000-8000-000000000042" as Dataset.Id;
const CSV_TEXT = "province_code,province_name\nMOZ-1,Niassa\n";

const ITEM: PluginContentItem = {
  id: "provinces",
  kind: "dataset",
  title: "%content.provinces.title%",
  description: "%content.provinces.description%",
  file: "content/mz-adm1.csv",
};

const SNIFF = {
  csvSniff: {
    Delimiter: ",",
    Quote: '"',
    Escape: '"',
    NewLineDelimiter: "\n",
    Comment: "",
    SkipRows: 0,
    HasHeader: true,
    Columns: [],
    DateFormat: null,
    TimestampFormat: "%Y-%m-%d %H:%M:%S",
  },
  columns: [
    { column_name: "province_code", column_type: "VARCHAR" },
    { column_name: "province_name", column_type: "VARCHAR" },
  ],
  previewRows: [],
};

async function _importProvinces(): Promise<Dataset.Id> {
  return await importPluginContentItem({
    workspaceId: "workspace-id" as Workspace.Id,
    userId: "user-id" as User.Id,
    pluginId: "avandar.mozambique",
    item: ITEM,
    datasetName: "Mozambique provinces",
    datasetDescription: "Province boundaries. CC BY 3.0 IGO.",
    url: "/assets/mz-adm1.csv",
  });
}

describe("importPluginContentItem", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset();
    });
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue(new Response(CSV_TEXT, { status: 200 }));
    mocks.startCsvImport.mockResolvedValue(SNIFF);
    mocks.insertCsvFileDataset.mockResolvedValue({ id: DATASET_ID });
    mocks.startDatasetUpload.mockResolvedValue(undefined);
    mocks.insertContentImport.mockResolvedValue({ id: "import-id" });
    mocks.fullDelete.mockResolvedValue(undefined);
    mocks.dropLocalDataset.mockResolvedValue(undefined);
  });

  it("returns the id of the dataset it created", async () => {
    expect(await _importProvinces()).toBe(DATASET_ID);
  });

  it("parses the downloaded file, named after the item's file", async () => {
    await _importProvinces();

    expect(mocks.fetch).toHaveBeenCalledWith("/assets/mz-adm1.csv");
    const { file, datasetId, parseOptions } =
      mocks.startCsvImport.mock.calls[0]![0];
    expect(file.name).toBe("mz-adm1.csv");
    expect(file.size).toBe(CSV_TEXT.length);
    expect(datasetId).toBe(DATASET_ID);
    expect(parseOptions).toEqual({});
  });

  it("saves a CSV dataset named and described by the item, with the sniffed dialect", async () => {
    await _importProvinces();

    expect(mocks.insertCsvFileDataset).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: DATASET_ID,
        workspaceId: "workspace-id",
        datasetName: "Mozambique provinces",
        datasetDescription: "Province boundaries. CC BY 3.0 IGO.",
        isInCloudStorage: true,
        sizeInBytes: CSV_TEXT.length,
        parseOptions: {
          rowsToSkip: 0,
          delimiter: ",",
          quoteChar: '"',
          escapeChar: '"',
          newlineDelimiter: "\n",
          commentChar: "",
          hasHeader: true,
          dateFormat: undefined,
          timestampFormat: "%Y-%m-%d %H:%M:%S",
        },
      }),
    );
  });

  it("saves one column per sniffed column, in file order", async () => {
    await _importProvinces();

    const { columns } = mocks.insertCsvFileDataset.mock.calls[0]![0];
    expect(columns).toMatchObject([
      { name: "province_code", data_type: "varchar", column_idx: 0 },
      { name: "province_name", data_type: "varchar", column_idx: 1 },
    ]);
  });

  it("records the import only after the dataset's upload finishes", async () => {
    await _importProvinces();

    expect(mocks.insertContentImport).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace-id",
        pluginId: "avandar.mozambique",
        contentId: "provinces",
        datasetId: DATASET_ID,
      }),
    });
    const [uploadOrder] = mocks.startDatasetUpload.mock.invocationCallOrder;
    const [recordOrder] = mocks.insertContentImport.mock.invocationCallOrder;
    expect(uploadOrder).toBeLessThan(recordOrder!);
  });

  it("uploads the dataset as a CSV dataset of the workspace", async () => {
    await _importProvinces();

    expect(mocks.startDatasetUpload).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      datasetId: DATASET_ID,
      sourceType: "csv_file",
    });
  });

  it("deletes the new dataset and rethrows when the upload fails", async () => {
    mocks.startDatasetUpload.mockRejectedValue(new Error("upload failed"));

    await expect(_importProvinces()).rejects.toThrow("upload failed");

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DATASET_ID });
    expect(mocks.dropLocalDataset).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
    });
    expect(mocks.insertContentImport).not.toHaveBeenCalled();
  });

  it("deletes the new dataset and rethrows when recording the import fails", async () => {
    mocks.insertContentImport.mockRejectedValue(new Error("duplicate key"));

    await expect(_importProvinces()).rejects.toThrow("duplicate key");

    expect(mocks.fullDelete).toHaveBeenCalledWith({ id: DATASET_ID });
  });

  it("rethrows the import's own error when deleting the dataset also fails", async () => {
    mocks.startDatasetUpload.mockRejectedValue(new Error("upload failed"));
    mocks.fullDelete.mockRejectedValue(new Error("delete failed"));

    await expect(_importProvinces()).rejects.toThrow("upload failed");
  });

  it("creates nothing and names the file when the download fails", async () => {
    mocks.fetch.mockResolvedValue(new Response("", { status: 404 }));

    await expect(_importProvinces()).rejects.toThrow(
      "Could not download content/mz-adm1.csv (HTTP 404).",
    );

    expect(mocks.startCsvImport).not.toHaveBeenCalled();
    expect(mocks.insertCsvFileDataset).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem"`

- [ ] **Step 3: Implement `importPluginContentItem`**

It mirrors `saveCsvDataset` (`src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/saveCsvDataset.ts`): the sniffed dialect becomes the dataset's parse options, and the columns go through the same `duckDbColumnsToImportedColumns`. Unlike the import form, it awaits the Parquet upload, so the import row is written only for a dataset other members can load.

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem.ts`:

```ts
import { Model } from "@avandar/models";
import { MIMEType, snakeCaseKeysShallow } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { uuid } from "$/lib/uuid";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { duckDbColumnsToImportedColumns } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/duckDbColumnsToImportedColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { CsvDatasetParseOptions } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { DuckDbCsvSniffResult } from "@/clients/DuckDbClient/DuckDbClient.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/** Downloads a content item's bundled CSV as a file named like the original. */
async function _fetchContentFile(options: {
  url: string;
  item: PluginContentItem;
}): Promise<File> {
  const { url, item } = options;
  const response = await fetch(url);
  if (!response.ok) {
    const { status } = response;
    const filePath = item.file;
    throw new Error(t`Could not download ${filePath} (HTTP ${status}).`);
  }
  const fileName = item.file.split("/").pop() ?? item.file;
  return new File([await response.blob()], fileName, {
    type: MIMEType.TEXT_CSV,
  });
}

/** The CSV dialect DuckDB sniffed, as a dataset stores it. */
function _makeParseOptionsFromSniff(
  csvSniff: DuckDbCsvSniffResult,
): CsvDatasetParseOptions {
  return {
    rowsToSkip: csvSniff.SkipRows,
    delimiter: csvSniff.Delimiter,
    quoteChar: csvSniff.Quote,
    escapeChar: csvSniff.Escape,
    newlineDelimiter: csvSniff.NewLineDelimiter,
    commentChar: csvSniff.Comment,
    hasHeader: csvSniff.HasHeader,
    dateFormat: csvSniff.DateFormat ?? undefined,
    timestampFormat: csvSniff.TimestampFormat ?? undefined,
  };
}

/**
 * Removes a half-imported dataset everywhere it may be, ignoring failures,
 * so the import's own error is the one the caller sees.
 */
async function _deleteDatasetBestEffort(datasetId: Dataset.Id): Promise<void> {
  await Promise.allSettled([
    DatasetClient.fullDelete({ id: datasetId }),
    LocalDatasetClient.dropLocalDataset({ datasetId }),
  ]);
}

type ImportPluginContentItemOptions = {
  workspaceId: Workspace.Id;
  userId: User.Id;
  pluginId: string;
  item: PluginContentItem;
  datasetName: string;
  datasetDescription: string;
  url: string;
};

/**
 * Saves the parsed file as a dataset, waits for its upload, and records the
 * import, in that order.
 */
async function _saveAndRecordDataset(
  options: Readonly<
    ImportPluginContentItemOptions & {
      datasetId: Dataset.Id;
      file: File;
      sniff: Awaited<ReturnType<typeof LocalDatasetClient.startCsvImport>>;
    }
  >,
): Promise<void> {
  const { workspaceId, datasetId, sniff } = options;
  await DatasetClient.insertCsvFileDataset({
    datasetId,
    workspaceId,
    datasetName: options.datasetName,
    datasetDescription: options.datasetDescription,
    columns: duckDbColumnsToImportedColumns(sniff.columns).map(
      snakeCaseKeysShallow,
    ),
    isInCloudStorage: true,
    sizeInBytes: options.file.size,
    parseOptions: _makeParseOptionsFromSniff(sniff.csvSniff),
  });
  await DatasetParquetStorageClient.startDatasetUpload({
    workspaceId,
    datasetId,
    sourceType: "csv_file",
  });
  await PluginContentImportClient.insert({
    data: Model.make("PluginContentImport", {
      workspaceId,
      pluginId: options.pluginId,
      contentId: options.item.id,
      datasetId,
    }),
  });
}

/**
 * Imports one plugin content item as an ordinary CSV dataset of the
 * workspace, the same way a CSV upload is saved: it parses the bundled file,
 * saves the dataset, waits for its upload, and only then records the import,
 * so a recorded item always has a complete dataset. Anything that fails
 * after the dataset is saved deletes it again before the error is rethrown.
 * The install wizard and a plugin's settings card import content with it.
 */
export async function importPluginContentItem(
  options: Readonly<ImportPluginContentItemOptions>,
): Promise<Dataset.Id> {
  const file = await _fetchContentFile({
    url: options.url,
    item: options.item,
  });
  const datasetId = uuid() as Dataset.Id;
  const sniff = await LocalDatasetClient.startCsvImport({
    datasetId,
    workspaceId: options.workspaceId,
    userId: options.userId,
    file,
    parseOptions: {},
  });
  try {
    await _saveAndRecordDataset({ ...options, datasetId, file, sniff });
  } catch (error) {
    await _deleteDatasetBestEffort(datasetId);
    throw error;
  }
  return datasetId;
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem`
Expected: PASS (10 tests)

- [ ] **Step 5: Write the failing tests for the import queue**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    importPluginContentItem: vi.fn(),
    contentUrls: {} as Record<string, string>,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: () => {
      return {
        loadContentUrls: () => {
          return Promise.resolve(mocks.contentUrls);
        },
      };
    },
  };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: mocks.importPluginContentItem };
  },
);

const PROVINCES: PluginContentItem = {
  id: "provinces",
  kind: "dataset",
  title: "%content.provinces.title%",
  description: "%content.provinces.description%",
  file: "content/mz-adm1.csv",
};

const DISTRICTS: PluginContentItem = {
  id: "districts",
  kind: "dataset",
  title: "%content.districts.title%",
  description: "%content.districts.description%",
  file: "content/mz-adm2.csv",
};

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.mozambique",
    contributes: { content: [PROVINCES, DISTRICTS] },
  },
  strings: {
    en: {
      "content.provinces.title": "Mozambique provinces",
      "content.provinces.description": "Province boundaries.",
      "content.districts.title": "Mozambique districts",
      "content.districts.description": "District boundaries.",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
}

function _renderImports(): {
  result: { current: ReturnType<typeof usePluginContentImports> };
} {
  return renderHook(
    () => {
      return usePluginContentImports(MANIFEST_MODULE);
    },
    { wrapper: Wrapper },
  );
}

describe("usePluginContentImports", () => {
  beforeEach(() => {
    mocks.importPluginContentItem.mockReset();
    mocks.contentUrls = {
      provinces: "/assets/mz-adm1.csv",
      districts: "/assets/mz-adm2.csv",
    };
    queryClient = new QueryClient();
  });

  it("imports each item with its file's URL and its name and description in the reader's language", async () => {
    mocks.importPluginContentItem.mockResolvedValue("dataset-id");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(mocks.importPluginContentItem).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      userId: "user-id",
      pluginId: "avandar.mozambique",
      item: PROVINCES,
      datasetName: "Mozambique provinces",
      datasetDescription: "Province boundaries.",
      url: "/assets/mz-adm1.csv",
    });
  });

  it("imports one item at a time, waiting for each to finish", async () => {
    let finishProvinces: (datasetId: string) => void = () => {};
    mocks.importPluginContentItem.mockImplementation(({ item }) => {
      return item.id === "provinces"
        ? new Promise((resolve) => {
            finishProvinces = resolve;
          })
        : Promise.resolve("districts-dataset");
    });
    const { result } = _renderImports();

    act(() => {
      void result.current.importItems([PROVINCES, DISTRICTS]);
    });
    await waitFor(() => {
      expect(result.current.statusesByContentId.provinces).toEqual({
        kind: "importing",
      });
    });
    expect(result.current.statusesByContentId.districts).toEqual({
      kind: "pending",
    });
    expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishProvinces("provinces-dataset");
    });

    await waitFor(() => {
      expect(result.current.statusesByContentId.districts).toEqual({
        kind: "done",
        datasetId: "districts-dataset",
      });
    });
  });

  it("goes on with the next item when one fails, and keeps the reason", async () => {
    mocks.importPluginContentItem
      .mockRejectedValueOnce(new Error("permission denied for datasets"))
      .mockResolvedValueOnce("districts-dataset");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES, DISTRICTS]);
    });

    expect(result.current.statusesByContentId).toEqual({
      provinces: { kind: "failed", reason: "permission denied for datasets" },
      districts: { kind: "done", datasetId: "districts-dataset" },
    });
    expect(result.current.isImporting).toBe(false);
  });

  it("retries a failed item on its own", async () => {
    mocks.importPluginContentItem
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("provinces-dataset");
    const { result } = _renderImports();
    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(result.current.statusesByContentId.provinces).toEqual({
      kind: "done",
      datasetId: "provinces-dataset",
    });
    expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(2);
  });

  it("fails an item whose bundled file the plugin no longer has", async () => {
    mocks.contentUrls = { provinces: "/assets/mz-adm1.csv" };
    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([DISTRICTS]);
    });

    expect(result.current.statusesByContentId.districts).toEqual({
      kind: "failed",
      reason: "This plugin no longer includes content/mz-adm2.csv.",
    });
    expect(mocks.importPluginContentItem).not.toHaveBeenCalled();
  });

  it("refreshes the workspace's imported content after an item is imported", async () => {
    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: PluginContentImportClient.QueryKeys.getAll(),
    });
  });
});
```

- [ ] **Step 6: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports"`

- [ ] **Step 7: Implement the import queue**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.ts`:

```ts
import { promiseMapSequential } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import { importPluginContentItem } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/**
 * Where one content item's import stands in this session.
 *
 * - `pending`: queued behind the item importing before it.
 * - `importing`: downloading, parsing, and uploading now.
 * - `done`: imported as the dataset `datasetId`.
 * - `failed`: stopped for `reason`. Importing it again retries it.
 */
export type PluginContentImportStatus =
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "importing" }>
  | Readonly<{ kind: "done"; datasetId: Dataset.Id }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** A plugin's content imports, with what each item is doing. */
export type PluginContentImports = Readonly<{
  /** Only items imported in this session have a status. */
  statusesByContentId: Readonly<Record<string, PluginContentImportStatus>>;
  isImporting: boolean;

  /** Imports items one at a time. A failure stops only that item. */
  importItems: (items: readonly PluginContentItem[]) => Promise<void>;
}>;

type StatusesByContentId = PluginContentImports["statusesByContentId"];

function _getReasonFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type ContentUrlsPromise = Promise<Readonly<Record<string, string>>>;

/** Imports one content item, recording its status as it goes. */
function useImportContentItem(
  manifestModule: PluginManifestModule,
  setStatuses: (statuses: StatusesByContentId) => void,
): (item: PluginContentItem, urlsPromise: ContentUrlsPromise) => Promise<void> {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const localize = useLocalizePluginText(manifestModule.strings);
  return async (item, urlsPromise) => {
    setStatuses({ [item.id]: { kind: "importing" } });
    try {
      const url = (await urlsPromise)[item.id];
      if (url === undefined) {
        const filePath = item.file;
        throw new Error(t`This plugin no longer includes ${filePath}.`);
      }
      const datasetId = await importPluginContentItem({
        workspaceId: workspace.id,
        userId: user!.id,
        pluginId: manifestModule.manifest.id,
        item,
        datasetName: localize(item.title),
        datasetDescription: localize(item.description),
        url,
      });
      setStatuses({ [item.id]: { kind: "done", datasetId } });
      void queryClient.invalidateQueries({
        queryKey: PluginContentImportClient.QueryKeys.getAll(),
      });
    } catch (error) {
      setStatuses({
        [item.id]: { kind: "failed", reason: _getReasonFromError(error) },
      });
    }
  };
}

/**
 * Imports a plugin's bundled content into the current workspace as datasets,
 * named and described in the reader's language, and tracks each item's
 * progress for the screen that started it. Use it wherever content is
 * imported, for example the install wizard's Confirm step or the Import and
 * Retry buttons on a plugin's card.
 */
export function usePluginContentImports(
  manifestModule: PluginManifestModule,
): PluginContentImports {
  const [statusesByContentId, setStatusesByContentId] =
    useState<StatusesByContentId>({});
  const setStatuses = (statuses: StatusesByContentId): void => {
    setStatusesByContentId((current) => {
      return { ...current, ...statuses };
    });
  };
  const importItem = useImportContentItem(manifestModule, setStatuses);
  return {
    statusesByContentId,
    isImporting: Object.values(statusesByContentId).some((status) => {
      return status.kind === "pending" || status.kind === "importing";
    }),
    importItems: async (items) => {
      setStatuses(
        Object.fromEntries(
          items.map((item) => {
            return [item.id, { kind: "pending" }];
          }),
        ),
      );
      // Loaded once for the batch, and awaited inside each item's import,
      // so a failure to load them fails each item with its reason.
      const urlsPromise = Promise.resolve(
        getPluginIndexEntry(manifestModule.manifest.id)?.loadContentUrls?.() ??
          {},
      );
      await promiseMapSequential(items, (item) => {
        return importItem(item, urlsPromise);
      });
    },
  };
}
```

- [ ] **Step 8: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent`
Expected: PASS (16 tests in 2 files)

- [ ] **Step 9: Write the failing wizard tests for content**

Both test files stub `importPluginContentItem`, the content import client, and `useCurrentUser`: the import module pulls in DuckDB and storage modules, and `useCurrentUser` reads the router, which the tests do not mount.

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`:

```diff
@@ -1,7 +1,7 @@
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { beforeEach, describe, expect, it, vi } from "vitest";
-import { cleanup, fireEvent, render, screen } from "@/test-utils";
+import { cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
 import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
 import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { ReactNode } from "react";
@@ -16,8 +16,10 @@ const mocks = vi.hoisted(() => {
     install: vi.fn(),
     installOptions: undefined as InstallOptions | undefined,
     notifySuccess: vi.fn(),
     notifyError: vi.fn(),
+    contentImports: [] as unknown[],
+    importPluginContentItem: vi.fn(),
   };
 });
 
 vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
@@ -26,8 +28,52 @@ vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
       return { id: "workspace-id", slug: "workspace-slug" };
     },
   };
 });
+vi.mock("@/hooks/users/useCurrentUser", () => {
+  return {
+    useCurrentUser: () => {
+      return { id: "user-id" };
+    },
+  };
+});
+vi.mock(
+  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
+  () => {
+    return {
+      PluginContentImportClient: {
+        QueryKeys: {
+          getAll: () => {
+            return ["PluginContentImportClient", "getAll"];
+          },
+        },
+        useGetAll: () => {
+          return [mocks.contentImports, false, {}];
+        },
+      },
+    };
+  },
+);
+vi.mock(
+  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
+  () => {
+    return { importPluginContentItem: mocks.importPluginContentItem };
+  },
+);
+vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
+  return {
+    getPluginIndexEntry: () => {
+      return {
+        loadContentUrls: () => {
+          return Promise.resolve({
+            provinces: "/assets/mz-adm1.csv",
+            districts: "/assets/mz-adm2.csv",
+          });
+        },
+      };
+    },
+  };
+});
 vi.mock(
   "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
   () => {
     return {
@@ -130,8 +176,25 @@ const DATA_SLOTS = {
     },
   },
 };
 
+const CONTENT = [
+  {
+    id: "provinces",
+    kind: "dataset",
+    title: "%content.provinces.title%",
+    description: "%content.provinces.description%",
+    file: "content/mz-adm1.csv",
+  },
+  {
+    id: "districts",
+    kind: "dataset",
+    title: "%content.districts.title%",
+    description: "%content.districts.description%",
+    file: "content/mz-adm2.csv",
+  },
+];
+
 let queryClient: QueryClient;
 
 function _makeDraft(slotId: string): PluginDataSlotBinding.Draft {
   return {
@@ -173,8 +236,12 @@ function _makeManifestModule(
         "run.title": "Linear regression",
         "slot.cases.title": "Cases",
         "slot.cases.description": "The case records the epicurve counts.",
         "slot.deaths.title": "Deaths",
+        "content.provinces.title": "Mozambique provinces",
+        "content.provinces.description": "Province boundaries.",
+        "content.districts.title": "Mozambique districts",
+        "content.districts.description": "District boundaries.",
       },
     },
     icons: {},
   } as unknown as PluginManifestModule;
@@ -211,8 +278,10 @@ describe("PluginInstallWizard", () => {
   beforeEach(() => {
     cleanup();
     vi.clearAllMocks();
     mocks.install.mockReset();
+    mocks.importPluginContentItem.mockReset();
+    mocks.contentImports = [];
     queryClient = new QueryClient({
       defaultOptions: { queries: { retry: false } },
     });
     onClose = vi.fn();
@@ -418,5 +487,136 @@ describe("PluginInstallWizard", () => {
         screen.getByText("Deaths: Case type: Measles deaths"),
       ).toBeInTheDocument();
     });
   });
+
+  describe("content", () => {
+    function _renderWizardWithContent(): void {
+      _renderWizard(
+        _makeManifestModule({
+          permissions: [],
+          contributes: {
+            commands: [],
+            menus: {},
+            vizTypes: [],
+            aiTools: [],
+            content: CONTENT,
+          },
+        }),
+      );
+    }
+
+    function _installFromContentStep(): void {
+      _succeedInstall();
+      _clickButton("Next");
+      _clickButton("Install");
+    }
+
+    it("lists every bundled dataset on the Content step, each checked to start with", () => {
+      _renderWizardWithContent();
+
+      _clickButton("Next");
+
+      expect(
+        screen.getByRole("heading", { name: "Datasets to import" }),
+      ).toHaveFocus();
+      expect(
+        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
+      ).toBeChecked();
+      expect(
+        screen.getByRole("checkbox", { name: "Mozambique districts" }),
+      ).toBeChecked();
+    });
+
+    it("disables a dataset the workspace already imported and says so", () => {
+      mocks.contentImports = [{ contentId: "provinces", datasetId: "d-1" }];
+      _renderWizardWithContent();
+
+      _clickButton("Next");
+
+      expect(
+        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
+      ).toBeDisabled();
+      expect(screen.getByText("Already in this workspace")).toBeInTheDocument();
+    });
+
+    it("imports only chosen datasets the workspace lacks, once installed", async () => {
+      mocks.contentImports = [{ contentId: "provinces", datasetId: "d-1" }];
+      mocks.importPluginContentItem.mockResolvedValue("d-2");
+      _renderWizardWithContent();
+      _clickButton("Next");
+
+      _installFromContentStep();
+
+      expect(await screen.findByText("Imported")).toBeInTheDocument();
+      expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);
+      expect(mocks.importPluginContentItem).toHaveBeenCalledWith(
+        expect.objectContaining({
+          item: CONTENT[1],
+          datasetName: "Mozambique districts",
+          url: "/assets/mz-adm2.csv",
+        }),
+      );
+    });
+
+    it("imports nothing when every dataset is unchecked", () => {
+      _renderWizardWithContent();
+      _clickButton("Next");
+      fireEvent.click(
+        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
+      );
+      fireEvent.click(
+        screen.getByRole("checkbox", { name: "Mozambique districts" }),
+      );
+
+      _installFromContentStep();
+
+      expect(screen.getByText("None")).toBeInTheDocument();
+      expect(mocks.importPluginContentItem).not.toHaveBeenCalled();
+    });
+
+    it("shows why a dataset failed and imports it again with Retry", async () => {
+      mocks.importPluginContentItem
+        .mockRejectedValueOnce(new Error("permission denied"))
+        .mockResolvedValue("d-2");
+      _renderWizardWithContent();
+      _clickButton("Next");
+      _installFromContentStep();
+      expect(
+        await screen.findByText("Failed: permission denied"),
+      ).toBeInTheDocument();
+
+      _clickButton("Retry Mozambique provinces");
+
+      await waitFor(() => {
+        expect(screen.getAllByText("Imported")).toHaveLength(2);
+      });
+      expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(3);
+    });
+
+    it("keeps Done disabled until the imports finish", async () => {
+      let finishImport: (datasetId: string) => void = () => {};
+      mocks.importPluginContentItem.mockImplementation(() => {
+        return new Promise((resolve) => {
+          finishImport = resolve;
+        });
+      });
+      _renderWizardWithContent();
+      _clickButton("Next");
+      _installFromContentStep();
+      await waitFor(() => {
+        expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);
+      });
+      expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
+
+      finishImport("d-1");
+      await waitFor(() => {
+        expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(2);
+      });
+      finishImport("d-2");
+
+      await waitFor(() => {
+        expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
+      });
+    });
+  });
 });
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`:

```diff
@@ -77,10 +77,11 @@ vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
       });
     },
   };
 });
-// The install wizard lists the workspace's case types and datasets. These
-// stubs keep the dataset client's DuckDB and storage modules out of the test.
+// The install wizard lists the workspace's case types and datasets, and
+// imports content. These stubs keep the dataset clients' DuckDB and storage
+// modules out of the test.
 vi.mock("@/clients/ontology/ConceptClient", () => {
   return {
     ConceptClient: {
       useGetAll: () => {
@@ -121,8 +122,38 @@ vi.mock(
   () => {
     return { checkDataSlotBinding: vi.fn() };
   },
 );
+vi.mock(
+  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
+  () => {
+    return { importPluginContentItem: vi.fn() };
+  },
+);
+vi.mock(
+  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
+  () => {
+    return {
+      PluginContentImportClient: {
+        QueryKeys: {
+          getAll: () => {
+            return ["PluginContentImportClient", "getAll"];
+          },
+        },
+        useGetAll: () => {
+          return [[], false, {}];
+        },
+      },
+    };
+  },
+);
+vi.mock("@/hooks/users/useCurrentUser", () => {
+  return {
+    useCurrentUser: () => {
+      return { id: "user-id" };
+    },
+  };
+});
 vi.mock("@/utils/Logger", () => {
   return { Logger: { error: vi.fn() } };
 });
 
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.test.tsx`
Expected: FAIL, 6 failed | 15 passed. `lists every bundled dataset on the Content step...` fails with `Unable to find an accessible element with the role "heading" and name "Datasets to import"`; the others fail looking for the checkboxes, `Imported`, or `Failed: permission denied`.

- [ ] **Step 11: Add the Content step and the imports after install**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent.ts`:

```ts
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { PluginContentImport } from "$/models/PluginContentImport/PluginContentImport";

/** The content a plugin already imported into the current workspace. */
export type ImportedPluginContent = Readonly<{
  /** Each import by the manifest content id it imported. */
  importsByContentId: Readonly<Record<string, PluginContentImport.T>>;
  isLoading: boolean;
}>;

/**
 * Loads which of a plugin's content items the current workspace already
 * imported, even through an earlier install. Use it wherever content is
 * offered for import, for example to disable an item the install wizard
 * would otherwise import twice, or to link an item to its dataset.
 */
export function useImportedPluginContent(
  pluginId: string,
): ImportedPluginContent {
  const workspace = useCurrentWorkspace();
  const [imports, isLoading] = PluginContentImportClient.useGetAll({
    where: {
      workspace_id: { eq: workspace.id },
      plugin_id: { eq: pluginId },
    },
  });
  return {
    importsByContentId: Object.fromEntries(
      (imports ?? []).map((contentImport) => {
        return [contentImport.contentId, contentImport];
      }),
    ),
    isLoading,
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { match } from "ts-pattern";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{ status: PluginContentImportStatus }>;

/**
 * One content item's import progress in words, with a spinner while it runs
 * and the reason when it failed. Shown next to each item being imported,
 * for example in the install wizard's summary or on a plugin's card.
 */
export function PluginContentImportStatusText({ status }: Props): JSX.Element {
  const { t } = useLingui();
  return match(status)
    .with({ kind: "pending" }, () => {
      return (
        <Text size="sm" c="dimmed">
          {t`Waiting`}
        </Text>
      );
    })
    .with({ kind: "importing" }, () => {
      return (
        <Group gap="xxs" wrap="nowrap">
          <Loader size="xs" aria-hidden />
          <Text size="sm">{t`Importing`}</Text>
        </Group>
      );
    })
    .with({ kind: "done" }, () => {
      return (
        <Group gap="xxs" wrap="nowrap">
          <IconCheck size={16} aria-hidden />
          <Text size="sm">{t`Imported`}</Text>
        </Group>
      );
    })
    .with({ kind: "failed" }, ({ reason }) => {
      return <Text size="sm" c="danger">{t`Failed: ${reason}`}</Text>;
    })
    .exhaustive();
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState.ts`:

```diff
@@ -48,8 +48,12 @@ export type InstallWizardState = Readonly<{
   skipDataSlot: () => void;
 
   /** Every data slot binding chosen, to install with the plugin. */
   bindings: readonly PluginDataSlotBinding.Draft[];
+
+  /** The content items to import, by id. Every item to start with. */
+  chosenContentIds: readonly string[];
+  setIsContentChosen: (contentId: string, isChosen: boolean) => void;
 }>;
 
 function _makePagesFromManifest(manifest: PluginManifest): InstallWizardPage[] {
   return getInstallWizardStepsFromManifest(manifest).flatMap(
@@ -63,18 +67,44 @@ function _makePagesFromManifest(manifest: PluginManifest): InstallWizardPage[] {
     },
   );
 }
 
+/** The content items an admin left checked, all of them to start with. */
+function useChosenContentIds(
+  manifest: PluginManifest,
+): Pick<InstallWizardState, "chosenContentIds" | "setIsContentChosen"> {
+  const [chosenContentIds, setChosenContentIds] = useState<readonly string[]>(
+    () => {
+      return manifest.contributes.content.map((item) => {
+        return item.id;
+      });
+    },
+  );
+  return {
+    chosenContentIds,
+    setIsContentChosen: (contentId, isChosen) => {
+      const otherContentIds = chosenContentIds.filter((chosenContentId) => {
+        return chosenContentId !== contentId;
+      });
+      setChosenContentIds(
+        isChosen ? [...otherContentIds, contentId] : otherContentIds,
+      );
+    },
+  };
+}
+
 /**
  * Tracks the install wizard for one plugin's manifest: the current page, the
- * steps the manifest needs, and the data slot bindings chosen so far. Moving
- * past the last page or before the first does nothing.
+ * steps the manifest needs, the data slot bindings chosen so far, and the
+ * content items to import. Moving past the last page or before the first
+ * does nothing.
  */
 export function useInstallWizardState(
   manifest: PluginManifest,
 ): InstallWizardState {
   const [pageIndex, setPageIndex] = useState(0);
   const [draftsBySlotId, setDraftsBySlotId] = useState<DraftsBySlotId>({});
+  const chosenContent = useChosenContentIds(manifest);
   const pages = _makePagesFromManifest(manifest);
   const page = pages[pageIndex]!;
   const setSlotDraft: InstallWizardState["setSlotDraft"] = (slotId, draft) => {
     setDraftsBySlotId({ ...draftsBySlotId, [slotId]: draft });
@@ -98,6 +128,7 @@ export function useInstallWizardState(
       }
       goToNextPage();
     },
     bindings: Object.values(draftsBySlotId).filter(isDefined),
+    ...chosenContent,
   };
 }
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin.ts`:

```diff
@@ -21,22 +21,26 @@ export type PluginInstaller = Readonly<{
  * Installs one plugin in the current workspace, together with the data slot
  * bindings an admin chose, from the install wizard's Confirm step. It shows
  * the same success and error notifications as the other plugin actions, and
  * refreshes every plugin installs query so the plugin turns on right away.
+ * `onInstalled` runs once the install is saved, for example to import the
+ * plugin's content.
  */
 export function useInstallPlugin(options: {
   pluginName: string;
   manifest: PluginManifest;
+  onInstalled?: (installation: PluginInstallation.T) => void;
 }): PluginInstaller {
-  const { pluginName, manifest } = options;
+  const { pluginName, manifest, onInstalled } = options;
   const { t } = useLingui();
   const workspace = useCurrentWorkspace();
   const [installation, setInstallation] = useState<PluginInstallation.T>();
   const [installPlugin, isInstalling] = PluginInstallationClient.useInstall({
     queriesToInvalidate: [PluginInstallationClient.QueryKeys.getAll()],
     onSuccess: (newInstallation) => {
       notifySuccess(t`${pluginName} installed`);
       setInstallation(newInstallation);
+      onInstalled?.(newInstallation);
     },
     onError: (error) => {
       notifyError({
         title: t`Could not install ${pluginName}`,
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent.ts`:

```ts
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import type { PluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/** The install wizard's view of a plugin's bundled content. */
export type InstallWizardContent = Readonly<{
  /** What the workspace already imported, even through an earlier install. */
  importedContent: ImportedPluginContent;

  /** The imports the wizard starts once the plugin is installed. */
  contentImports: PluginContentImports;

  /** Chosen items the workspace does not have yet, in manifest order. */
  itemsToImport: readonly PluginContentItem[];
}>;

/**
 * The content `PluginInstallWizard` offers and imports: what the workspace
 * already has, what the admin chose that it lacks, and the imports' progress.
 */
export function useInstallWizardContent(options: {
  manifestModule: PluginManifestModule;
  chosenContentIds: readonly string[];
}): InstallWizardContent {
  const { manifestModule, chosenContentIds } = options;
  const importedContent = useImportedPluginContent(manifestModule.manifest.id);
  const contentImports = usePluginContentImports(manifestModule);
  return {
    importedContent,
    contentImports,
    itemsToImport: manifestModule.manifest.contributes.content.filter(
      (item) => {
        return (
          chosenContentIds.includes(item.id) &&
          importedContent.importsByContentId[item.id] === undefined
        );
      },
    ),
  };
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ContentStep.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Loader, Stack, Text } from "@mantine/core";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  chosenContentIds: readonly string[];
  onIsChosenChange: (contentId: string, isChosen: boolean) => void;
  importedContent: ImportedPluginContent;
}>;

/**
 * The install wizard's Content step: a checklist of the datasets the plugin
 * bundles, every one checked to start with. An item the workspace already
 * imported says so and cannot be chosen again.
 */
export function ContentStep({
  manifestModule,
  chosenContentIds,
  onIsChosenChange,
  importedContent,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{t`Datasets to import`}</InstallWizardStepHeading>
        <Text size="sm" c="dimmed">
          {t`Each one becomes a dataset in this workspace that every member can use.`}
        </Text>
      </Stack>
      {importedContent.isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : (
        <Stack gap="sm" role="group" aria-label={t`Datasets to import`}>
          {manifestModule.manifest.contributes.content.map((item) => {
            const isImported =
              importedContent.importsByContentId[item.id] !== undefined;
            return (
              <Checkbox
                key={item.id}
                label={localize(item.title)}
                description={
                  isImported
                    ? t`Already in this workspace`
                    : localize(item.description)
                }
                checked={isImported || chosenContentIds.includes(item.id)}
                disabled={isImported}
                onChange={(event) => {
                  onIsChosenChange(item.id, event.currentTarget.checked);
                }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentItemRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { PluginContentImportStatusText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{
  /** The item's title, already localized. */
  title: string;

  /** Undefined until the install starts the item's import. */
  status: PluginContentImportStatus | undefined;
  onRetry: () => void;
}>;

/**
 * One dataset in the Confirm step's list: its title, its import progress,
 * and Retry once it failed. Retry is named after the dataset, so each one is
 * told apart by a screen reader.
 */
export function ConfirmContentItemRow({
  title,
  status,
  onRetry,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{title}</Text>
      <Group gap="xs" wrap="nowrap">
        {status === undefined ? null : (
          <PluginContentImportStatusText status={status} />
        )}
        {status?.kind === "failed" ? (
          <Button
            size="compact-sm"
            variant="default"
            aria-label={t`Retry ${title}`}
            onClick={onRetry}
          >
            {t`Retry`}
          </Button>
        ) : null}
      </Group>
    </Group>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentSummary.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { ConfirmContentItemRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentItemRow";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  content: InstallWizardContent;
}>;

/**
 * The Confirm step's list of the datasets the install imports. Once the
 * imports start, each one shows its progress, and a failed one shows why
 * with a Retry button. Shows nothing for a plugin without content.
 */
export function ConfirmContentSummary({
  manifestModule,
  content,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const { statusesByContentId, importItems } = content.contentImports;
  const allItems = manifestModule.manifest.contributes.content;
  const startedItems = allItems.filter((item) => {
    return statusesByContentId[item.id] !== undefined;
  });
  const items = startedItems.length > 0 ? startedItems : content.itemsToImport;
  if (allItems.length === 0) {
    return null;
  }
  return (
    <PluginDetailsSection title={t`Datasets to import`} headingOrder={4}>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">{t`None`}</Text>
      ) : (
        <Stack gap="xs" aria-live="polite">
          {items.map((item) => {
            return (
              <ConfirmContentItemRow
                key={item.id}
                title={localize(item.title)}
                status={statusesByContentId[item.id]}
                onRetry={() => {
                  void importItems([item]);
                }}
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep.tsx`:

```diff
@@ -1,29 +1,34 @@
 import { useLingui } from "@lingui/react/macro";
 import { Stack, Text } from "@mantine/core";
+import { ConfirmContentSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentSummary";
 import { ConfirmDataSlotsSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmDataSlotsSummary";
 import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
+import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
 import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 
 type Props = Readonly<{
   pluginName: string;
   manifestModule: PluginManifestModule;
   wizard: InstallWizardState;
   installer: PluginInstaller;
+  content: InstallWizardContent;
 }>;
 
 /**
  * The install wizard's last page: what installing does, the records each
- * data slot will read, and, once the footer's Install button has run, a
- * status line saying the plugin is installed.
+ * data slot will read, and the datasets it imports. Once the footer's
+ * Install button has run, a status line says the plugin is installed and
+ * each dataset shows its import progress.
  */
 export function ConfirmStep({
   pluginName,
   manifestModule,
   wizard,
   installer,
+  content,
 }: Props): JSX.Element {
   const { t } = useLingui();
   return (
     <Stack gap="md">
@@ -34,8 +39,12 @@ export function ConfirmStep({
       <ConfirmDataSlotsSummary
         manifestModule={manifestModule}
         draftsBySlotId={wizard.draftsBySlotId}
       />
+      <ConfirmContentSummary
+        manifestModule={manifestModule}
+        content={content}
+      />
       <Text size="sm" role="status">
         {installer.installation === undefined
           ? null
           : t`${pluginName} is installed.`}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter.tsx`:

```diff
@@ -8,16 +8,20 @@ type Props = Readonly<{
   installer: PluginInstaller;
 
   /** False while the current page needs a choice before the next one. */
   canGoNext: boolean;
+
+  /** True while content imports run, which Done waits for. */
+  isImportingContent: boolean;
   onInstall: () => void;
   onClose: () => void;
 }>;
 
 function PrimaryButton({
   wizard,
   installer,
   canGoNext,
+  isImportingContent,
   onInstall,
   onClose,
 }: Props): JSX.Element {
   const { t } = useLingui();
@@ -28,9 +32,13 @@ function PrimaryButton({
       </Button>
     );
   }
   if (installer.installation !== undefined) {
-    return <Button onClick={onClose}>{t`Done`}</Button>;
+    return (
+      <Button disabled={isImportingContent} onClick={onClose}>
+        {t`Done`}
+      </Button>
+    );
   }
   return (
     <Button loading={installer.isInstalling} onClick={onInstall}>
       {t`Install`}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent.tsx`:

```diff
@@ -1,27 +1,26 @@
 import { match } from "ts-pattern";
 import { ConfirmStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmStep";
+import { ContentStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ContentStep";
 import { DataSlotsStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/DataSlotsStep";
 import { ReviewStep } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ReviewStep";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
+import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
 import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 import type { ReactNode } from "react";
 
 type Props = Readonly<{
   pluginName: string;
   manifestModule: PluginManifestModule;
   wizard: InstallWizardState;
   installer: PluginInstaller;
+  content: InstallWizardContent;
 }>;
 
 /** The page `PluginInstallWizard` shows for its current step. */
-export function InstallWizardPageContent({
-  pluginName,
-  manifestModule,
-  wizard,
-  installer,
-}: Props): ReactNode {
+export function InstallWizardPageContent(props: Props): ReactNode {
+  const { pluginName, manifestModule, wizard, content } = props;
   return match(wizard.page)
     .with({ step: "review" }, () => {
       return <ReviewStep manifestModule={manifestModule} />;
     })
@@ -39,18 +38,18 @@ export function InstallWizardPageContent({
         />
       );
     })
     .with({ step: "content" }, () => {
-      return null;
-    })
-    .with({ step: "confirm" }, () => {
       return (
-        <ConfirmStep
-          pluginName={pluginName}
+        <ContentStep
           manifestModule={manifestModule}
-          wizard={wizard}
-          installer={installer}
+          chosenContentIds={wizard.chosenContentIds}
+          onIsChosenChange={wizard.setIsContentChosen}
+          importedContent={content.importedContent}
         />
       );
     })
+    .with({ step: "confirm" }, () => {
+      return <ConfirmStep {...props} />;
+    })
     .exhaustive();
 }
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard.tsx`:

```diff
@@ -3,8 +3,9 @@ import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspaceP
 import { InstallWizardFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardFooter";
 import { InstallWizardPageContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardPageContent";
 import { InstallWizardStepper } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepper";
 import { useInstallPlugin } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
+import { useInstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";
 import { useInstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
 import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";
 
@@ -33,20 +34,28 @@ function useCanGoNext(wizard: InstallWizardState): boolean {
 }
 
 /**
  * The plugin install wizard: Review, then the steps the manifest needs, then
- * Confirm, which installs the plugin. Opened in a modal by
- * `openPluginInstallWizard` from a plugin's settings card.
+ * Confirm, which installs the plugin and then imports the chosen content.
+ * Opened in a modal by `openPluginInstallWizard` from a plugin's settings
+ * card.
  */
 export function PluginInstallWizard({
   pluginName,
   manifestModule,
   onClose,
 }: Props): JSX.Element {
   const wizard = useInstallWizardState(manifestModule.manifest);
+  const content = useInstallWizardContent({
+    manifestModule,
+    chosenContentIds: wizard.chosenContentIds,
+  });
   const installer = useInstallPlugin({
     pluginName,
     manifest: manifestModule.manifest,
+    onInstalled: () => {
+      void content.contentImports.importItems(content.itemsToImport);
+    },
   });
   const canGoNext = useCanGoNext(wizard);
   return (
     <Stack gap="lg">
@@ -56,15 +65,17 @@ export function PluginInstallWizard({
             pluginName={pluginName}
             manifestModule={manifestModule}
             wizard={wizard}
             installer={installer}
+            content={content}
           />
         </Stack>
       </InstallWizardStepper>
       <InstallWizardFooter
         wizard={wizard}
         installer={installer}
         canGoNext={canGoNext}
+        isImportingContent={content.contentImports.isImporting}
         onInstall={() => {
           installer.install(wizard.bindings);
         }}
         onClose={onClose}
```

- [ ] **Step 12: Run the whole tab's tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS (111 tests in 10 files)

- [ ] **Step 13: Write the failing test for the dataset list refresh**

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.test.tsx`:

```diff
@@ -1,5 +1,6 @@
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { beforeEach, describe, expect, it, vi } from "vitest";
+import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
 import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
 import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
 import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
@@ -230,4 +231,18 @@ describe("usePluginContentImports", () => {
       queryKey: PluginContentImportClient.QueryKeys.getAll(),
     });
   });
+
+  it("refreshes the workspace's dataset lists after an item is imported", async () => {
+    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
+    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
+    const { result } = _renderImports();
+
+    await act(async () => {
+      await result.current.importItems([PROVINCES]);
+    });
+
+    expect(invalidateQueries).toHaveBeenCalledWith({
+      queryKey: DatasetClient.QueryKeys.getAll(),
+    });
+  });
 });
```

- [ ] **Step 14: Run it and confirm it fails**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.test.tsx`
Expected: FAIL, 1 failed and 6 passed. `refreshes the workspace's dataset lists after an item is imported` fails with `AssertionError: expected "invalidateQueries" to be called with arguments: [ { queryKey: [ …(2) ] } ]`, the only call having been `{ queryKey: [ "PluginContentImportClient", "getAll" ] }`.

- [ ] **Step 15: Refresh the dataset lists after an import**

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.ts`:

```diff
@@ -2,6 +2,7 @@ import { promiseMapSequential } from "@avandar/utils";
 import { useLingui } from "@lingui/react/macro";
 import { useQueryClient } from "@tanstack/react-query";
 import { useState } from "react";
+import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
 import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
 import { useCurrentUser } from "@/hooks/users/useCurrentUser";
 import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
@@ -75,6 +76,10 @@ function useImportContentItem(
       void queryClient.invalidateQueries({
         queryKey: PluginContentImportClient.QueryKeys.getAll(),
       });
+      // The new dataset joins every dataset list, such as Data Sources.
+      void queryClient.invalidateQueries({
+        queryKey: DatasetClient.QueryKeys.getAll(),
+      });
     } catch (error) {
       setStatuses({
         [item.id]: { kind: "failed", reason: _getReasonFromError(error) },
```

- [ ] **Step 16: Run the tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports.test.tsx`
Expected: PASS (7 tests)

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS (112 tests in 10 files)

- [ ] **Step 17: Type check, format, lint**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit && pnpm exec oxfmt --ignore-path .oxfmtignore src/views/WorkspaceSettingsPage/WorkspacePluginsTab && pnpm exec eslint src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: no errors

- [ ] **Step 18: Commit**

```bash
git add src/views/WorkspaceSettingsPage/WorkspacePluginsTab
git commit -m "feat(plugins): import a plugin's bundled datasets from the install wizard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- happy-dom's `File` has no `text()`, so the test checks the downloaded file's `size` and `name`.
- `startCsvImport` starts the background Parquet transcode without awaiting it, and `startDatasetUpload` waits for it through `ImportJobsManager`. The transcode registers its job after one IndexedDB write, which finishes long before the `insertCsvFileDataset` round trip, so the upload always sees the job.
- A failure after `startCsvImport` deletes the dataset with `DatasetClient.fullDelete` (row and Parquet object) and `LocalDatasetClient.dropLocalDataset` (the browser copy), both best effort through `Promise.allSettled`, then rethrows the original error. `startDatasetUpload` already shows its own "Unable to sync dataset online" notification on failure.
- Asset URLs come from `getPluginIndexEntry(pluginId)?.loadContentUrls?.()`, loaded once per batch. The promise is awaited inside each item's import, so if loading the URLs fails, each item fails with that reason instead of the whole batch throwing.
- The Confirm step freezes its list once imports start: it lists the items that have a session status, because the imported-content query refetches after each import and would otherwise drop finished items from `itemsToImport`.
- The importing user needs the right to create datasets. Without it, the dataset RPC fails, the item shows `Failed: <reason>`, and the install stands.
- User-visible copy added here (Task 21's E2E helper selects on it): Content step heading `Datasets to import` with `Each one becomes a dataset in this workspace that every member can use.`; each checkbox is named by the item's localized title, with its description or `Already in this workspace`; Confirm section `Datasets to import` (or `None`); statuses `Waiting`, `Importing`, `Imported`, `Failed: <reason>`; button `Retry` named `Retry <item title>`; failure reasons `Could not download <file> (HTTP <status>).` and `This plugin no longer includes <file>.`. Done stays disabled while imports run.
- Steps 13 to 16 exist because a content import never refreshed the workspace's dataset lists. The Confirm step loads `DatasetClient.useGetAll(where("workspace_id", "eq", id))` (through `useDataSlotSourceOptions` in `ConfirmDataSlotsSummary.tsx`, which runs before it returns `null` for a plugin without slots), the same query Data Sources lists from, before the import adds anything. `importPluginContentItem` calls `DatasetClient.insertCsvFileDataset` directly, which invalidates nothing, and the list then stays fresh for six minutes in memory and in the persisted cache, so Data Sources would not show the imported datasets even after a reload. `useSaveDataset.ts` invalidates the same key after a normal upload. Task 22's E2E depends on this.

---

### Task 18: Card Records and Datasets sections, and the standalone binding modal

**Goal:** An installed plugin's card manages what it set up. "Records it reads" lists each data slot with its source ("Case type: Measles cases", "Dataset: line_list.csv") and status (Bound, Not bound, or Broken with each reason), with Choose or Change and, for an optional slot, Remove for settings admins. "Datasets it includes" links each imported item to its dataset in Data Sources, with Import for a missing item and Retry for a failed one. `openDataSlotBindingModal` rebinds one slot in a modal, for the card and for a command's `avandar.ui.openDataSlotBinding`. The modal itself checks `settings__can_manage_plugins`: a loader while the user's roles load, the binding form with Cancel and Save for a settings admin, and "Ask a workspace admin to choose which records this plugin reads." with a Close button for anyone else.

**Files:**
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingAdminGate.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingModalContent.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingForm.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows.ts`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRow.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRowActions.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/RemoveDataSlotBindingButton.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/DataSlotProblemList.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentRow.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentDatasetLink.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginInstalledSections.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard.tsx` (renders `PluginInstalledSections`)
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection.test.tsx`, `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection.test.tsx`
- Modify (tests): `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`

**Depends on:** Task 12 (`PluginDataSlotBindingClient.saveBinding` and CRUD), Task 13 (`loadDataSlotSource`, `getDataSlotBindingStatus`, `DataSlotBindingProblem`), Task 16 (`DataSlotPanel`, `useDataSlotDraftStatus`, `useDataSlotAttributeTypeLabels`, `useDataSlotSourceLabels`, `useLocalizePluginText`), Task 17 (`useImportedPluginContent`, `usePluginContentImports`, `PluginContentImportStatusText`). Task 19, which the plan runs after this task, imports `openDataSlotBindingModal` dynamically from the command runtime and leaves the admin check to it.

- [ ] **Step 1: Write the failing tests for the binding modal**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.test.tsx`:

```tsx
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils";
import { openDataSlotBindingModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type SaveOptions = { onSuccess: () => void };

const mocks = vi.hoisted(() => {
  return {
    appRoles: [undefined, true] as readonly [unknown, boolean],
    bindings: [] as unknown[],
    getAllArguments: [] as unknown[],
    saveBinding: vi.fn(),
    saveOptions: undefined as SaveOptions | undefined,
  };
});

// `useHasPermission` reads the roles through this hook too, so the real
// permission check runs on these roles.
vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return mocks.appRoles;
    },
  };
});

vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return {
      PluginDataSlotBindingClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginDataSlotBindingClient", "getAll"];
          },
        },
        useGetAll: (argument: unknown) => {
          mocks.getAllArguments.push(argument);
          return [mocks.bindings, false, {}];
        },
        useSaveBinding: (options: SaveOptions) => {
          mocks.saveOptions = options;
          return [mocks.saveBinding, false, {}];
        },
      },
    };
  },
);
// The panel has its own tests. This stand-in shows the draft it starts from
// and binds its slot in one click.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel",
  () => {
    return {
      DataSlotPanel: (props: {
        draft: PluginDataSlotBinding.Draft | undefined;
        onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
      }) => {
        return (
          <>
            <p>{`Draft source: ${props.draft?.conceptId ?? "none"}`}</p>
            <button
              type="button"
              onClick={() => {
                props.onDraftChange(NEW_DRAFT);
              }}
            >
              Bind Cases
            </button>
          </>
        );
      },
    };
  },
);
// A draft counts as complete as soon as there is one.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus",
  () => {
    return {
      useDataSlotDraftStatus: (options: { draft: unknown }) => {
        return {
          source: undefined,
          isLoadingSource: false,
          status:
            options.draft === undefined
              ? undefined
              : { kind: "bound", fieldsByAttributeKey: {} },
        };
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return { notifySuccess: vi.fn(), notifyError: vi.fn() };
});

const NEW_DRAFT: PluginDataSlotBinding.Draft = {
  slotId: "cases",
  sourceType: "concept",
  conceptId: "concept-new" as PluginDataSlotBinding.Draft["conceptId"],
  datasetId: undefined,
  attributeMap: { onsetDate: "attribute-onset" },
};

const INSTALLATION = {
  id: "installation-id",
  workspaceId: "workspace-id",
  pluginId: "avandar.epidemiology",
} as PluginInstallation.T;

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.epidemiology",
    dataSlots: {
      cases: {
        title: "%slot.cases.title%",
        required: false,
        attributes: {
          onsetDate: { type: "date", title: "%onset%", required: true },
        },
      },
    },
  },
  strings: { en: { "slot.cases.title": "Cases" } },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function _renderModalsHost(): void {
  render(
    <QueryClientProvider client={queryClient}>
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>{null}</ModalsProvider>
    </QueryClientProvider>,
  );
}

function _openCasesModal(slotId = "cases"): Promise<void> {
  let modalClosed: Promise<void> = Promise.resolve();
  act(() => {
    modalClosed = openDataSlotBindingModal({
      pluginName: "Epidemiology",
      manifestModule: MANIFEST_MODULE,
      installation: INSTALLATION,
      slotId,
    });
  });
  return modalClosed;
}

describe("openDataSlotBindingModal", () => {
  beforeEach(() => {
    cleanup();
    mocks.appRoles = [Permissions.RolesMatrix.Builtins.GlobalAdmin, false];
    mocks.bindings = [];
    mocks.getAllArguments = [];
    mocks.saveBinding.mockReset();
    queryClient = new QueryClient();
    _renderModalsHost();
  });

  it("opens a modal titled after the slot", async () => {
    void _openCasesModal();

    expect(
      await screen.findByRole("dialog", { name: "Choose records for Cases" }),
    ).toBeInTheDocument();
  });

  it("starts from the slot's current binding for this install", async () => {
    mocks.bindings = [{ ...NEW_DRAFT, conceptId: "concept-current" }];

    void _openCasesModal();

    expect(
      await screen.findByText("Draft source: concept-current"),
    ).toBeInTheDocument();
    expect(mocks.getAllArguments[0]).toEqual({
      where: {
        installation_id: { eq: "installation-id" },
        slot_id: { eq: "cases" },
      },
    });
  });

  it("keeps Save off until the binding is complete", async () => {
    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the chosen records for the install", async () => {
    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Bind Cases" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(mocks.saveBinding).toHaveBeenCalledWith({
      installationId: "installation-id",
      draft: NEW_DRAFT,
    });
  });

  it("refreshes the bindings once saved, and resolves when the modal closes", async () => {
    mocks.saveBinding.mockImplementation(() => {
      mocks.saveOptions?.onSuccess();
    });
    const modalClosed = _openCasesModal();
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Bind Cases" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await expect(modalClosed).resolves.toBeUndefined();
    expect(mocks.saveOptions).toMatchObject({
      queriesToInvalidate: [["PluginDataSlotBindingClient", "getAll"]],
    });
  });

  it("resolves without saving when Cancel closes the modal", async () => {
    const modalClosed = _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await expect(modalClosed).resolves.toBeUndefined();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.saveBinding).not.toHaveBeenCalled();
  });

  it("shows a loader while the user's roles load", async () => {
    mocks.appRoles = [undefined, true];

    void _openCasesModal();
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("status", { name: "Checking your access" }),
    ).toBeInTheDocument();
  });

  describe("for a member who cannot manage plugins", () => {
    beforeEach(() => {
      mocks.appRoles = [Permissions.RolesMatrix.Builtins.GlobalEditor, false];
    });

    it("tells them to ask a workspace admin", async () => {
      void _openCasesModal();

      expect(
        await screen.findByText(
          "Ask a workspace admin to choose which records this plugin reads.",
        ),
      ).toBeInTheDocument();
    });

    it("shows no binding panel", async () => {
      void _openCasesModal();
      const dialog = await screen.findByRole("dialog");

      expect(
        within(dialog).queryByRole("button", { name: "Bind Cases" }),
      ).not.toBeInTheDocument();
    });

    it("resolves when they click Close", async () => {
      const modalClosed = _openCasesModal();
      const dialog = await screen.findByRole("dialog");

      // The header's X is also named Close, so find the button by its text.
      fireEvent.click(within(dialog).getByText("Close"));

      await expect(modalClosed).resolves.toBeUndefined();
    });
  });

  it("resolves at once, opening nothing, for a slot the manifest does not declare", async () => {
    await expect(_openCasesModal("deaths")).resolves.toBeUndefined();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.test.tsx`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal"`

- [ ] **Step 3: Implement the binding modal**

The modal resolves its promise from Mantine's `onClose`, which runs when the form or the non-admin notice closes it with `modals.close` and when the user dismisses it, so the caller always hears back.

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingForm.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  pluginName: string;
  installation: PluginInstallation.T;
  slotId: string;
  slot: PluginDataSlot;

  /** The slot's title, already localized. */
  slotTitle: string;
  localize: (value: string) => string;

  /** The slot's current binding, which the form starts from. */
  initialDraft: PluginDataSlotBinding.Draft | undefined;
  onClose: () => void;
}>;

/** Saves a slot's binding, then says so and closes the form. */
function useSaveBinding(options: {
  slotTitle: string;
  onClose: () => void;
}): ReturnType<typeof PluginDataSlotBindingClient.useSaveBinding> {
  const { slotTitle, onClose } = options;
  const { t } = useLingui();
  return PluginDataSlotBindingClient.useSaveBinding({
    queriesToInvalidate: [PluginDataSlotBindingClient.QueryKeys.getAll()],
    onSuccess: () => {
      notifySuccess(t`Saved the records for ${slotTitle}`);
      onClose();
    },
    onError: (error) => {
      notifyError({
        title: t`Could not save the records for ${slotTitle}`,
        message: error.message,
      });
    },
  });
}

/**
 * Rebinds one data slot of an installed plugin: the data slot panel, then
 * Cancel and Save. Save stays off until the binding is complete, and saving
 * replaces the slot's binding and closes the form.
 */
export function DataSlotBindingForm(props: Props): JSX.Element {
  const { pluginName, installation, slotId, slot, slotTitle, localize } = props;
  const { onClose } = props;
  const { t } = useLingui();
  const [draft, setDraft] = useState(props.initialDraft);
  const { status } = useDataSlotDraftStatus({ slot, draft });
  const [saveBinding, isSaving] = useSaveBinding({ slotTitle, onClose });
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        {slot.description === undefined ? null : (
          <Text size="sm">{localize(slot.description)}</Text>
        )}
        <Text size="sm" c="dimmed">
          {t`${pluginName} reads these records when someone runs one of its tools.`}
        </Text>
      </Stack>
      <DataSlotPanel
        {...{ slotId, slot, slotTitle, localize, draft }}
        onDraftChange={setDraft}
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onClose}>
          {t`Cancel`}
        </Button>
        <Button
          loading={isSaving}
          disabled={draft === undefined || status?.kind !== "bound"}
          onClick={() => {
            if (draft !== undefined) {
              saveBinding({ installationId: installation.id, draft });
            }
          }}
        >
          {t`Save`}
        </Button>
      </Group>
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingModalContent.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { DataSlotBindingForm } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingForm";
import type { ComponentProps } from "react";

type Props = Readonly<
  Omit<ComponentProps<typeof DataSlotBindingForm>, "initialDraft">
>;

/**
 * What `openDataSlotBindingModal` shows: the slot's current binding loads
 * first, then the form starts from it.
 */
export function DataSlotBindingModalContent(props: Props): JSX.Element {
  const { t } = useLingui();
  const [bindings, isLoading] = PluginDataSlotBindingClient.useGetAll({
    where: {
      installation_id: { eq: props.installation.id },
      slot_id: { eq: props.slotId },
    },
  });
  if (isLoading) {
    return (
      <Loader size="sm" role="status" aria-label={t`Loading the records`} />
    );
  }
  const binding = bindings?.[0];
  return (
    <DataSlotBindingForm
      {...props}
      initialDraft={
        binding === undefined
          ? undefined
          : {
              slotId: binding.slotId,
              sourceType: binding.sourceType,
              conceptId: binding.conceptId,
              datasetId: binding.datasetId,
              attributeMap: binding.attributeMap,
            }
      }
    />
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingAdminGate.tsx`. It reads the roles with `useUserAppRoles` only for its loading flag, and decides with `useHasPermission`, which returns `false` while roles load:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Closes the modal the gate is in. */
  onClose: () => void;

  /** What a settings admin sees. */
  children: ReactNode;
}>;

/**
 * Shows its children only to a settings admin. While the user's roles load
 * it shows a loader, and anyone else is told to ask a workspace admin, with
 * a Close button. The binding modal checks here, not in the command that
 * opens it, because the roles are read through the router, which a modal
 * under the workspace layout always has and a plugin command may not.
 */
export function DataSlotBindingAdminGate({
  onClose,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [, isLoadingRoles] = useUserAppRoles();
  const canManagePlugins = useHasPermission("settings__can_manage_plugins");
  if (isLoadingRoles) {
    return (
      <Loader size="sm" role="status" aria-label={t`Checking your access`} />
    );
  }
  if (canManagePlugins) {
    return <>{children}</>;
  }
  return (
    <Stack gap="lg">
      <Text size="sm">
        {t`Ask a workspace admin to choose which records this plugin reads.`}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t`Close`}
        </Button>
      </Group>
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.tsx`:

```tsx
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { DataSlotBindingAdminGate } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingAdminGate";
import { DataSlotBindingModalContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingModalContent";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Opens a modal that rebinds one data slot of an installed plugin, titled
 * "Choose records for <slot title>", and resolves once it closes, saved or
 * not. Opened by Change on a plugin's card, and by a command's
 * `avandar.ui.openDataSlotBinding`, which anyone can run: a settings admin
 * gets the binding form, and anyone else is told to ask one. A slot the
 * manifest does not declare resolves at once without a modal.
 */
export function openDataSlotBindingModal(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  slotId: string;
}): Promise<void> {
  const { pluginName, manifestModule, installation, slotId } = options;
  const slot = manifestModule.manifest.dataSlots[slotId];
  if (slot === undefined) {
    return Promise.resolve();
  }
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  const slotTitle = localize(slot.title);
  return new Promise((resolve) => {
    const closeModal = (): void => {
      modals.close(modalId);
    };
    const modalId = modals.open({
      title: t`Choose records for ${slotTitle}`,
      size: "xl",
      closeButtonProps: { "aria-label": t`Close` },
      onClose: resolve,
      children: (
        <DataSlotBindingAdminGate onClose={closeModal}>
          <DataSlotBindingModalContent
            {...{ pluginName, installation, slotId, slot, slotTitle, localize }}
            onClose={closeModal}
          />
        </DataSlotBindingAdminGate>
      ),
    });
  });
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal.test.tsx`
Expected: PASS (11 tests)

- [ ] **Step 5: Write the failing tests for the Records section**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection.test.tsx`:

```tsx
import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { cleanup, fireEvent, render, screen, within } from "@/test-utils";
import { PluginDataSlotsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    bindings: [] as unknown[],
    sourcesByConceptId: {} as Record<string, unknown>,
    deleteBinding: vi.fn(),
    openDataSlotBindingModal: vi.fn(),
  };
});

vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return {
      PluginDataSlotBindingClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginDataSlotBindingClient", "getAll"];
          },
        },
        useGetAll: () => {
          return [mocks.bindings, false, {}];
        },
        useDelete: () => {
          return [mocks.deleteBinding, false, {}];
        },
      },
    };
  },
);
vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return {
    loadDataSlotSource: (options: { conceptId: string }) => {
      return Promise.resolve(mocks.sourcesByConceptId[options.conceptId]);
    },
  };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal",
  () => {
    return { openDataSlotBindingModal: mocks.openDataSlotBindingModal };
  },
);

const INSTALLATION = {
  id: "installation-id",
  workspaceId: "workspace-id",
  pluginId: "avandar.epidemiology",
} as PluginInstallation.T;

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.epidemiology",
    dataSlots: {
      cases: {
        title: "%slot.cases.title%",
        required: false,
        attributes: {
          onsetDate: { type: "date", title: "%onset%", required: true },
        },
      },
      deaths: {
        title: "%slot.deaths.title%",
        required: true,
        attributes: {
          deathDate: { type: "date", title: "%death%", required: true },
        },
      },
    },
  },
  strings: {
    en: {
      "slot.cases.title": "Cases",
      "slot.deaths.title": "Deaths",
      onset: "Onset date",
      death: "Date of death",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

const MEASLES_CASES: DataSlotSource = {
  kind: "concept",
  conceptId: "concept-cases" as Concept.Id,
  name: "Measles cases",
  fields: [
    { id: "attr-onset", columnName: "Onset", label: "Onset", dataType: "date" },
  ],
};

let queryClient: QueryClient;

function _makeBinding(slotId: string, fieldId = "attr-onset"): unknown {
  return {
    id: `binding-${slotId}`,
    installationId: INSTALLATION.id,
    slotId,
    sourceType: "concept",
    conceptId: "concept-cases",
    datasetId: undefined,
    attributeMap:
      slotId === "cases" ? { onsetDate: fieldId } : { deathDate: fieldId },
  };
}

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
        {children}
      </ModalsProvider>
    </QueryClientProvider>
  );
}

function _renderSection(canManage = true): void {
  render(
    <PluginDataSlotsSection
      pluginName="Epidemiology"
      manifestModule={MANIFEST_MODULE}
      installation={INSTALLATION}
      canManage={canManage}
    />,
    { wrapper: Wrapper },
  );
}

describe("PluginDataSlotsSection", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.bindings = [_makeBinding("cases")];
    mocks.sourcesByConceptId = { "concept-cases": MEASLES_CASES };
    mocks.deleteBinding.mockReset();
    mocks.openDataSlotBindingModal.mockReset();
  });

  it("shows Bound and the case type a bound slot reads", async () => {
    _renderSection();

    expect(
      await screen.findByText("Case type: Measles cases"),
    ).toBeInTheDocument();
    expect(screen.getByText("Bound")).toBeInTheDocument();
  });

  it("shows Not bound and offers Choose for a slot with no binding", async () => {
    _renderSection();

    expect(await screen.findByText("Not bound")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose the records for Deaths" }),
    ).toHaveTextContent("Choose");
  });

  it("shows Broken and why when a mapped field no longer exists", async () => {
    mocks.bindings = [_makeBinding("cases", "attr-deleted")];

    _renderSection();

    expect(await screen.findByText("Broken")).toBeInTheDocument();
    expect(
      screen.getByText("The field for Onset date no longer exists."),
    ).toBeInTheDocument();
  });

  it("says the source is gone when the bound case type no longer loads", async () => {
    mocks.sourcesByConceptId = {};

    _renderSection();

    expect(
      await screen.findByText(
        "The case type or dataset was deleted, or you cannot read it.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the slot's binding modal from Change", async () => {
    _renderSection();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Change the records for Cases",
      }),
    );

    expect(mocks.openDataSlotBindingModal).toHaveBeenCalledWith({
      pluginName: "Epidemiology",
      manifestModule: MANIFEST_MODULE,
      installation: INSTALLATION,
      slotId: "cases",
    });
  });

  it("removes an optional slot's binding once the admin confirms", async () => {
    _renderSection();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Remove the records for Cases",
      }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Remove the records for Cases?",
    });
    expect(mocks.deleteBinding).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(mocks.deleteBinding).toHaveBeenCalledWith({ id: "binding-cases" });
  });

  it("offers no Remove for a required slot", async () => {
    mocks.bindings = [_makeBinding("cases"), _makeBinding("deaths")];

    _renderSection();

    expect(
      await screen.findByRole("button", {
        name: "Change the records for Deaths",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove the records for Deaths" }),
    ).not.toBeInTheDocument();
  });

  it("offers no buttons to members who cannot manage plugins", async () => {
    _renderSection(false);

    await screen.findByText("Case type: Measles cases");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection"`

- [ ] **Step 7: Implement the Records section**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows.ts`:

```ts
import { useQuery } from "@avandar/query-hooks";
import { where } from "@avandar/utils";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { loadDataSlotSource } from "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/** One data slot of an installed plugin, with its binding and status. */
export type DataSlotStatusRow = Readonly<{
  slotId: string;
  slot: PluginDataSlot;
  binding: PluginDataSlotBinding.T | undefined;

  /** Undefined when unbound, or when the bound source is gone. */
  source: DataSlotSource | undefined;
  status: DataSlotBindingStatus;
}>;

async function _loadRow(
  options: Omit<DataSlotStatusRow, "source" | "status">,
): Promise<DataSlotStatusRow> {
  const { slot, binding } = options;
  const source =
    binding === undefined ? undefined : await loadDataSlotSource(binding);
  return {
    ...options,
    source,
    status: getDataSlotBindingStatus({ slot, binding, source }),
  };
}

/**
 * Loads every data slot of an installed plugin with its binding, the source
 * the binding reads, and its status, in manifest order. Undefined while
 * loading. A plugin's card reads it for its Records section.
 */
export function useDataSlotStatusRows(options: {
  manifest: PluginManifest;
  installation: PluginInstallation.T;
}): readonly DataSlotStatusRow[] | undefined {
  const { manifest, installation } = options;
  const [bindings] = PluginDataSlotBindingClient.useGetAll(
    where("installation_id", "eq", installation.id),
  );
  const [rows] = useQuery({
    queryKey: [
      "pluginDataSlots",
      "statusRows",
      installation.id,
      manifest.dataSlots,
      bindings,
    ],
    enabled: bindings !== undefined,
    // The rows name workspace records, so they are never written to disk.
    meta: { persist: false },
    queryFn: () => {
      return Promise.all(
        Object.entries(manifest.dataSlots).map(([slotId, slot]) => {
          const binding = bindings?.find((candidate) => {
            return candidate.slotId === slotId;
          });
          return _loadRow({ slotId, slot, binding });
        }),
      );
    },
  });
  return rows;
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/DataSlotProblemList.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
import { match } from "ts-pattern";
import { useDataSlotAttributeTypeLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels";
import type { DataSlotBindingProblem } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  localize: (value: string) => string;
  problems: readonly DataSlotBindingProblem[];
}>;

/**
 * Why a data slot's binding is broken, one line per problem, naming the
 * attribute in the plugin's words. Shown under a broken slot on a plugin's
 * card, so an admin knows what to fix before choosing records again.
 */
export function DataSlotProblemList({
  slot,
  localize,
  problems,
}: Props): JSX.Element {
  const { t } = useLingui();
  const typeLabels = useDataSlotAttributeTypeLabels();
  const getProblemText = (problem: DataSlotBindingProblem): string => {
    if (problem.kind === "source_missing") {
      return t`The case type or dataset was deleted, or you cannot read it.`;
    }
    const attribute = slot.attributes[problem.attributeKey];
    const attributeTitle =
      attribute === undefined
        ? problem.attributeKey
        : localize(attribute.title);
    const typeLabel = attribute === undefined ? "" : typeLabels[attribute.type];
    return match(problem.kind)
      .with("field_missing", () => {
        return t`The field for ${attributeTitle} no longer exists.`;
      })
      .with("type_mismatch", () => {
        return t`The field for ${attributeTitle} has the wrong type. It needs: ${typeLabel}.`;
      })
      .with("required_unmapped", () => {
        return t`${attributeTitle} has no field.`;
      })
      .exhaustive();
  };
  return (
    <List size="sm" c="danger">
      {problems.map((problem) => {
        const text = getProblemText(problem);
        return <List.Item key={text}>{text}</List.Item>;
      })}
    </List>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { useDataSlotSourceLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceLabels";
import { DataSlotProblemList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/DataSlotProblemList";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { DataSlotStatusRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";
import type { ReactNode } from "react";

type Props = Readonly<{
  row: DataSlotStatusRow;
  localize: (value: string) => string;

  /** A settings admin's buttons for the slot, or nothing for others. */
  actions: ReactNode;
}>;

/** The color each status takes. Only a broken slot needs attention. */
const COLOR_BY_STATUS: Record<DataSlotBindingStatus["kind"], string> = {
  unbound: "neutral",
  bound: "success",
  broken: "danger",
};

/**
 * One data slot on a plugin's card: its title, whether it is bound, the
 * case type or dataset it reads, and why it is broken when it is.
 */
export function PluginDataSlotRow({
  row,
  localize,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const sourceLabels = useDataSlotSourceLabels();
  const statusLabels: Record<DataSlotBindingStatus["kind"], string> = {
    unbound: t`Not bound`,
    bound: t`Bound`,
    broken: t`Broken`,
  };
  const { source, status } = row;
  return (
    <Stack gap="xxs">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500}>
            {localize(row.slot.title)}
          </Text>
          <Badge color={COLOR_BY_STATUS[status.kind]} variant="light">
            {statusLabels[status.kind]}
          </Badge>
        </Group>
        {actions}
      </Group>
      {source === undefined ? null : (
        <Text size="sm" c="dimmed">
          {sourceLabels[source.kind](source.name)}
        </Text>
      )}
      {status.kind === "broken" ? (
        <DataSlotProblemList
          slot={row.slot}
          localize={localize}
          problems={status.problems}
        />
      ) : null}
    </Stack>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/RemoveDataSlotBindingButton.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";

type Props = Readonly<{
  pluginName: string;

  /** The slot's title, already localized. */
  slotTitle: string;
  binding: PluginDataSlotBinding.T;
}>;

/**
 * Removes an optional data slot's binding after the admin confirms, so the
 * plugin stops reading those records. Named after the slot, so a screen
 * reader tells it apart from other slots' buttons.
 */
export function RemoveDataSlotBindingButton({
  pluginName,
  slotTitle,
  binding,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [deleteBinding] = PluginDataSlotBindingClient.useDelete({
    queriesToInvalidate: [PluginDataSlotBindingClient.QueryKeys.getAll()],
  });
  return (
    <Button
      size="compact-sm"
      variant="subtle"
      color="danger"
      aria-label={t`Remove the records for ${slotTitle}`}
      onClick={() => {
        modals.openConfirmModal({
          title: t`Remove the records for ${slotTitle}?`,
          children: (
            <Text size="sm">
              {t`${pluginName} stops reading them until someone chooses records again.`}
            </Text>
          ),
          labels: { confirm: t`Remove`, cancel: t`Cancel` },
          confirmProps: { color: "danger" },
          onConfirm: () => {
            deleteBinding({ id: binding.id });
          },
        });
      }}
    >
      {t`Remove`}
    </Button>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRowActions.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { openDataSlotBindingModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal";
import { RemoveDataSlotBindingButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/RemoveDataSlotBindingButton";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { DataSlotStatusRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  row: DataSlotStatusRow;

  /** The slot's title, already localized. */
  slotTitle: string;
}>;

/**
 * A settings admin's buttons for one data slot on a plugin's card: Choose or
 * Change, which opens the slot's binding modal, and Remove for an optional
 * slot with a binding. Each is named after the slot, so a screen reader
 * tells the slots' buttons apart.
 */
export function PluginDataSlotRowActions(props: Props): JSX.Element {
  const { pluginName, row, slotTitle } = props;
  const { t } = useLingui();
  const { binding } = row;
  return (
    <Group gap="xs" wrap="nowrap">
      <Button
        size="compact-sm"
        variant="default"
        aria-label={
          binding === undefined
            ? t`Choose the records for ${slotTitle}`
            : t`Change the records for ${slotTitle}`
        }
        onClick={() => {
          void openDataSlotBindingModal({
            pluginName,
            manifestModule: props.manifestModule,
            installation: props.installation,
            slotId: row.slotId,
          });
        }}
      >
        {binding === undefined ? t`Choose` : t`Change`}
      </Button>
      {binding === undefined || row.slot.required ? null : (
        <RemoveDataSlotBindingButton
          pluginName={pluginName}
          slotTitle={slotTitle}
          binding={binding}
        />
      )}
    </Group>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { PluginDataSlotRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRow";
import { PluginDataSlotRowActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRowActions";
import { useDataSlotStatusRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  canManage: boolean;
}>;

/**
 * The "Records it reads" block of an installed plugin's card: one line per
 * data slot with its status and source. Settings admins can choose, change,
 * or remove a slot's records from here.
 */
export function PluginDataSlotsSection({
  pluginName,
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const rows = useDataSlotStatusRows({
    manifest: manifestModule.manifest,
    installation,
  });
  return (
    <PluginDetailsSection title={t`Records it reads`}>
      {rows === undefined ? (
        <Loader size="sm" role="status" aria-label={t`Loading the records`} />
      ) : (
        <Stack gap="sm">
          {rows.map((row) => {
            return (
              <PluginDataSlotRow
                key={row.slotId}
                row={row}
                localize={localize}
                actions={
                  canManage ? (
                    <PluginDataSlotRowActions
                      {...{ pluginName, manifestModule, installation, row }}
                      slotTitle={localize(row.slot.title)}
                    />
                  ) : null
                }
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
```

- [ ] **Step 8: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection`
Expected: PASS (8 tests)

- [ ] **Step 9: Write the failing tests for the Datasets section**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test-utils";
import { PluginContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    imports: [] as unknown[],
    importPluginContentItem: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginContentImportClient", "getAll"];
          },
        },
        useGetAll: () => {
          return [mocks.imports, false, {}];
        },
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: mocks.importPluginContentItem };
  },
);
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: () => {
      return {
        loadContentUrls: () => {
          return Promise.resolve({
            provinces: "/assets/mz-adm1.csv",
            districts: "/assets/mz-adm2.csv",
          });
        },
      };
    },
  };
});
// Renders the link target into `href`, so a test can assert it without a
// router.
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: (props: {
      children: ReactNode;
      to: string;
      params: Record<string, string>;
    }) => {
      const href = Object.entries(props.params).reduce(
        (path, [name, value]) => {
          return path.replace(`$${name}`, value);
        },
        props.to,
      );
      return createElement("a", { href }, props.children);
    },
  };
});

const DISTRICTS = {
  id: "districts",
  kind: "dataset",
  title: "%content.districts.title%",
  description: "%content.districts.description%",
  file: "content/mz-adm2.csv",
};

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.mozambique",
    contributes: {
      content: [
        {
          id: "provinces",
          kind: "dataset",
          title: "%content.provinces.title%",
          description: "%content.provinces.description%",
          file: "content/mz-adm1.csv",
        },
        DISTRICTS,
      ],
    },
  },
  strings: {
    en: {
      "content.provinces.title": "Mozambique provinces",
      "content.districts.title": "Mozambique districts",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderSection(canManage = true): void {
  render(
    <PluginContentSection
      manifestModule={MANIFEST_MODULE}
      canManage={canManage}
    />,
    { wrapper: QueryWrapper },
  );
}

describe("PluginContentSection", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient();
    mocks.imports = [
      { contentId: "provinces", datasetId: "dataset-provinces" },
    ];
    mocks.importPluginContentItem.mockReset();
  });

  it("links an imported dataset to its page in Data Sources", () => {
    _renderSection();

    expect(
      screen.getByRole("link", { name: "Mozambique provinces" }),
    ).toHaveAttribute("href", "/workspace-slug/data-manager/dataset-provinces");
  });

  it("says a dataset the workspace lacks is not imported", () => {
    _renderSection();

    expect(screen.getByText("Not imported")).toBeInTheDocument();
  });

  it("imports a missing dataset with Import, then links to it", async () => {
    mocks.importPluginContentItem.mockResolvedValue("dataset-districts");
    _renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Import Mozambique districts" }),
    );

    expect(
      await screen.findByRole("link", { name: "Mozambique districts" }),
    ).toHaveAttribute("href", "/workspace-slug/data-manager/dataset-districts");
    expect(mocks.importPluginContentItem).toHaveBeenCalledWith(
      expect.objectContaining({ item: DISTRICTS, url: "/assets/mz-adm2.csv" }),
    );
  });

  it("shows why an import failed and offers Retry", async () => {
    mocks.importPluginContentItem.mockRejectedValue(
      new Error("permission denied"),
    );
    _renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Import Mozambique districts" }),
    );

    expect(
      await screen.findByText("Failed: permission denied"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry Mozambique districts" }),
    ).toBeInTheDocument();
  });

  it("offers no Import to members who cannot manage plugins", () => {
    _renderSection(false);

    expect(screen.getByText("Not imported")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection`
Expected: FAIL, `Error: Failed to resolve import "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection"`

- [ ] **Step 11: Implement the Datasets section**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentDatasetLink.tsx`:

```tsx
import { Link } from "@avandar/ui";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = Readonly<{
  /** The item's title, already localized, which names the link. */
  title: string;
  datasetId: Dataset.Id;
}>;

/**
 * An imported content item on a plugin's card, linked to its dataset's page
 * in Data Sources, so an admin can open what the plugin brought in.
 */
export function PluginContentDatasetLink({
  title,
  datasetId,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const { to, params } = AppLinks.dataManagerDatasetView({
    workspaceSlug: workspace.slug,
    datasetId,
    datasetName: title,
  });
  return (
    <Link to={to} params={params} size="sm" w="fit-content">
      {title}
    </Link>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { PluginContentImportStatusText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText";
import { PluginContentDatasetLink } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentDatasetLink";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{
  /** The item's title, already localized. */
  title: string;

  /** The dataset the item was imported as, if the workspace has it. */
  datasetId: Dataset.Id | undefined;

  /** The item's import progress, if it was imported in this session. */
  status: PluginContentImportStatus | undefined;
  canManage: boolean;
  onImport: () => void;
}>;

/**
 * One content item on a plugin's card: its title, linked to its dataset in
 * Data Sources once imported, else its import progress, and Import or Retry
 * for settings admins. The buttons are named after the item.
 */
export function PluginContentRow({
  title,
  datasetId,
  status,
  canManage,
  onImport,
}: Props): JSX.Element {
  const { t } = useLingui();
  const isFailed = status?.kind === "failed";
  const isRunning = status?.kind === "pending" || status?.kind === "importing";
  if (datasetId !== undefined) {
    return <PluginContentDatasetLink title={title} datasetId={datasetId} />;
  }
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{title}</Text>
      <Group gap="xs" wrap="nowrap">
        {status === undefined ? (
          <Text size="sm" c="dimmed">{t`Not imported`}</Text>
        ) : (
          <PluginContentImportStatusText status={status} />
        )}
        {canManage && !isRunning ? (
          <Button
            size="compact-sm"
            variant="default"
            aria-label={isFailed ? t`Retry ${title}` : t`Import ${title}`}
            onClick={onImport}
          >
            {isFailed ? t`Retry` : t`Import`}
          </Button>
        ) : null}
      </Group>
    </Group>
  );
}
```

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import { PluginContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentRow";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  canManage: boolean;
}>;

/**
 * The "Datasets it includes" block of an installed plugin's card: each
 * bundled dataset, linked to the workspace's copy once imported. Settings
 * admins can import a missing one, or retry one that failed.
 */
export function PluginContentSection({
  manifestModule,
  canManage,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const { importsByContentId, isLoading } = useImportedPluginContent(
    manifestModule.manifest.id,
  );
  const { statusesByContentId, importItems } =
    usePluginContentImports(manifestModule);
  return (
    <PluginDetailsSection title={t`Datasets it includes`}>
      {isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : (
        <Stack gap="xs">
          {manifestModule.manifest.contributes.content.map((item) => {
            const status = statusesByContentId[item.id];
            return (
              <PluginContentRow
                key={item.id}
                title={localize(item.title)}
                datasetId={
                  importsByContentId[item.id]?.datasetId ??
                  (status?.kind === "done" ? status.datasetId : undefined)
                }
                status={status}
                canManage={canManage}
                onImport={() => {
                  void importItems([item]);
                }}
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
```

- [ ] **Step 12: Run them and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection`
Expected: PASS (5 tests)

- [ ] **Step 13: Write the failing tests for the sections on the card**

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`:

```diff
@@ -145,8 +145,31 @@ vi.mock(
       },
     };
   },
 );
+vi.mock(
+  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
+  () => {
+    return {
+      PluginDataSlotBindingClient: {
+        QueryKeys: {
+          getAll: () => {
+            return ["PluginDataSlotBindingClient", "getAll"];
+          },
+        },
+        useGetAll: () => {
+          return [[], false, {}];
+        },
+        useDelete: () => {
+          return [vi.fn(), false, {}];
+        },
+      },
+    };
+  },
+);
+vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
+  return { loadDataSlotSource: vi.fn() };
+});
 vi.mock("@/hooks/users/useCurrentUser", () => {
   return {
     useCurrentUser: () => {
       return { id: "user-id" };
@@ -165,8 +188,9 @@ let nextEntryNumber = 0;
 
 function _makeManifestModule(
   pluginId: string,
   icons: Record<string, unknown>,
+  manifestOverrides: Record<string, unknown> = {},
 ): PluginManifestModule {
   return {
     manifest: {
       id: pluginId,
@@ -183,30 +207,38 @@ function _makeManifestModule(
         vizTypes: [],
         aiTools: [],
         content: [],
       },
+      ...manifestOverrides,
     },
     strings: {
       en: {
         name: "Epidemiology",
         description: "Charts disease spread.",
         "run.title": "Linear regression",
+        "slot.cases.title": "Cases",
+        "content.cases.title": "Sample cases",
       },
     },
     icons,
   } as unknown as PluginManifestModule;
 }
 
 function _addBundledPlugin(
-  options: { icons?: Record<string, unknown> } = {},
+  options: {
+    icons?: Record<string, unknown>;
+    manifestOverrides?: Record<string, unknown>;
+  } = {},
 ): void {
   nextEntryNumber += 1;
   // A new id each test, because the plugin module cache lives for the session.
   const id = `${PLUGIN_ID}-${nextEntryNumber}`;
   mocks.entries.push({
     id,
     loadManifest: () => {
-      return Promise.resolve(_makeManifestModule(id, options.icons ?? {}));
+      return Promise.resolve(
+        _makeManifestModule(id, options.icons ?? {}, options.manifestOverrides),
+      );
     },
   });
 }
 
@@ -346,8 +378,70 @@ describe("WorkspacePluginsTab", () => {
       within(wizard).getByRole("heading", { name: "About this plugin" }),
     ).toBeInTheDocument();
   });
 
+  describe("an installed plugin with data slots and content", () => {
+    const MANIFEST_OVERRIDES = {
+      permissions: ["data:slots"],
+      dataSlots: {
+        cases: {
+          title: "%slot.cases.title%",
+          required: false,
+          attributes: {
+            onsetDate: { type: "date", title: "%onset%", required: true },
+          },
+        },
+      },
+      contributes: {
+        commands: [],
+        menus: {},
+        vizTypes: [],
+        aiTools: [],
+        content: [
+          {
+            id: "cases",
+            kind: "dataset",
+            title: "%content.cases.title%",
+            description: "%content.cases.title%",
+            file: "content/cases.csv",
+          },
+        ],
+      },
+    };
+
+    it("lists the records it reads and the datasets it includes once installed", async () => {
+      _addBundledPlugin({ manifestOverrides: MANIFEST_OVERRIDES });
+      _addInstallation({
+        pluginId: (mocks.entries[0] as PluginIndexEntry).id,
+        grantedPermissions: ["data:slots"],
+      });
+
+      _renderTab();
+
+      const card = await screen.findByRole("region", { name: "Epidemiology" });
+      expect(
+        within(card).getByRole("heading", { name: "Records it reads" }),
+      ).toBeInTheDocument();
+      expect(
+        within(card).getByRole("heading", { name: "Datasets it includes" }),
+      ).toBeInTheDocument();
+    });
+
+    it("leaves both out before the plugin is installed", async () => {
+      _addBundledPlugin({ manifestOverrides: MANIFEST_OVERRIDES });
+
+      _renderTab();
+
+      const card = await screen.findByRole("region", { name: "Epidemiology" });
+      expect(
+        within(card).queryByRole("heading", { name: "Records it reads" }),
+      ).not.toBeInTheDocument();
+      expect(
+        within(card).queryByRole("heading", { name: "Datasets it includes" }),
+      ).not.toBeInTheDocument();
+    });
+  });
+
   it("disables the actions for users who cannot manage plugins", async () => {
     mocks.canManage = false;
     _addBundledPlugin();
 
```

- [ ] **Step 14: Run them and confirm they fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`
Expected: FAIL, 1 failed | 22 passed: `lists the records it reads and the datasets it includes once installed` fails with `Unable to find an accessible element with the role "heading" and name "Records it reads"`.

- [ ] **Step 15: Show the sections on an installed plugin's card**

Create `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginInstalledSections.tsx`:

```tsx
import { Stack } from "@mantine/core";
import { PluginContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection";
import { PluginDataSlotsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;

  /** Undefined for a plugin this deployment no longer bundles. */
  manifestModule: PluginManifestModule | undefined;

  /** Undefined for a plugin the workspace has not installed. */
  installation: PluginInstallation.T | undefined;
  canManage: boolean;
}>;

/**
 * The parts of an installed plugin's card that manage what it set up: the
 * records its data slots read and the datasets it bundles. Each shows only
 * when the manifest declares it. Nothing shows before the plugin is
 * installed, or once this deployment no longer bundles it.
 */
export function PluginInstalledSections({
  pluginName,
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element | null {
  if (manifestModule === undefined || installation === undefined) {
    return null;
  }
  const { manifest } = manifestModule;
  const hasDataSlots = Object.keys(manifest.dataSlots).length > 0;
  const hasContent = manifest.contributes.content.length > 0;
  if (!hasDataSlots && !hasContent) {
    return null;
  }
  return (
    <Stack gap="sm" mt="md">
      {hasDataSlots ? (
        <PluginDataSlotsSection
          {...{ pluginName, manifestModule, installation, canManage }}
        />
      ) : null}
      {hasContent ? (
        <PluginContentSection
          manifestModule={manifestModule}
          canManage={canManage}
        />
      ) : null}
    </Stack>
  );
}
```

Apply this change to `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard.tsx`:

```diff
@@ -3,8 +3,9 @@ import { Card, Group, Stack, Text } from "@mantine/core";
 import { useId } from "react";
 import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
 import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions";
 import { PluginCardHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginCardHeading";
+import { PluginInstalledSections } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginInstalledSections";
 import { PluginManifestSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginManifestSummary";
 import { usePluginDisplayText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginDisplayText";
 import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
 import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
@@ -77,7 +78,10 @@ export function PluginSettingsCard({
           canManage={canManage}
           actions={actions}
         />
       </Group>
+      <PluginInstalledSections
+        {...{ pluginName, manifestModule, installation, canManage }}
+      />
     </Card>
   );
 }
```

- [ ] **Step 16: Run the whole tab's tests and confirm they pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS (137 tests in 13 files)

- [ ] **Step 17: Type check, format, lint**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit && pnpm exec oxfmt --ignore-path .oxfmtignore src/views/WorkspaceSettingsPage/WorkspacePluginsTab && pnpm exec eslint src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: no errors

- [ ] **Step 18: Commit**

```bash
git add src/views/WorkspaceSettingsPage/WorkspacePluginsTab
git commit -m "feat(plugins): manage a plugin's records and datasets from its card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The Data Manager dataset route is `AppLinks.dataManagerDatasetView({ workspaceSlug, datasetId, datasetName })` (`/$workspaceSlug/data-manager/$datasetId`). The content test mocks `@avandar/ui`'s `Link` to write the target into `href`, the way `GadgetCard.test.tsx` mocks the router's `Link`.
- `useDataSlotStatusRows` is one React Query over every slot (key: install id, the manifest's slots, the bindings), never persisted, and refetched when the bindings query is invalidated by a save or a remove. A deleted source reads as Broken through `loadDataSlotSource` returning `undefined`.
- The unbound slot's button says `Choose` rather than `Change`; the spec names only Change, which reads oddly for a slot with no records yet.
- `openDataSlotBindingModal` reads the locale from `i18n` in `@lingui/core`, because it runs outside a component (the command runtime calls it). It resolves at once, opening nothing, for a slot id the manifest does not declare; the runtime reports `InvalidSlot` before calling it.
- The admin check lives in the modal (`DataSlotBindingAdminGate`), not in the command runtime, because `useHasPermission` reads the signed-in user through router context. Mantine renders the modal under the workspace layout's `ModalsProvider`, inside the router, but `PluginMenuSlot` (which runs commands) is rendered in tests and places without one. Any user can run a command that calls `openDataSlotBinding`, so the modal must handle a non-admin itself.
- The modal test mocks only `useUserAppRoles`, so the real `useHasPermission` decides from `Permissions.RolesMatrix.Builtins.GlobalAdmin` (settings admin) or `GlobalEditor` (no `settings__can_manage_plugins`). The modal header's X is also named "Close", so the test clicks the non-admin Close button by its text.
- `PluginSettingsCard` was already over 45 lines before this slice; this task adds three lines to it and puts the new logic in `PluginInstalledSections`.
- User-visible copy added here (Task 21's E2E helpers select on it): card section headings `Records it reads` and `Datasets it includes`; slot badges `Bound`, `Not bound`, `Broken`; source lines `Case type: <name>` and `Dataset: <name>`; broken reasons `The case type or dataset was deleted, or you cannot read it.`, `The field for <attribute> no longer exists.`, `The field for <attribute> has the wrong type. It needs: <type>.`, `<attribute> has no field.`; buttons `Choose` (named `Choose the records for <slot>`), `Change` (`Change the records for <slot>`), `Remove` (`Remove the records for <slot>`), whose confirm dialog is `Remove the records for <slot>?` with `Remove` and `Cancel`; content rows link the item title, or show `Not imported` with `Import` (named `Import <item title>`) or `Retry` (`Retry <item title>`); binding modal title `Choose records for <slot title>`, loader `Checking your access` (role `status`), text `<plugin name> reads these records when someone runs one of its tools.`, buttons `Cancel` and `Save`, notifications `Saved the records for <slot title>` and `Could not save the records for <slot title>`; for a non-admin, text `Ask a workspace admin to choose which records this plugin reads.` and a `Close` button (the header X is also named `Close`).

---

### Task 19: Command runtime: `querySlot`, `openDataSlotBinding`, slot handles in `fetchRows`

**Design note:** `makeDataSlotApiForInvocation` takes `{ plugin, pluginName }`, without `workspaceId` or `canManagePlugins`. It reads the workspace from `plugin.installation.workspaceId`, which is already a `Workspace.Id` (an `ActivePlugin` is always an install of the current workspace), so no `string` to `Workspace.Id` cast is needed. Also, `querySlot` rejects with `PermissionDenied` when a binding still names its case type or dataset but `loadDataSlotSource` finds nothing: deleting a source clears the binding's id (`on delete set null`), so a named but unreadable source means the user cannot read it, which the spec says is `PermissionDenied`. The runtime does not check whether the user is a settings admin: `openDataSlotBinding` always opens `openDataSlotBindingModal` (Task 18), and the modal shows the binding form to a settings admin and "Ask a workspace admin to choose which records this plugin reads." with a Close button to anyone else. `usePluginCommandRunner` and `PluginMenuSlot` are not touched.

**Goal:** A plugin command reads the records an admin bound to one of its data slots with `avandar.data.querySlot`, reads the rows through `fetchRows`, and asks for a binding with `avandar.ui.openDataSlotBinding`. An AI tool's API has neither.

**Files:**
- Create: `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.ts`
- Test: `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.test.ts`
- Modify: `src/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation.ts` (`getSlotRows` option) and its test
- Modify: `src/lib/plugins/makePluginApi/makePluginApi.tsx` (`dataSlotApi` option) and its test
- Modify: `src/lib/plugins/runPluginCommand/runPluginCommand.ts` (builds the slot API) and its test
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts` (an AI tool gets no slot API)

**Depends on:** Task 6 (`QuerySlotResult`, the `SlotNotBound`/`SlotBroken`/`InvalidSlot` codes, the optional `querySlot` and `openDataSlotBinding` members), Task 12 (`PluginDataSlotBindingClient`, `PluginDataSlotBinding`), Tasks 13 and 14 (`loadDataSlotSource`, `getDataSlotBindingStatus`, `DataSlotBindingProblem`, `makeDataSlotSqlFromBinding`, `QUERY_SLOT_MAX_ROWS`, `runDataSlotQuery`), Task 18 (`openDataSlotBindingModal`, which the runtime imports dynamically and which decides whether the user may bind; the plan runs Task 18 before this task, and without that file `tsc` fails on the `import()` with TS2307).

- [ ] **Step 1: Write the failing `fetchRows` tests**

In `src/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation.test.ts`, add these two tests directly after the test `"rejects an unregistered handle that is not the invocation handle"` (before `"rejects the invocation handle when its rows were evicted"`):

```ts
  it("reads the rows of a handle the slot rows lookup knows", () => {
    const slotHandle = "slot-handle" as QueryHandle;

    const result = fetchRowsForInvocation({
      invocationHandle: QueryHandleRegistry.getOrCreate(ROWS),
      queryHandle: slotHandle,
      columns: ["x"],
      getSlotRows: (handle) => {
        return handle === slotHandle ? [{ x: 4, y: 8 }] : undefined;
      },
    });

    expect(result.rows).toEqual([{ x: 4 }]);
  });

  it("rejects a handle neither the invocation nor the slot rows lookup knows", () => {
    const code = _getPluginErrorCode(() => {
      return fetchRowsForInvocation({
        invocationHandle: QueryHandleRegistry.getOrCreate(ROWS),
        queryHandle: QueryHandleRegistry.getOrCreate([{ x: 9 }]),
        columns: ["x"],
        getSlotRows: () => {
          return undefined;
        },
      });
    });

    expect(code).toBe("PermissionDenied");
  });
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/fetchRowsForInvocation`
Expected: FAIL, 1 test: `reads the rows of a handle the slot rows lookup knows` with `PluginError: fetchRows only accepts the query handle of the current invocation.` The second new test already passes: it guards the rejection that must survive the change.

- [ ] **Step 3: Accept slot handles in `fetchRowsForInvocation`**

In `src/lib/plugins/fetchRowsForInvocation/fetchRowsForInvocation.ts`, replace the docstring and the start of `fetchRowsForInvocation`, from `/**` down to and including `const rows = QueryHandleRegistry.getRows(queryHandle);`:

```ts
/**
 * Implements `avandar.data.fetchRows` under `data:context`: only the handle
 * of the current invocation, or a handle `querySlot` issued during it, is
 * readable, and only the requested columns are returned, read from each
 * row's own properties. A limit above `MAX_FETCH_ROWS_LIMIT` is clamped to
 * it, and a NaN limit is treated as not provided.
 */
export function fetchRowsForInvocation(options: {
  invocationHandle: QueryHandle;
  queryHandle: QueryHandle;
  columns: readonly string[];
  limit?: number;

  /** Rows of a handle `querySlot` issued in this invocation, else undefined. */
  getSlotRows?: (
    handle: QueryHandle,
  ) => ReadonlyArray<Readonly<Record<string, unknown>>> | undefined;
}): FetchRowsResult {
  const { invocationHandle, queryHandle, columns } = options;
  const isInvocationHandle = queryHandle === invocationHandle;
  const slotRows = isInvocationHandle
    ? undefined
    : options.getSlotRows?.(queryHandle);
  if (!isInvocationHandle && slotRows === undefined) {
    throw new PluginError(
      "PermissionDenied",
      "fetchRows only accepts a query handle of the current invocation.",
    );
  }
  const rows = slotRows ?? QueryHandleRegistry.getRows(queryHandle);
```

The rest of the function (`if (rows === undefined)` throwing `InvalidHandle`, the clamp, and the projection) is unchanged. This module is counted by `pnpm check:plugin-bundle`, so the change is written compactly on purpose; do not split it into a helper.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/fetchRowsForInvocation`
Expected: PASS (17 tests)

- [ ] **Step 5: Write the failing runtime test**

Create `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.test.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { QUERY_SLOT_MAX_ROWS } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotInvocationApi } from "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";
import type { QueryHandle } from "@avandar/plugin-sdk";

const { getBindingsMock, loadSourceMock, openModalMock, runQueryMock } =
  vi.hoisted(() => {
    return {
      getBindingsMock: vi.fn(),
      loadSourceMock: vi.fn(),
      openModalMock: vi.fn(),
      runQueryMock: vi.fn(),
    };
  });

vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return { PluginDataSlotBindingClient: { getAll: getBindingsMock } };
  },
);

vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return { loadDataSlotSource: loadSourceMock };
});

vi.mock("@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery", () => {
  return { runDataSlotQuery: runQueryMock };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal",
  () => {
    return { openDataSlotBindingModal: openModalMock };
  },
);

const { makeDataSlotApiForInvocation } =
  await import("@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const CONCEPT_ID = "concept_cases" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const DATA_SLOTS: PluginManifest["dataSlots"] = { cases: CASES_SLOT };

const INSTALLATION = {
  id: "installation_1",
  workspaceId: WORKSPACE_ID,
} as PluginInstallation.T;

const MANIFEST_MODULE = {
  manifest: { dataSlots: DATA_SLOTS },
} as PluginManifestModule;

const PLUGIN = {
  installation: INSTALLATION,
  manifestModule: MANIFEST_MODULE,
} as ActivePlugin;

const ONSET_FIELD = {
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "timestamp",
} as const;

const DISTRICT_FIELD = {
  id: "attr_district",
  columnName: "District name",
  label: "District name",
  dataType: "varchar",
} as const;

const SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

function _makeBinding(
  overrides: Partial<PluginDataSlotBinding.T> = {},
): PluginDataSlotBinding.T {
  return {
    sourceType: "concept",
    conceptId: CONCEPT_ID,
    datasetId: undefined,
    attributeMap: { onsetDate: ONSET_FIELD.id },
    ...overrides,
  } as PluginDataSlotBinding.T;
}

function _makeRows(rowCount: number): Array<{ onsetDate: string }> {
  return Array.from({ length: rowCount }, () => {
    return { onsetDate: "2026-01-05" };
  });
}

function _makeApi(): DataSlotInvocationApi {
  return makeDataSlotApiForInvocation({
    plugin: PLUGIN,
    pluginName: "Epidemiology",
  });
}

async function _getQuerySlotError(slotId: string): Promise<PluginError> {
  const error = await _makeApi()
    .querySlot(slotId)
    .catch((rejection: unknown) => {
      return rejection;
    });
  expect(error).toBeInstanceOf(PluginError);
  return error as PluginError;
}

describe("makeDataSlotApiForInvocation", () => {
  beforeEach(() => {
    getBindingsMock.mockResolvedValue([_makeBinding()]);
    loadSourceMock.mockResolvedValue(SOURCE);
    runQueryMock.mockResolvedValue({ data: _makeRows(2) });
    openModalMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("querySlot", () => {
    it("rejects a slot id the manifest does not declare with InvalidSlot", async () => {
      const error = await _getQuerySlotError("deaths");

      expect(error.code).toBe("InvalidSlot");
    });

    it("rejects a slot id inherited from Object with InvalidSlot", async () => {
      const error = await _getQuerySlotError("constructor");

      expect(error.code).toBe("InvalidSlot");
    });

    it("reads only this install's binding for the slot", async () => {
      await _makeApi().querySlot("cases");

      expect(getBindingsMock).toHaveBeenCalledWith({
        where: {
          installation_id: { eq: INSTALLATION.id },
          slot_id: { eq: "cases" },
        },
      });
    });

    it("rejects a slot with no binding with SlotNotBound", async () => {
      getBindingsMock.mockResolvedValue([]);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("SlotNotBound");
    });

    it("rejects a binding whose source was deleted with SlotBroken", async () => {
      getBindingsMock.mockResolvedValue([
        _makeBinding({ conceptId: undefined }),
      ]);
      loadSourceMock.mockResolvedValue(undefined);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("SlotBroken");
    });

    it("names the attribute and the reason in a SlotBroken message", async () => {
      getBindingsMock.mockResolvedValue([_makeBinding({ attributeMap: {} })]);

      const error = await _getQuerySlotError("cases");

      expect(error.message).toBe(
        'The "cases" data slot cannot be read: "onsetDate" is required and has no field.',
      );
    });

    it("keeps workspace field names out of a SlotBroken message", async () => {
      getBindingsMock.mockResolvedValue([
        _makeBinding({
          attributeMap: {
            onsetDate: DISTRICT_FIELD.id,
            district: "attr_deleted",
          },
        }),
      ]);

      const error = await _getQuerySlotError("cases");

      expect(error.message).toBe(
        'The "cases" data slot cannot be read: "onsetDate" is bound to a field whose type no longer fits; "district" is bound to a field that no longer exists.',
      );
    });

    it("rejects a bound source the user cannot read with PermissionDenied", async () => {
      loadSourceMock.mockResolvedValue(undefined);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("PermissionDenied");
    });

    it("rejects a query outside the workspace's relations with PermissionDenied", async () => {
      runQueryMock.mockRejectedValue(
        new WorkspaceRelationsDenied({
          workspaceId: WORKSPACE_ID,
          deniedDatasetIds: ["dataset_other" as Dataset.Id],
        }),
      );

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("PermissionDenied");
    });

    it("passes any other query failure through unchanged", async () => {
      const queryError = new Error("DuckDB is not ready");
      runQueryMock.mockRejectedValue(queryError);

      await expect(_makeApi().querySlot("cases")).rejects.toBe(queryError);
    });

    it("queries one row more than it keeps, in the install's workspace", async () => {
      await _makeApi().querySlot("cases");

      expect(runQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          sql: expect.stringContaining(`LIMIT ${QUERY_SLOT_MAX_ROWS + 1}`),
        }),
      );
    });

    it("names each column by its attribute key, typed by its bound field or its attribute", async () => {
      const result = await _makeApi().querySlot("cases");

      expect(result.columns).toEqual([
        { name: "onsetDate", dataType: "timestamp" },
        { name: "district", dataType: "varchar" },
      ]);
    });

    it("counts the rows it read when the slot fits under the limit", async () => {
      const result = await _makeApi().querySlot("cases");

      expect(result).toMatchObject({ rowCount: 2, isTruncated: false });
    });

    it("keeps the first rows up to the limit and reports truncation past it", async () => {
      runQueryMock.mockResolvedValue({
        data: _makeRows(QUERY_SLOT_MAX_ROWS + 1),
      });
      const api = _makeApi();

      const result = await api.querySlot("cases");

      expect(result).toMatchObject({
        rowCount: QUERY_SLOT_MAX_ROWS,
        isTruncated: true,
      });
      expect(api.getSlotRows(result.queryHandle)).toHaveLength(
        QUERY_SLOT_MAX_ROWS,
      );
    });
  });

  describe("getSlotRows", () => {
    it("returns the rows of a handle querySlot issued in the invocation", async () => {
      const api = _makeApi();

      const { queryHandle } = await api.querySlot("cases");

      expect(api.getSlotRows(queryHandle)).toEqual(_makeRows(2));
    });

    it("returns nothing for a handle another invocation's querySlot issued", async () => {
      const { queryHandle } = await _makeApi().querySlot("cases");

      expect(_makeApi().getSlotRows(queryHandle)).toBeUndefined();
    });

    it("returns nothing for a handle querySlot never issued", () => {
      expect(
        _makeApi().getSlotRows("handle-never-issued" as QueryHandle),
      ).toBeUndefined();
    });
  });

  describe("openDataSlotBinding", () => {
    it("opens the slot's binding modal, which decides what the user may do there", async () => {
      await _makeApi().openDataSlotBinding("cases");

      expect(openModalMock).toHaveBeenCalledWith({
        pluginName: "Epidemiology",
        manifestModule: MANIFEST_MODULE,
        installation: INSTALLATION,
        slotId: "cases",
      });
    });

    it("resolves only once the binding modal closes", async () => {
      const modalClosed = Promise.withResolvers<void>();
      openModalMock.mockReturnValue(modalClosed.promise);
      const onResolved = vi.fn();

      const opening = _makeApi().openDataSlotBinding("cases").then(onResolved);
      await vi.waitFor(() => {
        expect(openModalMock).toHaveBeenCalled();
      });
      expect(onResolved).not.toHaveBeenCalled();
      modalClosed.resolve();
      await opening;

      expect(onResolved).toHaveBeenCalledTimes(1);
    });

    it("rejects a slot id the manifest does not declare with InvalidSlot", async () => {
      await expect(
        _makeApi().openDataSlotBinding("deaths"),
      ).rejects.toMatchObject({ code: "InvalidSlot" });
    });

    it("opens no binding modal for a slot id the manifest does not declare", async () => {
      await _makeApi()
        .openDataSlotBinding("deaths")
        .catch(() => {
          return undefined;
        });

      expect(openModalMock).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/dataSlots`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation" ... Does the file exist?`

- [ ] **Step 7: Implement the runtime**

Create `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { isDefined } from "@avandar/utils";
import { match } from "ts-pattern";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { loadDataSlotSource } from "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource";
import {
  makeDataSlotSqlFromBinding,
  QUERY_SLOT_MAX_ROWS,
} from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { runDataSlotQuery } from "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingProblem } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";
import type {
  PluginColumnDataType,
  QueryHandle,
  QuerySlotResult,
} from "@avandar/plugin-sdk";

type SlotRow = Readonly<Record<string, unknown>>;

type FieldsByAttributeKey = Readonly<
  Record<string, DataSlotSourceField | undefined>
>;

/**
 * The data slot part of the `avandar` object one command invocation
 * receives. `runPluginCommand` makes one per invocation and hands it to
 * `makePluginApi`, which exposes `querySlot` and `openDataSlotBinding` to
 * the command and lets `fetchRows` read the handles `querySlot` issued.
 */
export type DataSlotInvocationApi = Readonly<{
  querySlot: (slotId: string) => Promise<QuerySlotResult>;
  openDataSlotBinding: (slotId: string) => Promise<void>;

  /** Rows of a handle querySlot issued in this invocation, else undefined. */
  getSlotRows: (handle: QueryHandle) => readonly SlotRow[] | undefined;
}>;

type InvocationOptions = {
  plugin: ActivePlugin;
  pluginName: string;
};

/**
 * The type of a slot column whose attribute is unmapped, which is the type
 * of the NULL `makeDataSlotSqlFromBinding` selects for it.
 */
const UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE: Readonly<
  Record<DataSlotAttributeType, PluginColumnDataType>
> = {
  number: "double",
  date: "date",
  text: "varchar",
  boolean: "boolean",
  "geo.admin1": "varchar",
  "geo.admin2": "varchar",
};

const PERMISSION_DENIED_MESSAGE =
  "You cannot read the records this data slot is bound to.";

function _getSlotFromPlugin(
  options: Readonly<{ plugin: ActivePlugin; slotId: string }>,
): PluginDataSlot {
  const { dataSlots } = options.plugin.manifestModule.manifest;
  const slot = Object.hasOwn(dataSlots, options.slotId)
    ? dataSlots[options.slotId]
    : undefined;
  if (slot === undefined) {
    throw new PluginError(
      "InvalidSlot",
      `The manifest declares no data slot "${options.slotId}".`,
    );
  }
  return slot;
}

/**
 * Reads the binding's case type or dataset. A binding that still names its
 * source has a source that exists, since deleting a case type or dataset
 * clears the id, so finding nothing there means the user cannot read it.
 */
async function _loadBoundSource(
  binding: Readonly<PluginDataSlotBinding.T> | undefined,
): Promise<DataSlotSource | undefined> {
  if (binding === undefined) {
    return undefined;
  }
  const source = await loadDataSlotSource(binding);
  const sourceId =
    binding.sourceType === "concept" ? binding.conceptId : binding.datasetId;
  if (source === undefined && sourceId !== undefined) {
    throw new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
  }
  return source;
}

// Names the attribute and the reason only. A field name or a value would
// tell the plugin about workspace data it was not given.
function _getTextFromProblem(problem: DataSlotBindingProblem): string {
  return match(problem)
    .with({ kind: "source_missing" }, () => {
      return "its case type or dataset no longer exists";
    })
    .with({ kind: "field_missing" }, ({ attributeKey }) => {
      return `"${attributeKey}" is bound to a field that no longer exists`;
    })
    .with({ kind: "type_mismatch" }, ({ attributeKey }) => {
      return `"${attributeKey}" is bound to a field whose type no longer fits`;
    })
    .with({ kind: "required_unmapped" }, ({ attributeKey }) => {
      return `"${attributeKey}" is required and has no field`;
    })
    .exhaustive();
}

async function _loadBoundFields(
  options: Readonly<{
    plugin: ActivePlugin;
    slotId: string;
    slot: PluginDataSlot;
  }>,
): Promise<{
  source: DataSlotSource;
  fieldsByAttributeKey: FieldsByAttributeKey;
}> {
  const { plugin, slotId, slot } = options;
  const [binding] = await PluginDataSlotBindingClient.getAll({
    where: {
      installation_id: { eq: plugin.installation.id },
      slot_id: { eq: slotId },
    },
  });
  const source = await _loadBoundSource(binding);
  const status = getDataSlotBindingStatus({ slot, binding, source });
  if (status.kind === "broken") {
    const reasons = status.problems.map(_getTextFromProblem).join("; ");
    throw new PluginError(
      "SlotBroken",
      `The "${slotId}" data slot cannot be read: ${reasons}.`,
    );
  }
  // A binding with no source reads as broken, so only an unbound slot
  // reaches here without one.
  if (status.kind === "unbound" || source === undefined) {
    throw new PluginError(
      "SlotNotBound",
      `No records are chosen for the "${slotId}" data slot yet.`,
    );
  }
  return { source, fieldsByAttributeKey: status.fieldsByAttributeKey };
}

async function _runSlotQuery(
  options: Readonly<{
    plugin: ActivePlugin;
    slot: PluginDataSlot;
    source: DataSlotSource;
    fieldsByAttributeKey: FieldsByAttributeKey;
  }>,
): Promise<SlotRow[]> {
  const { plugin, slot, source, fieldsByAttributeKey } = options;
  const boundFields = Object.values(fieldsByAttributeKey).filter(isDefined);
  try {
    const result = await runDataSlotQuery({
      workspaceId: plugin.installation.workspaceId,
      source,
      // With no field bound, the dataset loads every column.
      fields: boundFields.length > 0 ? boundFields : undefined,
      sql: makeDataSlotSqlFromBinding({
        slot,
        source,
        fieldsByAttributeKey,
        limit: QUERY_SLOT_MAX_ROWS + 1,
      }),
    });
    return result.data;
  } catch (error) {
    if (error instanceof WorkspaceRelationsDenied) {
      throw new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
    }
    throw error;
  }
}

function _getColumnsFromSlot(
  options: Readonly<{
    slot: PluginDataSlot;
    fieldsByAttributeKey: FieldsByAttributeKey;
  }>,
): QuerySlotResult["columns"] {
  return Object.entries(options.slot.attributes).map(
    ([attributeKey, attribute]) => {
      return {
        name: attributeKey,
        dataType:
          options.fieldsByAttributeKey[attributeKey]?.dataType ??
          UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE[attribute.type],
      };
    },
  );
}

async function _querySlot(
  options: Readonly<{
    plugin: ActivePlugin;
    slotId: string;
    rowsByHandle: Map<QueryHandle, readonly SlotRow[]>;
  }>,
): Promise<QuerySlotResult> {
  const { plugin, slotId, rowsByHandle } = options;
  const slot = _getSlotFromPlugin({ plugin, slotId });
  const { source, fieldsByAttributeKey } = await _loadBoundFields({
    plugin,
    slotId,
    slot,
  });
  const rows = await _runSlotQuery({
    plugin,
    slot,
    source,
    fieldsByAttributeKey,
  });
  const keptRows = rows.slice(0, QUERY_SLOT_MAX_ROWS);
  const queryHandle = crypto.randomUUID() as QueryHandle;
  rowsByHandle.set(queryHandle, keptRows);
  return {
    queryHandle,
    columns: _getColumnsFromSlot({ slot, fieldsByAttributeKey }),
    rowCount: keptRows.length,
    isTruncated: rows.length > QUERY_SLOT_MAX_ROWS,
  };
}

// The binding modal checks whether the user may bind slots, because it
// renders inside the router where the user's roles are readable. It is
// Settings UI, so it loads only when a command opens it.
async function _openDataSlotBinding(
  options: Readonly<InvocationOptions & { slotId: string }>,
): Promise<void> {
  const { plugin, pluginName, slotId } = options;
  _getSlotFromPlugin({ plugin, slotId });
  const { openDataSlotBindingModal } =
    await import("@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal");
  await openDataSlotBindingModal({
    pluginName,
    manifestModule: plugin.manifestModule,
    installation: plugin.installation,
    slotId,
  });
}

/**
 * Makes the data slot API of one command invocation: `querySlot` reads the
 * records an admin bound to a slot of the plugin, with the current user's
 * access, and `openDataSlotBinding` opens the slot's binding modal, which
 * lets a settings admin choose them and tells anyone else to ask one. The
 * handles `querySlot` issues are readable through `getSlotRows` for this
 * invocation only, and are never registered in the app-wide
 * `QueryHandleRegistry`.
 *
 * `runPluginCommand` calls it once per invocation. It reaches the binding
 * client and the slot query, so import it only from the lazy command
 * runtime.
 */
export function makeDataSlotApiForInvocation(
  options: Readonly<InvocationOptions>,
): DataSlotInvocationApi {
  const rowsByHandle = new Map<QueryHandle, readonly SlotRow[]>();
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    querySlot: async (slotId) => {
      return _querySlot({ plugin: options.plugin, slotId, rowsByHandle });
    },
    openDataSlotBinding: async (slotId) => {
      return _openDataSlotBinding({ ...options, slotId });
    },
    getSlotRows: (handle) => {
      return rowsByHandle.get(handle);
    },
  };
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/dataSlots`
Expected: PASS (21 tests)

- [ ] **Step 9: Write the failing `makePluginApi` tests**

In `src/lib/plugins/makePluginApi/makePluginApi.test.tsx`:

Add the `DataSlotInvocationApi` type import after the `DataExplorerBridge` one, and `QueryHandle` and `QuerySlotResult` to the SDK type import:

```ts
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { DataSlotInvocationApi } from "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation";
import type {
  AvandarApi,
  DataExplorerToolbarContext,
  QueryHandle,
  QuerySlotResult,
} from "@avandar/plugin-sdk";
```

Replace `_makeApiFromRows` so it takes an options object, and add `_makeDataSlotApi` after it:

```tsx
function _makeApiFromRows(
  options: {
    dataExplorerBridge?: DataExplorerBridge;
    dataSlotApi?: DataSlotInvocationApi;
  } = {},
): AvandarApi {
  const context: DataExplorerToolbarContext = {
    slotId: "dataExplorer.toolbar",
    queryHandle: QueryHandleRegistry.getOrCreate(ROWS),
    columns: [
      { name: "x", dataType: "bigint" },
      { name: "y", dataType: "varchar" },
    ],
    rowCount: ROWS.length,
  };
  return makePluginApi({
    pluginName: "Test plugin",
    context,
    workspace: { id: "w", slug: "w", locale: "es" },
    messages: { en: { greeting: "Hello" }, es: { greeting: "Hola" } },
    dataExplorerBridge: options.dataExplorerBridge,
    dataSlotApi: options.dataSlotApi,
  });
}

function _makeDataSlotApi(
  overrides: Partial<DataSlotInvocationApi> = {},
): DataSlotInvocationApi {
  return {
    querySlot: vi.fn(),
    openDataSlotBinding: vi.fn(),
    getSlotRows: () => {
      return undefined;
    },
    ...overrides,
  };
}
```

Update the three callers that passed a bridge positionally:

```tsx
    const api = _makeApiFromRows({ dataExplorerBridge: bridge });
```

(in `"adds columns through the Data Explorer bridge"`),

```tsx
    const api = _makeApiFromRows({ dataExplorerBridge: _makeBridge() });
```

(in `"rejects addColumns with InvalidExpression for an invalid column"`), and

```tsx
    const staleApi = _makeApiFromRows({ dataExplorerBridge: bridge });
```

(in `"rejects addColumns with InvalidHandle for an api made before the host unmounted"`).

Add these tests directly before `it("translates plugin messages in the workspace locale", ...)`:

```tsx
  it("reads the rows of a handle the data slot API issued", async () => {
    const slotHandle = "slot-handle" as QueryHandle;
    const api = _makeApiFromRows({
      dataSlotApi: _makeDataSlotApi({
        getSlotRows: (handle) => {
          return handle === slotHandle
            ? [{ onsetDate: "2026-01-05", district: "Ilala" }]
            : undefined;
        },
      }),
    });

    const result = await api.data.fetchRows(slotHandle, {
      columns: ["onsetDate"],
    });

    expect(result.rows).toEqual([{ onsetDate: "2026-01-05" }]);
  });

  it("queries a data slot through the data slot API", async () => {
    const slotResult: QuerySlotResult = {
      queryHandle: "slot-handle" as QueryHandle,
      columns: [{ name: "onsetDate", dataType: "date" }],
      rowCount: 1,
      isTruncated: false,
    };
    const api = _makeApiFromRows({
      dataSlotApi: _makeDataSlotApi({
        querySlot: vi.fn().mockResolvedValue(slotResult),
      }),
    });

    await expect(api.data.querySlot?.("cases")).resolves.toBe(slotResult);
  });

  it("opens a data slot's binding through the data slot API", async () => {
    const openDataSlotBinding = vi.fn().mockResolvedValue(undefined);
    const api = _makeApiFromRows({
      dataSlotApi: _makeDataSlotApi({ openDataSlotBinding }),
    });

    await api.ui.openDataSlotBinding?.("cases");

    expect(openDataSlotBinding).toHaveBeenCalledWith("cases");
  });

  it("gives no data slot API to an api made without one", () => {
    const api = _makeApiFromRows();

    expect(api.data.querySlot).toBeUndefined();
    expect(api.ui.openDataSlotBinding).toBeUndefined();
  });

```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run src/lib/plugins/makePluginApi`
Expected: FAIL, 3 tests: `reads the rows of a handle the data slot API issued` (`PluginError: fetchRows only accepts a query handle of the current invocation.`), `queries a data slot through the data slot API` (`You must provide a Promise to expect() when using .resolves, not 'undefined'`), `opens a data slot's binding through the data slot API` (`expected "spy" to be called with arguments: [ 'cases' ]`). `gives no data slot API to an api made without one` passes already.

- [ ] **Step 11: Add the `dataSlotApi` option to `makePluginApi`**

`makePluginApi` is also reached from the chat, so its bytes count toward `pnpm check:plugin-bundle`. It only forwards members of the slot API, which lives in the lazy command runtime.

In `src/lib/plugins/makePluginApi/makePluginApi.tsx`, add the type import after the `DataExplorerBridge` one:

```ts
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type { DataSlotInvocationApi } from "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation";
```

Replace `_makeDataApi`:

```ts
function _makeDataApi(
  options: Readonly<{
    context: PluginInvocationContext;
    dataSlotApi: DataSlotInvocationApi | undefined;
  }>,
): AvandarApi["data"] {
  const { context, dataSlotApi } = options;
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    fetchRows: async (queryHandle, fetchOptions) => {
      return fetchRowsForInvocation({
        invocationHandle: context.queryHandle,
        queryHandle,
        columns: fetchOptions.columns,
        limit: fetchOptions.limit,
        getSlotRows: dataSlotApi?.getSlotRows,
      });
    },
    querySlot: dataSlotApi?.querySlot,
  };
}
```

In the `makePluginApi` docstring, replace the line

```ts
 * `PluginError("InvalidHandle")` once the drawer host has unmounted.
```

with

```ts
 * `PluginError("InvalidHandle")` once the drawer host has unmounted. Its
 * `data.querySlot` and `ui.openDataSlotBinding` are set only when a
 * `dataSlotApi` is given, as `runPluginCommand` does, so an AI tool or chart
 * never gets them.
```

Add the option and read it:

```ts
    messages: PluginMessages;
    dataExplorerBridge?: DataExplorerBridge;
    dataSlotApi?: DataSlotInvocationApi;
  }>,
): AvandarApi {
  const {
    pluginName,
    context,
    workspace,
    messages,
    dataExplorerBridge,
    dataSlotApi,
  } = options;
```

and in the `api` object replace

```ts
    data: _makeDataApi(context),
    ui: _makeUiApi({ pluginName, wrapContent, isFromCurrentHost }),
```

with

```ts
    data: _makeDataApi({ context, dataSlotApi }),
    ui: {
      ..._makeUiApi({ pluginName, wrapContent, isFromCurrentHost }),
      openDataSlotBinding: dataSlotApi?.openDataSlotBinding,
    },
```

- [ ] **Step 12: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/makePluginApi`
Expected: PASS (24 tests)

- [ ] **Step 13: Write the failing `runPluginCommand` tests**

In `src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`, replace the imports and the `PLUGIN` constant (everything above `const CONTEXT`):

```ts
import { definePlugin } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { runPluginCommand } from "@/lib/plugins/runPluginCommand/runPluginCommand";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type {
  PluginCodeModule,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginCommandFailure } from "@/lib/plugins/runPluginCommand/runPluginCommand";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";
import type {
  CommandHandler,
  DataExplorerToolbarContext,
  QueryHandle,
} from "@avandar/plugin-sdk";

const { openBindingModalMock } = vi.hoisted(() => {
  return { openBindingModalMock: vi.fn() };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal",
  () => {
    return { openDataSlotBindingModal: openBindingModalMock };
  },
);

const DATA_SLOTS: PluginManifest["dataSlots"] = {
  cases: {
    title: "%slot.cases.title%",
    required: false,
    attributes: {
      onsetDate: {
        type: "date",
        title: "%slot.cases.onsetDate%",
        required: true,
      },
    },
  },
};

const PLUGIN = {
  entry: { id: "avandar.test" },
  installation: { id: "installation_1" } as PluginInstallation.T,
  manifestModule: {
    manifest: { dataSlots: DATA_SLOTS },
  } as PluginManifestModule,
} as ActivePlugin;
```

Add these tests directly before `it("reports no failure when the handler completes", ...)`:

```ts
  it("gives the handler a querySlot that rejects a slot the manifest does not declare", async () => {
    let querySlotError: unknown;
    await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({
          hello: async (avandar) => {
            querySlotError = await avandar.data
              .querySlot?.("deaths")
              .catch((error: unknown) => {
                return error;
              });
          },
        });
      },
    });

    expect(querySlotError).toMatchObject({ code: "InvalidSlot" });
  });

  it("opens the slot's binding modal from openDataSlotBinding", async () => {
    openBindingModalMock.mockResolvedValue(undefined);
    await _runCommandFromLoader({
      loadCode: async () => {
        return _makeCodeModuleFromCommands({
          hello: async (avandar) => {
            await avandar.ui.openDataSlotBinding?.("cases");
          },
        });
      },
    });

    expect(openBindingModalMock).toHaveBeenCalledWith(
      expect.objectContaining({ pluginName: "Test", slotId: "cases" }),
    );
  });

```

- [ ] **Step 14: Run them and confirm they fail**

Run: `pnpm vitest run src/lib/plugins/runPluginCommand`
Expected: FAIL, 2 tests: `expected undefined to match object { code: 'InvalidSlot' }` and `expected "spy" to be called with arguments: [ ObjectContaining{…} ]`.

- [ ] **Step 15: Build the slot API in `runPluginCommand`**

In `src/lib/plugins/runPluginCommand/runPluginCommand.ts`, import the factory:

```ts
import { isPluginDefinition } from "@avandar/plugin-sdk";
import { makeDataSlotApiForInvocation } from "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
```

and pass a slot API made for this invocation to `makePluginApi`:

```ts
    const api = makePluginApi({
      pluginName,
      context,
      workspace,
      messages: codeModule.messages,
      dataExplorerBridge: options.dataExplorerBridge,
      dataSlotApi: makeDataSlotApiForInvocation({ plugin, pluginName }),
    });
```

- [ ] **Step 16: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/runPluginCommand`
Expected: PASS (14 tests)

- [ ] **Step 17: Guard that an AI tool gets no slot API**

In `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts`, add this test directly before `it("fails a tool whose bundled plugin has no handler for it", ...)`:

```ts
  it("gives a plugin tool no way to read or bind a data slot", async () => {
    const fitRegression = vi.fn().mockResolvedValue({ slope: 2 });
    bundledPluginMocks.definition = definePlugin({
      aiTools: { fitRegression },
    });
    getAllDatasetsMock.mockResolvedValue([DATASET_A]);
    await runDataAgentTurn(_turn("workspace-tool-no-slots", "Fit a line."));
    const request = await _runPluginAiToolFromAgent();

    await request.invoke(PLUGIN_TOOL_CONTEXT, { xColumn: "x", yColumn: "y" });

    const [pluginApi] = fitRegression.mock.calls[0]!;
    expect(pluginApi.data.querySlot).toBeUndefined();
    expect(pluginApi.ui.openDataSlotBinding).toBeUndefined();
  });

```

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn`
Expected: PASS (24 tests). This test passes on arrival, because `_invokePluginAiTool` in `runDataAgentTurn.ts` calls `makePluginApi` without `dataSlotApi`. It is the guard for spec rule "An AI tool handler's `avandar.data` has no `querySlot` in this slice": giving `makePluginApi` a default `querySlot` makes it fail.

- [ ] **Step 18: Run every touched suite, type check, format, lint**

Run:
```bash
pnpm vitest run src/lib/plugins/dataSlots src/lib/plugins/fetchRowsForInvocation src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/plugins/dataSlots src/lib/plugins/fetchRowsForInvocation src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts
pnpm exec eslint src/lib/plugins/dataSlots src/lib/plugins/fetchRowsForInvocation src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts
```
Expected: PASS (100 tests in 5 files); no type errors; no lint errors.

- [ ] **Step 19: Commit**

```bash
git add src/lib/plugins/dataSlots src/lib/plugins/fetchRowsForInvocation src/lib/plugins/makePluginApi src/lib/plugins/runPluginCommand src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.test.ts
git commit -m "feat(plugins): read bound data slots from plugin commands" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `querySlot` handles live in a `Map` made per invocation, never in `QueryHandleRegistry`: the registry keeps only 3 live handles, and a slot handle must not be readable by another invocation. The rows stay in memory as long as something holds the invocation's `avandar` object, such as an open modal.
- The `SlotBroken` message names attribute keys and reasons only. Never add the source's name, a field's label or column name, or a value: the plugin is meant to see only its own attribute keys.
- `PermissionDenied` comes from two places: a binding that names a source the user cannot read (`loadDataSlotSource` returns nothing for a non-null id), and `WorkspaceRelationsDenied` from the query session. Any other query error passes through unchanged.
- An unmapped optional attribute's column is typed as the NULL `makeDataSlotSqlFromBinding` casts it to (`number` → `double`, `date` → `date`, `boolean` → `boolean`, the rest → `varchar`). Keep `UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE` in step with `NULL_SQL_TYPE_BY_ATTRIBUTE_TYPE` there.
- Do not read the user's permissions in `usePluginCommandRunner` or anywhere on the command path. `useHasPermission` reads the signed-in user through router context, which `PluginMenuSlot` does not always have: calling it there throws `Cannot read properties of null (reading 'stores')` in 9 Data Explorer tests (`DataExplorerApp.test.tsx`, `explorerCategorySplitChart.integration.test.tsx`, `explorerUrlChartRestore.integration.test.tsx`). The binding modal checks instead, because Mantine renders it under the workspace layout's `ModalsProvider`, inside the router.
- Bundle: `makePluginApi` and `fetchRowsForInvocation` are reached from the chat, so `pnpm check:plugin-bundle` counts them. Measured: 59,967 host bytes without this task's changes to those two files and 60,411 with them (+444). The check already fails before this task; Task 24 owns it. Registering the chat's plugin runtime as lazy there should drop these bytes from the count.
- `makeDataSlotApiForInvocation` lives in `src/lib/plugins/dataSlots/` and is imported only by `runPluginCommand.ts`, the lazy command runtime, so its bytes (and the binding client and slot query it reaches) are not counted. `makePluginApi` imports only its type.

---

### Task 20: Epidemiology: the `cases` data slot and the Case epicurve command

**Goal:** The epidemiology plugin declares a `cases` data slot (onset date, optional district) and a "Case epicurve" toolbar command that reads every bound case with `querySlot` and `fetchRows`, and draws them as an epidemic curve by day, epi week, or month, optionally stacked by district.

**Files:**
- Modify: `plugins/epidemiology/ava.yaml` (`data:slots`, `dataSlots.cases`, command `cases.epicurve`, its toolbar entry)
- Modify: `plugins/epidemiology/locales/en.json` (slot and command strings)
- Modify: `plugins/epidemiology/src/index.tsx` (the `cases.epicurve` handler)
- Modify: `plugins/epidemiology/src/index.test.tsx` (lists the new command)
- Create: `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.tsx`, `CaseEpicurveModal.types.ts`, `useCaseSlotRows.ts`, `ChooseRecordsAlert.tsx`, `CaseEpicurveView.tsx`, `CaseEpicurveControls.tsx`, `CaseEpicurveChart.tsx`, `CaseEpicurveTooltip.tsx`
- Test: `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.test.tsx`
- Modify (generated): `shared/agent/dataAgent/pluginAiTools.gen.ts` (the `fitRegression` declaration now lists `data:slots`)

**Depends on:** Task 2 (`dataSlots` and the `data:slots` permission in the manifest schema), Task 6 (`querySlot`, `openDataSlotBinding`, `QuerySlotResult`, the `SlotNotBound`/`SlotBroken` codes, `Bar` from `@avandar/plugin-ui/charts`, `Switch` from `@avandar/plugin-ui`). Task 19 makes the command work in the app; this task's tests use a fake `avandar` object and do not need it.

- [ ] **Step 1: List the new command in the plugin test**

In `plugins/epidemiology/src/index.test.tsx`, import `PluginError`:

```tsx
import { AvandarProvider, PluginError } from "@avandar/plugin-sdk";
```

In `_makeApi`, give `data` a `querySlot` and `ui` an `openDataSlotBinding`:

```tsx
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows: [], isTruncated: false });
      }),
      querySlot: vi.fn(() => {
        return Promise.reject(
          new PluginError("SlotNotBound", "No records are chosen yet."),
        );
      }),
    },
    ui: {
      openModal,
      openDrawer: vi.fn(),
      notify: vi.fn(),
      closeModal: vi.fn(),
      openDataSlotBinding: vi.fn(() => {
        return Promise.resolve();
      }),
    },
```

Add the command to the `it.each` table and make the test wait for its button, since the Case epicurve modal shows its button only after the slot is read:

```tsx
    ["rolling.average", "rollingAverage.title", "rollingAverage.add"],
    ["cases.epicurve", "cases.epicurve.title", "caseEpicurve.chooseRecords"],
  ])(
    "opens the %s modal under its translated title",
    async (commandId, titleKey, buttonKey) => {
```

```tsx
      expect(
        await screen.findByRole("button", { name: `translated:${buttonKey}` }),
      ).toBeInTheDocument();
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx`
Expected: FAIL, 1 test: `opens the cases.epicurve modal under its translated title` with `expected "spy" to be called 1 times, but got 0 times`.

- [ ] **Step 3: Write the failing modal test**

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.test.tsx`:

```tsx
import {
  AvandarProvider,
  makePluginTranslator,
  PluginError,
} from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import englishMessages from "../../../locales/en.json";
import { CaseEpicurveModal } from "./CaseEpicurveModal";
import type {
  AvandarApi,
  FetchRowsResult,
  QueryHandle,
  QuerySlotResult,
} from "@avandar/plugin-sdk";

const SLOT_HANDLE = "slot-handle-1" as QueryHandle;

const CASE_ROWS: FetchRowsResult["rows"] = [
  { onsetDate: "2026-01-05", district: "Ilala" },
  { onsetDate: "2026-01-07", district: "Kinondoni" },
  { onsetDate: "2026-01-07", district: "Ilala" },
];

function _makeSlotResult(
  overrides: Partial<QuerySlotResult> = {},
): QuerySlotResult {
  return {
    queryHandle: SLOT_HANDLE,
    columns: [
      { name: "onsetDate", dataType: "date" },
      { name: "district", dataType: "varchar" },
    ],
    rowCount: CASE_ROWS.length,
    isTruncated: false,
    ...overrides,
  };
}

function _renderModal(
  options: {
    querySlot?: AvandarApi["data"]["querySlot"] | null;
    rows?: FetchRowsResult["rows"];
    openDataSlotBinding?: AvandarApi["ui"]["openDataSlotBinding"] | null;
  } = {},
): { api: AvandarApi } {
  const rows = options.rows ?? CASE_ROWS;
  const api: AvandarApi = {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: [],
      rowCount: 0,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows, isTruncated: false });
      }),
      querySlot:
        options.querySlot === null
          ? undefined
          : (options.querySlot ??
            vi.fn(() => {
              return Promise.resolve(_makeSlotResult());
            })),
    },
    ui: {
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
      openDataSlotBinding:
        options.openDataSlotBinding === null
          ? undefined
          : (options.openDataSlotBinding ??
            vi.fn(() => {
              return Promise.resolve();
            })),
    },
    i18n: {
      t: makePluginTranslator({
        locale: "en-US",
        messages: { en: englishMessages },
      }),
    },
  };
  render(
    <MantineProvider>
      <AvandarProvider api={api}>
        <CaseEpicurveModal />
      </AvandarProvider>
    </MantineProvider>,
  );
  return { api };
}

function _rejectWith(
  code: "SlotNotBound" | "SlotBroken" | "PermissionDenied",
): AvandarApi["data"]["querySlot"] {
  return vi.fn(() => {
    return Promise.reject(new PluginError(code, `The slot failed: ${code}.`));
  });
}

function _getTickTexts(): string[] {
  return Array.from(
    document.querySelectorAll(
      ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
    ),
  ).map((tick) => {
    return tick.textContent ?? "";
  });
}

function _getLegendTexts(): string[] {
  return Array.from(
    document.querySelectorAll(".recharts-legend-item-text"),
  ).map((item) => {
    return item.textContent ?? "";
  });
}

describe("CaseEpicurveModal", () => {
  it("says it is reading the case records until they arrive", () => {
    _renderModal({
      querySlot: () => {
        return new Promise(() => {});
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Reading the case records…",
    );
  });

  it("draws the epicurve of the bound cases", async () => {
    _renderModal();

    expect(
      await screen.findByRole("img", { name: "Case epicurve" }),
    ).toBeInTheDocument();
  });

  it("reads the onset date and district of every case the slot holds", async () => {
    const { api } = _renderModal();

    await screen.findByRole("img", { name: "Case epicurve" });

    expect(api.data.querySlot).toHaveBeenCalledWith("cases");
    expect(api.data.fetchRows).toHaveBeenCalledWith(SLOT_HANDLE, {
      columns: ["onsetDate", "district"],
      limit: CASE_ROWS.length,
    });
  });

  it("buckets the cases by epi week until another interval is picked", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    expect(_getTickTexts()).toEqual(["2026-01-04"]);
  });

  it("buckets the cases by day when Day is picked", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    fireEvent.click(screen.getByRole("radio", { name: "Day" }));

    await waitFor(() => {
      expect(_getTickTexts()).toEqual([
        "2026-01-05",
        "2026-01-06",
        "2026-01-07",
      ]);
    });
  });

  it("stacks the bars by district when Stack by district is on", async () => {
    _renderModal();
    await screen.findByRole("img", { name: "Case epicurve" });

    fireEvent.click(screen.getByRole("switch", { name: "Stack by district" }));

    await waitFor(() => {
      expect(_getLegendTexts()).toEqual(["Ilala", "Kinondoni"]);
    });
  });

  it("disables Stack by district with a reason when no case has a district", async () => {
    _renderModal({
      rows: [
        { onsetDate: "2026-01-05", district: null },
        { onsetDate: "2026-01-07", district: null },
      ],
    });
    await screen.findByRole("img", { name: "Case epicurve" });

    const stackSwitch = screen.getByRole("switch", {
      name: "Stack by district",
    });

    expect(stackSwitch).toBeDisabled();
    expect(stackSwitch).toHaveAccessibleDescription(
      "None of these cases has a district.",
    );
  });

  it("says there is nothing to chart when no case has an onset date", async () => {
    _renderModal({
      rows: [{ onsetDate: null, district: "Ilala" }],
    });

    expect(
      await screen.findByText(
        "None of these cases has an onset date to chart.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Case epicurve" })).toBeNull();
  });

  it("notes that only the first cases were drawn when the slot holds more", async () => {
    _renderModal({
      querySlot: () => {
        return Promise.resolve(_makeSlotResult({ isTruncated: true }));
      },
    });

    expect(
      await screen.findByText("Drawn from the first 3 cases."),
    ).toBeInTheDocument();
  });

  it("asks to choose the case records when none are chosen", async () => {
    _renderModal({ querySlot: _rejectWith("SlotNotBound") });

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "No case records are chosen for this plugin yet.",
    );
    expect(
      within(alert).getByRole("button", { name: "Choose records" }),
    ).toBeInTheDocument();
  });

  it("asks to choose the case records again when the chosen ones no longer fit", async () => {
    _renderModal({ querySlot: _rejectWith("SlotBroken") });

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(
      "The case records chosen for this plugin have changed",
    );
    expect(
      within(alert).getByRole("button", { name: "Choose records" }),
    ).toBeInTheDocument();
  });

  it("opens the cases binding and reads the cases again once it closes", async () => {
    const querySlot = vi
      .fn<NonNullable<AvandarApi["data"]["querySlot"]>>()
      .mockRejectedValueOnce(new PluginError("SlotNotBound", "Not bound."))
      .mockResolvedValue(_makeSlotResult());
    const openDataSlotBinding = vi.fn(() => {
      return Promise.resolve();
    });
    _renderModal({ querySlot, openDataSlotBinding });

    fireEvent.click(
      await screen.findByRole("button", { name: "Choose records" }),
    );

    expect(
      await screen.findByRole("img", { name: "Case epicurve" }),
    ).toBeInTheDocument();
    expect(openDataSlotBinding).toHaveBeenCalledWith("cases");
  });

  it("offers no Choose records button when the host cannot open the binding", async () => {
    _renderModal({
      querySlot: _rejectWith("SlotNotBound"),
      openDataSlotBinding: null,
    });

    await screen.findByRole("alert");

    expect(screen.queryByRole("button", { name: "Choose records" })).toBeNull();
  });

  it("shows the reason when the case records cannot be read", async () => {
    _renderModal({ querySlot: _rejectWith("PermissionDenied") });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not read the case records: The slot failed: PermissionDenied.",
    );
  });

  it("explains that case records cannot be read when the host offers no querySlot", async () => {
    _renderModal({ querySlot: null });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This version of Avandar cannot read case records for plugins.",
    );
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/caseEpicurve`
Expected: FAIL, `Failed to resolve import "./CaseEpicurveModal" from "plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.test.tsx". Does the file exist?`

- [ ] **Step 5: Declare the slot and the command**

In `plugins/epidemiology/ava.yaml`, add `data:slots` and the `dataSlots` block (top level, between `permissions` and `contributes`):

```yaml
permissions:
  - data:context
  - query:addColumns
  - data:slots
dataSlots:
  cases:
    title: "%slot.cases.title%"
    description: "%slot.cases.description%"
    concept: Case
    required: false
    attributes:
      onsetDate:
        type: date
        title: "%slot.cases.onsetDate%"
      district:
        type: geo.admin2
        title: "%slot.cases.district%"
        required: false
contributes:
```

Add the command after `rolling.average`:

```yaml
    - id: rolling.average
      title: "%rollingAverage.title%"
      icon: chart-line
    - id: cases.epicurve
      title: "%cases.epicurve.title%"
      icon: chart-bar
  menus:
```

and its toolbar entry, with no `when`, after the `rolling.average` entry:

```yaml
      - command: rolling.average
        when:
          dateColumnCount: { gte: 1 }
      - command: cases.epicurve
```

In `plugins/epidemiology/locales/en.json`, add after `"rollingAverage.failed"` (add a comma to that line):

```json
  "slot.cases.title": "Cases",
  "slot.cases.description": "One record per case, with the date its symptoms began. The Case epicurve command charts them over time.",
  "slot.cases.onsetDate": "Onset date",
  "slot.cases.district": "District",
  "cases.epicurve.title": "Case epicurve",
  "caseEpicurve.loading": "Reading the case records…",
  "caseEpicurve.notBound": "No case records are chosen for this plugin yet. Choose the case type or dataset it reads.",
  "caseEpicurve.broken": "The case records chosen for this plugin have changed and can no longer be read. Choose them again.",
  "caseEpicurve.chooseRecords": "Choose records",
  "caseEpicurve.unavailable": "This version of Avandar cannot read case records for plugins.",
  "caseEpicurve.failed": "Could not read the case records: {message}",
  "caseEpicurve.stackByDistrict": "Stack by district",
  "caseEpicurve.noDistrict": "None of these cases has a district.",
  "caseEpicurve.empty": "None of these cases has an onset date to chart.",
  "caseEpicurve.truncated": "Drawn from the first {count, plural, one {# case} other {# cases}}.",
  "caseEpicurve.seriesCount": "{series}: {count, number}"
```

The interval control reuses the chart type's existing `viz.epicurve.interval`, `viz.epicurve.interval.day`, `viz.epicurve.interval.epiWeek`, and `viz.epicurve.interval.month` strings, and the single series reuses `viz.epicurve.cases` through `makeEpicurveFromRows`.

- [ ] **Step 6: Implement the modal**

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.types.ts`:

```ts
import type { FetchRowsResult } from "@avandar/plugin-sdk";

/**
 * What reading the plugin's `cases` data slot produced, as kept by
 * `useCaseSlotRows` and shown by `CaseEpicurveModal`.
 *
 * - `loading`: the cases are being read.
 * - `notBound`: no one has chosen the case records the slot reads yet.
 * - `broken`: the chosen case records no longer fit the slot.
 * - `failed`: the cases could not be read, with the translated reason.
 * - `loaded`: each case's `onsetDate` and `district`. `isTruncated` is true
 *   when the slot holds more cases than were read.
 */
export type CaseSlotState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "notBound" }>
  | Readonly<{ kind: "broken" }>
  | Readonly<{ kind: "failed"; message: string }>
  | Readonly<{
      kind: "loaded";
      rows: FetchRowsResult["rows"];
      isTruncated: boolean;
    }>;
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/useCaseSlotRows.ts`:

```ts
import { PluginError, useAvandar } from "@avandar/plugin-sdk";
import { useEffect, useState } from "react";
import type { CaseSlotState } from "./CaseEpicurveModal.types";
import type { AvandarApi } from "@avandar/plugin-sdk";

/** The data slot the manifest declares for case records. */
const CASES_SLOT_ID = "cases";

/** The slot attributes the epicurve reads. */
const CASE_COLUMNS = ["onsetDate", "district"];

function _getStateFromError(options: {
  error: unknown;
  t: AvandarApi["i18n"]["t"];
}): CaseSlotState {
  const { error, t } = options;
  if (error instanceof PluginError && error.code === "SlotNotBound") {
    return { kind: "notBound" };
  }
  if (error instanceof PluginError && error.code === "SlotBroken") {
    return { kind: "broken" };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { kind: "failed", message: t("caseEpicurve.failed", { message }) };
}

/** Reads every case the slot returned. Never throws: failures are state. */
async function _loadCaseSlotState(avandar: AvandarApi): Promise<CaseSlotState> {
  const { querySlot } = avandar.data;
  if (querySlot === undefined) {
    return {
      kind: "failed",
      message: avandar.i18n.t("caseEpicurve.unavailable"),
    };
  }
  try {
    const slot = await querySlot(CASES_SLOT_ID);
    const { rows } = await avandar.data.fetchRows(slot.queryHandle, {
      columns: CASE_COLUMNS,
      limit: slot.rowCount,
    });
    return { kind: "loaded", rows, isTruncated: slot.isTruncated };
  } catch (error) {
    return _getStateFromError({ error, t: avandar.i18n.t });
  }
}

/**
 * Reads the onset date and district of every case the plugin's `cases`
 * data slot is bound to, for `CaseEpicurveModal`. `chooseRecords` lets the
 * user choose the case records, then reads the cases again once the binding
 * dialog closes.
 */
export function useCaseSlotRows(): Readonly<{
  state: CaseSlotState;
  chooseRecords: () => Promise<void>;
}> {
  const avandar = useAvandar();
  const [state, setState] = useState<CaseSlotState>({ kind: "loading" });
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    // A read that finishes after a newer one started, or after the modal
    // closed, must not overwrite what is shown.
    let isCurrentRead = true;
    void _loadCaseSlotState(avandar).then((nextState) => {
      if (isCurrentRead) {
        setState(nextState);
      }
    });
    return () => {
      isCurrentRead = false;
    };
  }, [avandar, readCount]);

  const chooseRecords = async (): Promise<void> => {
    // A binding dialog that fails to open leaves the slot as it was, which
    // the next read shows.
    await avandar.ui.openDataSlotBinding?.(CASES_SLOT_ID).catch(() => {});
    setState({ kind: "loading" });
    setReadCount((count) => {
      return count + 1;
    });
  };

  return { state, chooseRecords };
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/ChooseRecordsAlert.tsx`:

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert, Button, Stack, Text } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

type Props = {
  message: string;
  onChooseRecords: () => void;
};

/**
 * Says why the case epicurve cannot read the cases, with a "Choose records"
 * button that lets the user choose the case records it reads.
 * `CaseEpicurveModal` renders it while the cases slot is not bound or no
 * longer fits. A host that cannot open the binding shows no button.
 */
export function ChooseRecordsAlert(props: Readonly<Props>): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  return (
    <Alert color="yellow">
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{props.message}</Text>
        {avandar.ui.openDataSlotBinding === undefined ? null : (
          <Button size="xs" onClick={props.onChooseRecords}>
            {t("caseEpicurve.chooseRecords")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveControls.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
} from "@avandar/plugin-ui";
import { useId } from "react";
import type { EpicurveInterval } from "../../epicurve/getBucketStartFromDate/getBucketStartFromDate";
import type { ReactNode } from "react";

type Props = {
  interval: EpicurveInterval;
  onIntervalChange: (interval: EpicurveInterval) => void;
  isStackedByDistrict: boolean;

  /** False when no case has a district, which disables stacking. */
  canStackByDistrict: boolean;
  onIsStackedByDistrictChange: (isStackedByDistrict: boolean) => void;
};

/** The intervals the user can bucket cases by, shortest first. */
const INTERVALS: readonly EpicurveInterval[] = ["day", "epiWeek", "month"];

/**
 * The case epicurve's interval picker and its "Stack by district" switch,
 * which is disabled, with the reason, while no case has a district.
 * `CaseEpicurveView` owns both values.
 */
export function CaseEpicurveControls(props: Readonly<Props>): ReactNode {
  const t = useT();
  const intervalLabelId = useId();
  const noDistrictHintId = useId();
  return (
    <Group align="flex-start" justify="space-between">
      <Stack gap="xs">
        <Text id={intervalLabelId} size="sm" fw={500}>
          {t("viz.epicurve.interval")}
        </Text>
        <SegmentedControl
          aria-labelledby={intervalLabelId}
          value={props.interval}
          data={INTERVALS.map((interval) => {
            return {
              value: interval,
              label: t(`viz.epicurve.interval.${interval}`),
            };
          })}
          onChange={(value) => {
            const pickedInterval = INTERVALS.find((interval) => {
              return interval === value;
            });
            if (pickedInterval !== undefined) {
              props.onIntervalChange(pickedInterval);
            }
          }}
        />
      </Stack>
      <Stack gap={4}>
        <Switch
          label={t("caseEpicurve.stackByDistrict")}
          aria-describedby={
            props.canStackByDistrict ? undefined : noDistrictHintId
          }
          checked={props.isStackedByDistrict}
          disabled={!props.canStackByDistrict}
          onChange={(event) => {
            props.onIsStackedByDistrictChange(event.currentTarget.checked);
          }}
        />
        {props.canStackByDistrict ? null : (
          <Text id={noDistrictHintId} size="xs" c="dimmed">
            {t("caseEpicurve.noDistrict")}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveTooltip.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import type { ReactNode } from "react";

/** The props the chart's `Tooltip` passes to its `content` component. */
type Props = {
  active: boolean;

  /** The hovered bar's bucket start, as `YYYY-MM-DD`. */
  label?: string | number;

  /** One entry per series in the hovered bar, with its label and count. */
  payload: ReadonlyArray<
    Readonly<{ name?: string | number; value?: unknown; dataKey?: unknown }>
  >;
};

/**
 * The case epicurve's tooltip: the hovered bucket's start date, then each
 * series' case count, such as "Ilala: 12". `CaseEpicurveChart` passes it to
 * the chart's `Tooltip` as its content.
 */
export function CaseEpicurveTooltip({
  active,
  label,
  payload,
}: Readonly<Props>): ReactNode {
  const t = useT();
  if (!active || payload.length === 0) {
    return null;
  }
  return (
    <Stack
      gap={2}
      p="xs"
      bg="var(--mantine-color-body)"
      bd="1px solid var(--mantine-color-default-border)"
      bdrs="sm"
    >
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {payload.map((entry) => {
        return (
          <Text key={String(entry.dataKey)} size="sm">
            {t("caseEpicurve.seriesCount", {
              series: String(entry.name),
              count: Number(entry.value),
            })}
          </Text>
        );
      })}
    </Stack>
  );
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveChart.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Tooltip,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import { CaseEpicurveTooltip } from "./CaseEpicurveTooltip";
import type { PluginVizTransformResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  epicurve: PluginVizTransformResult;
};

/** Fits the chart inside the plugin modal's content column. */
const CHART_WIDTH = 560;
const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 8, right: 8, bottom: 8, left: 0 };

/**
 * Draws the case epicurve: one touching bar per bucket, stacked by series,
 * with a legend once there is more than one series. `CaseEpicurveView`
 * renders it once at least one case has an onset date.
 */
export function CaseEpicurveChart({ epicurve }: Readonly<Props>): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  const axisProps = {
    stroke: theme.gridColor,
    tick: { fill: theme.textColor },
  };
  const { xColumn, series } = epicurve.chart;
  return (
    <ComposedChart
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      data={epicurve.rows}
      margin={CHART_MARGIN}
      barCategoryGap={0}
      role="img"
      title={t("cases.epicurve.title")}
    >
      <CartesianGrid stroke={theme.gridColor} vertical={false} />
      <XAxis dataKey={xColumn} {...axisProps} />
      <YAxis allowDecimals={false} {...axisProps} />
      <Tooltip
        cursor={{ fill: theme.gridColor }}
        content={CaseEpicurveTooltip}
      />
      {series.length > 1 ? <Legend /> : null}
      {series.map((oneSeries, index) => {
        return (
          <Bar
            key={oneSeries.column}
            dataKey={oneSeries.column}
            name={oneSeries.label}
            stackId="cases"
            fill={theme.colors[index % theme.colors.length]}
          />
        );
      })}
    </ComposedChart>
  );
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveView.tsx`:

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { useMemo, useState } from "react";
import { makeEpicurveFromRows } from "../../epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { CaseEpicurveChart } from "./CaseEpicurveChart";
import { CaseEpicurveControls } from "./CaseEpicurveControls";
import type { EpicurveInterval } from "../../epicurve/getBucketStartFromDate/getBucketStartFromDate";
import type { FetchRowsResult } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  rows: FetchRowsResult["rows"];
  isTruncated: boolean;
};

function _hasDistrict(row: FetchRowsResult["rows"][number]): boolean {
  const { district } = row;
  return district !== null && district !== undefined && district !== "";
}

/**
 * The cases bucketed into an epicurve with its controls, a note when there
 * is nothing to chart, and a note when the slot held more cases than were
 * read. `CaseEpicurveModal` renders it once the cases are read.
 */
export function CaseEpicurveView({
  rows,
  isTruncated,
}: Readonly<Props>): ReactNode {
  const avandar = useAvandar();
  const t = useT();
  const [interval, setSelectedInterval] = useState<EpicurveInterval>("epiWeek");
  const [isStacked, setIsStacked] = useState(false);
  const canStackByDistrict = useMemo(() => {
    return rows.some(_hasDistrict);
  }, [rows]);
  const isStackedByDistrict = isStacked && canStackByDistrict;
  const epicurve = useMemo(() => {
    return makeEpicurveFromRows(
      {
        rows,
        // The transform reads only the columns its settings name.
        columns: [],
        settings: {
          dateColumn: "onsetDate",
          interval,
          stackByColumn: isStackedByDistrict ? "district" : undefined,
        },
        isTruncated,
      },
      { i18n: avandar.i18n, locale: avandar.workspace.locale },
    );
  }, [rows, isTruncated, interval, isStackedByDistrict, avandar]);
  return (
    <Stack>
      <CaseEpicurveControls
        interval={interval}
        onIntervalChange={setSelectedInterval}
        isStackedByDistrict={isStackedByDistrict}
        canStackByDistrict={canStackByDistrict}
        onIsStackedByDistrictChange={setIsStacked}
      />
      {epicurve.rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("caseEpicurve.empty")}
        </Text>
      ) : (
        <CaseEpicurveChart epicurve={epicurve} />
      )}
      {isTruncated ? (
        <Text size="xs" c="dimmed">
          {t("caseEpicurve.truncated", { count: rows.length })}
        </Text>
      ) : null}
    </Stack>
  );
}
```

Create `plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveModal.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Alert, Loader, Stack, Text } from "@avandar/plugin-ui";
import { CaseEpicurveView } from "./CaseEpicurveView";
import { ChooseRecordsAlert } from "./ChooseRecordsAlert";
import { useCaseSlotRows } from "./useCaseSlotRows";
import type { ReactNode } from "react";

/**
 * The content of the "Case epicurve" command's modal. It reads every case
 * the plugin's `cases` data slot is bound to and draws them as an epidemic
 * curve by onset date, by day, epi week, or month, optionally stacked by
 * district. While the slot is not bound or no longer fits, it says so and
 * offers to choose the case records, then reads them again.
 */
export function CaseEpicurveModal(): ReactNode {
  const t = useT();
  const { state, chooseRecords } = useCaseSlotRows();
  const onChooseRecords = (): void => {
    void chooseRecords();
  };
  switch (state.kind) {
    case "loading":
      return (
        <Stack role="status" align="center" gap="xs" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {t("caseEpicurve.loading")}
          </Text>
        </Stack>
      );
    case "notBound":
      return (
        <ChooseRecordsAlert
          message={t("caseEpicurve.notBound")}
          onChooseRecords={onChooseRecords}
        />
      );
    case "broken":
      return (
        <ChooseRecordsAlert
          message={t("caseEpicurve.broken")}
          onChooseRecords={onChooseRecords}
        />
      );
    case "failed":
      return <Alert color="yellow">{state.message}</Alert>;
    case "loaded":
      return (
        <CaseEpicurveView rows={state.rows} isTruncated={state.isTruncated} />
      );
  }
}
```

In `plugins/epidemiology/src/index.tsx`, import the modal after the SDK import:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { CaseEpicurveModal } from "./caseEpicurve/CaseEpicurveModal/CaseEpicurveModal";
```

and add the handler after `"rolling.average"`:

```tsx
    "cases.epicurve": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("cases.epicurve.title"),
        content: <CaseEpicurveModal />,
      });
    },
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm vitest run plugins/epidemiology/src/caseEpicurve plugins/epidemiology/src/index.test.tsx`
Expected: PASS (22 tests: 15 in `CaseEpicurveModal.test.tsx`, 7 in `index.test.tsx`)

- [ ] **Step 8: Regenerate the plugin AI tool list**

Adding `data:slots` changes the permissions the generated `fitRegression` declaration carries, and the drift test compares the committed file with the emitter's output.

Run: `pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest/src/node/__tests__/emitPluginAiTools.integration.test.ts`
Expected: FAIL, 1 test: `writes an empty list while no bundled plugin declares a tool` (`expected '// Generated by emitPluginAiTools.mai…' to be '// Generated by emitPluginAiTools.mai…'`).

Run: `pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools.main.ts`
Expected: `shared/agent/dataAgent/pluginAiTools.gen.ts` changes in one place, the `fitRegression` permissions:

```ts
    "permissions": [
      "data:context",
      "query:addColumns",
      "data:slots"
    ],
```

Run the drift test again.
Expected: PASS (3 tests)

- [ ] **Step 9: Run every suite the manifest reaches, type check, format, lint, validate**

Run:
```bash
pnpm vitest run plugins/epidemiology
pnpm vitest run src/lib/agent/dataAgent/createDataAgent src/components/ChatPanel/useAvandarChatRuntime shared/agent/dataAgent supabase/functions/chat/PostAgentStream scripts/vite-plugin-ava-plugins src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/lib/plugins
pnpm vitest run --config packages/shared/plugin-manifest/vitest.config.ts packages/shared/plugin-manifest
pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore plugins/epidemiology
pnpm exec eslint plugins/epidemiology
pnpm --filter @avandar/ava-cli build
node apps/ava-cli/dist/main.cjs plugin validate epidemiology
```
Expected: epidemiology PASS (225 tests in 20 files); the app suites PASS (none of them pins the epidemiology permissions); plugin-manifest PASS (214 tests); no type or lint errors; `✅ plugins/epidemiology is valid.`

- [ ] **Step 10: Commit**

```bash
git add plugins/epidemiology shared/agent/dataAgent/pluginAiTools.gen.ts
git commit -m "feat(epidemiology): chart bound case records as a Case epicurve" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- Adding `data:slots` to `permissions` sends every existing epidemiology install to "needs review" (`getPluginInstallStatusFromInstallation` compares the manifest's permissions with the granted ones), which hides its commands and chart types and withdraws `fitRegression` from the data agent until an admin approves. This is expected; the spec's live AI eval covers it.
- With four commands and the new one always showing, the Data Explorer toolbar now has more than two matching commands for epidemiology, so they collapse into one "Plugins" menu. The existing epidemiology E2E specs click the toolbar buttons directly and will fail until Task 21 updates them. Do not change E2E specs here.
- The plugin cannot tell an unmapped `district` from one whose values are all empty: `querySlot` returns a typed NULL column either way, and `QuerySlotResult` carries no "mapped" flag. So "Stack by district" is disabled, with its hint, whenever no read case has a district, which covers the unmapped case the spec names.
- The hint sits outside the `Switch` and is linked with `aria-describedby`. Mantine's `description` prop puts the text inside the `<label>`, which makes it part of the switch's accessible name.
- Plugin code may not import `ts-pattern` (see `eslint/plugin-restrictions.js`), so `CaseEpicurveModal` branches with a `switch` that returns from every case. `noImplicitReturns` makes a missing state a type error.
- `fetchRows` is called with `limit: slot.rowCount`: its default limit is 50,000 and a slot returns up to 200,000 rows.
- The chart is drawn at a fixed 560 by 300 pixels, which fits the plugin modal (`size: "lg"`, 620 px). `@avandar/plugin-ui/charts` exports no `ResponsiveContainer`.
- In jsdom the x-axis tick labels are under `.recharts-xAxis-tick-labels`; a `.recharts-xAxis .recharts-cartesian-axis-tick-value` selector matches nothing.
- Every new string is a plugin string in `locales/en.json`, so nothing here goes through Lingui or its catalogs.

---

### Task 21: E2E helpers for the install wizard and plugin commands, and the epidemiology specs on them

**Goal:** Give the E2E suite one way to install a plugin the way an admin does (Settings → Plugins → Install → the wizard's Review, Records, Datasets, and Confirm pages → Install → Done) and one way to run a plugin command from the Data Explorer toolbar whether it shows as its own button or inside the `Plugins` menu. Move the three existing epidemiology specs onto them: the old `Install Epidemiology?` confirm dialog no longer exists (Task 15), and with `cases.epicurve` always in the toolbar (Task 20) the epidemiology commands collapse into `Plugins` whenever a result also turns on two of the other three.

**Files:**
- Create: `tests/e2e/helpers/pluginFlow.ts`
- Modify: `tests/e2e/plugins-epidemiology-regression.spec.ts` (installs through the wizard, runs Linear regression through `runPluginCommand`, uses `getPluginCard`)
- Modify: `tests/e2e/plugins-epidemiology-incidence.spec.ts` (installs through the wizard with `onInstallStarted` for its cleanup guard, runs Incidence per 100k through `runPluginCommand`)
- Modify: `tests/e2e/plugins-epidemiology-epicurve.spec.ts` (installs through the wizard)

**Depends on:** Task 15 (wizard dialog `Install <plugin name>`, step labels, `Next`, `Install`, `Done`, `<plugin name> is installed.`, the card's Install button opening the wizard), Task 16 (the Records page and its `Skip for now`), Task 20 (`cases.epicurve` in `dataExplorer.toolbar` with no `when`), and the existing `PluginOverflowMenu` (`Plugins` button, `menuitem` per command).

- [ ] **Step 1: Write the helpers**

Create `tests/e2e/helpers/pluginFlow.ts`:

```ts
import { expect } from "@playwright/test";
import { MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";

/** The install wizard's steps, as its stepper labels them. */
const WIZARD_STEP_LABELS = [
  "Review",
  "Records",
  "Datasets",
  "Confirm",
] as const;

type WizardStepLabel = (typeof WIZARD_STEP_LABELS)[number];

/**
 * The most pages the wizard is walked through before giving up: Review,
 * Datasets, Confirm, and one Records page per data slot, with room to spare.
 */
const MAX_WIZARD_PAGES = 10;

type InstallPluginThroughWizardOptions = {
  workspaceSlug: string;

  /** The plugin's name, as its settings card and the wizard's title show it. */
  pluginName: string;

  /**
   * Binds the data slot on each Records page. The wizard then clicks Next.
   * Without it, each data slot is skipped with "Skip for now", which only an
   * optional slot offers.
   */
  chooseRecords?: (wizard: Locator) => Promise<void>;

  /**
   * Called right after Install is clicked, so a caller can clean up only an
   * install it started.
   */
  onInstallStarted?: () => void;

  /**
   * Runs once the wizard says the plugin is installed, before Done, for
   * example to wait for the plugin's datasets to import.
   */
  beforeDone?: (wizard: Locator) => Promise<void>;
};

/** A plugin's card on the Plugins settings tab, named by its heading. */
export function getPluginCard(page: Page, pluginName: string): Locator {
  return page.getByRole("region", { name: pluginName, exact: true });
}

async function _getActiveStepLabel(wizard: Locator): Promise<WizardStepLabel> {
  const stepText = await wizard.locator('[aria-current="step"]').innerText();
  const stepLabel = WIZARD_STEP_LABELS.find((label) => {
    return stepText.includes(label);
  });
  if (stepLabel === undefined) {
    throw new Error(`Unknown install wizard step: "${stepText}"`);
  }
  return stepLabel;
}

/** Leaves one wizard page before Confirm the way its step is left. */
async function _leaveWizardPage(
  options: Readonly<{
    wizard: Locator;
    stepLabel: WizardStepLabel;
    chooseRecords: InstallPluginThroughWizardOptions["chooseRecords"];
  }>,
): Promise<void> {
  const { wizard, stepLabel, chooseRecords } = options;
  if (stepLabel === "Records") {
    if (chooseRecords === undefined) {
      await wizard
        .getByRole("button", { name: "Skip for now", exact: true })
        .click();
      return;
    }
    await chooseRecords(wizard);
  }
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
}

/**
 * Walks the wizard from Review to Confirm. Every page starts with a level 3
 * heading of its own, so waiting for that heading to change waits for the
 * next page to draw before its step is read.
 */
async function _goToConfirmStep(
  options: Readonly<{
    wizard: Locator;
    chooseRecords: InstallPluginThroughWizardOptions["chooseRecords"];
  }>,
): Promise<void> {
  const { wizard, chooseRecords } = options;
  const pageHeading = wizard.getByRole("heading", { level: 3 });
  for (let pageCount = 0; pageCount < MAX_WIZARD_PAGES; pageCount += 1) {
    const stepLabel = await _getActiveStepLabel(wizard);
    if (stepLabel === "Confirm") {
      return;
    }
    const headingText = await pageHeading.innerText();
    await _leaveWizardPage({ wizard, stepLabel, chooseRecords });
    await expect(pageHeading).not.toHaveText(headingText, {
      timeout: SHORT_WAIT,
    });
  }
  throw new Error(
    `The install wizard did not reach Confirm in ${MAX_WIZARD_PAGES} pages.`,
  );
}

/**
 * Installs a plugin the way an admin does: Install on its card in Settings →
 * Plugins, then through the install wizard's pages to Install, then Done.
 * It lands on Settings with `page.goto`, so call it right after signing in.
 * Resolves once the card says the plugin is installed.
 */
export async function installPluginThroughWizard(
  page: Page,
  options: Readonly<InstallPluginThroughWizardOptions>,
): Promise<void> {
  const { workspaceSlug, pluginName } = options;
  await page.goto(`/${workspaceSlug}/settings/plugins`);
  const card = getPluginCard(page, pluginName);
  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await card.getByRole("button", { name: "Install", exact: true }).click();

  const wizard = page.getByRole("dialog", {
    name: `Install ${pluginName}`,
    exact: true,
  });
  await expect(
    wizard.getByRole("heading", { level: 3, name: "About this plugin" }),
  ).toBeVisible({ timeout: SHORT_WAIT });
  await _goToConfirmStep({ wizard, chooseRecords: options.chooseRecords });
  await wizard.getByRole("button", { name: "Install", exact: true }).click();
  options.onInstallStarted?.();
  await expect(
    wizard.getByText(`${pluginName} is installed.`, { exact: true }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });

  await options.beforeDone?.(wizard);
  await wizard.getByRole("button", { name: "Done", exact: true }).click();
  await expect(wizard).toBeHidden({ timeout: SHORT_WAIT });
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Runs a plugin command from the Data Explorer toolbar by its title: its own
 * button while the toolbar has room for every plugin command, otherwise its
 * item in the "Plugins" menu they collapse into. Commands stay disabled
 * until a query result is on screen, so this waits for them to turn on.
 */
export async function runPluginCommand(
  page: Page,
  commandTitle: string,
): Promise<void> {
  const commandButton = page.getByRole("button", {
    name: commandTitle,
    exact: true,
  });
  const pluginsMenuButton = page.getByRole("button", {
    name: "Plugins",
    exact: true,
  });
  await expect(commandButton.or(pluginsMenuButton)).toBeEnabled({
    timeout: MEDIUM_WAIT,
  });
  if (await commandButton.isVisible()) {
    await commandButton.click();
    return;
  }
  await pluginsMenuButton.click();
  await page.getByRole("menuitem", { name: commandTitle, exact: true }).click();
}
```

- [ ] **Step 2: Move the three epidemiology specs onto the helpers**

Apply this change to `tests/e2e/plugins-epidemiology-regression.spec.ts`:

```diff
@@ -1,6 +1,11 @@
 import { expect, test } from "./fixtures/e2e.fixture";
 import { signInWithEmailPassword } from "./helpers/auth";
 import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
+import {
+  getPluginCard,
+  installPluginThroughWizard,
+  runPluginCommand,
+} from "./helpers/pluginFlow";
 import {
   createSupabaseAdminClient,
   getWorkspaceIdBySlug,
@@ -11,6 +16,7 @@ import type { Locator, Page } from "@playwright/test";
 /** Twenty points on the exact line y = 2x + 1, so every statistic is known. */
 const REGRESSION_SQL = "SELECT x, 2 * x + 1 AS y FROM range(1, 21) t(x)";
 const PLUGIN_ID = "avandar.epidemiology";
+const PLUGIN_NAME = "Epidemiology";
 
 async function _confirmDialog(page: Page, buttonName: string): Promise<void> {
   await page
@@ -19,10 +25,6 @@ async function _confirmDialog(page: Page, buttonName: string): Promise<void> {
     .click();
 }
 
-function _getPluginCard(page: Page): Locator {
-  return page.getByRole("region", { name: "Epidemiology" });
-}
-
 /**
  * Asserts one regression statistic. A statistic is a labelled group holding
  * its label and its value, so the whole text is checked, not a substring.
@@ -56,15 +58,9 @@ test.describe("Epidemiology plugin", () => {
         workspaceSlug,
       });
 
-      await page.goto(`/${workspaceSlug}/settings/plugins`);
-      const card = _getPluginCard(page);
-      await expect(
-        card.getByText("Not installed", { exact: true }),
-      ).toBeVisible({ timeout: MEDIUM_WAIT });
-      await card.getByRole("button", { name: "Install" }).click();
-      await _confirmDialog(page, "Install");
-      await expect(card.getByText("Installed", { exact: true })).toBeVisible({
-        timeout: MEDIUM_WAIT,
+      await installPluginThroughWizard(page, {
+        workspaceSlug,
+        pluginName: PLUGIN_NAME,
       });
 
       await page.goto(
@@ -75,9 +71,7 @@ test.describe("Epidemiology plugin", () => {
         page.getByRole("columnheader", { name: /^y$/i }),
       ).toBeVisible({ timeout: MEDIUM_WAIT });
 
-      await page
-        .getByRole("button", { name: "Linear regression" })
-        .click({ timeout: MEDIUM_WAIT });
+      await runPluginCommand(page, "Linear regression");
       const dialog = page.getByRole("dialog", { name: "Linear regression" });
       await dialog.getByRole("button", { name: "Fit regression" }).click();
       await _expectStatistic({ dialog, label: "Slope", value: "2" });
@@ -87,12 +81,11 @@ test.describe("Epidemiology plugin", () => {
       await page.keyboard.press("Escape");
 
       await page.goto(`/${workspaceSlug}/settings/plugins`);
-      await _getPluginCard(page)
-        .getByRole("button", { name: "Uninstall" })
-        .click();
+      const card = getPluginCard(page, PLUGIN_NAME);
+      await card.getByRole("button", { name: "Uninstall" }).click();
       await _confirmDialog(page, "Uninstall");
       await expect(
-        _getPluginCard(page).getByText("Not installed", { exact: true }),
+        card.getByText("Not installed", { exact: true }),
       ).toBeVisible({ timeout: MEDIUM_WAIT });
     } finally {
       // Safety net if the test failed before its own UI uninstall. Removes
```

Apply this change to `tests/e2e/plugins-epidemiology-incidence.spec.ts`:

```diff
@@ -4,6 +4,10 @@ import {
   dismissBlockingOverlays,
   openDataExplorerDrawerTab,
 } from "./helpers/dataExplorerFlow";
+import {
+  installPluginThroughWizard,
+  runPluginCommand,
+} from "./helpers/pluginFlow";
 import {
   createSupabaseAdminClient,
   getWorkspaceIdBySlug,
@@ -28,10 +32,6 @@ const BOROUGH_COUNT = 5;
 const RATE_COLUMN = "incidence_per_100k";
 const PLUGIN_ID = "avandar.epidemiology";
 
-function _getPluginCard(page: Page): Locator {
-  return page.getByRole("region", { name: "Epidemiology" });
-}
-
 function _getColumnHeader(
   options: Readonly<{ page: Page; columnName: string }>,
 ): Locator {
@@ -41,44 +41,13 @@ function _getColumnHeader(
   });
 }
 
-/**
- * Installs the plugin from Settings. Calls `onInstallConfirmed` as soon as
- * the install is confirmed, before waiting for "Installed", so a caller can
- * clean up an install whose card never updates.
- */
-async function _installPlugin(
-  options: Readonly<{
-    page: Page;
-    workspaceSlug: string;
-    onInstallConfirmed: () => void;
-  }>,
-): Promise<void> {
-  const { page, workspaceSlug, onInstallConfirmed } = options;
-  await page.goto(`/${workspaceSlug}/settings/plugins`);
-  const card = _getPluginCard(page);
-  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
-    timeout: MEDIUM_WAIT,
-  });
-  await card.getByRole("button", { name: "Install", exact: true }).click();
-  await page
-    .getByRole("dialog", { name: "Install Epidemiology?" })
-    .getByRole("button", { name: "Install", exact: true })
-    .click();
-  onInstallConfirmed();
-  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
-    timeout: MEDIUM_WAIT,
-  });
-}
-
 /**
  * Runs "Incidence per 100k" from the toolbar with the modal's defaults:
  * `cases` over `population`, per 100,000. Returns the notification that
  * lists the added columns.
  */
 async function _addIncidenceColumns(page: Page): Promise<Locator> {
-  await page
-    .getByRole("button", { name: "Incidence per 100k" })
-    .click({ timeout: MEDIUM_WAIT });
+  await runPluginCommand(page, "Incidence per 100k");
   const dialog = page.getByRole("dialog", { name: "Incidence per 100k" });
   await dialog.getByRole("button", { name: "Add columns" }).click();
   await expect(dialog).toBeHidden({ timeout: SHORT_WAIT });
@@ -143,8 +112,8 @@ test.describe("Epidemiology plugin incidence", () => {
       supabaseAdminClient,
       slug: workspaceSlug,
     });
-    // Set once the Settings install is confirmed, so cleanup never deletes
-    // an install this spec did not make.
+    // Set once Install is clicked in the install wizard, so cleanup never
+    // deletes an install this spec did not make.
     let didInstall = false;
     try {
       await signInWithEmailPassword(page, {
@@ -152,10 +121,10 @@ test.describe("Epidemiology plugin incidence", () => {
         password: primaryUser.password,
         workspaceSlug,
       });
-      await _installPlugin({
-        page,
+      await installPluginThroughWizard(page, {
         workspaceSlug,
-        onInstallConfirmed: () => {
+        pluginName: "Epidemiology",
+        onInstallStarted: () => {
           didInstall = true;
         },
       });
```

Apply this change to `tests/e2e/plugins-epidemiology-epicurve.spec.ts`:

```diff
@@ -5,6 +5,7 @@ import {
   openDataExplorerDrawerTab,
 } from "./helpers/dataExplorerFlow";
 import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
+import { installPluginThroughWizard } from "./helpers/pluginFlow";
 import {
   deleteAllDashboardsForOwner,
   deleteDashboardsByIds,
@@ -37,34 +38,11 @@ const ONSET_SQL =
 const EPICURVE_BAR_COUNT = 4;
 const PLUGIN_ID = "avandar.epidemiology";
 
-function _getPluginCard(page: Page): Locator {
-  return page.getByRole("region", { name: "Epidemiology" });
-}
-
 /** The bars a Recharts bar chart draws, on a page or in the editor canvas. */
 function _getBars(scope: Page | FrameLocator): Locator {
   return scope.locator(".recharts-bar-rectangle path");
 }
 
-async function _installPlugin(
-  options: Readonly<{ page: Page; workspaceSlug: string }>,
-): Promise<void> {
-  const { page, workspaceSlug } = options;
-  await page.goto(`/${workspaceSlug}/settings/plugins`);
-  const card = _getPluginCard(page);
-  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
-    timeout: MEDIUM_WAIT,
-  });
-  await card.getByRole("button", { name: "Install", exact: true }).click();
-  await page
-    .getByRole("dialog", { name: "Install Epidemiology?" })
-    .getByRole("button", { name: "Install", exact: true })
-    .click();
-  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
-    timeout: MEDIUM_WAIT,
-  });
-}
-
 /** Runs the onset query in the Data Explorer and picks the epicurve. */
 async function _pickEpicurve(
   options: Readonly<{ page: Page; workspaceSlug: string }>,
@@ -220,7 +198,10 @@ test.describe("Epidemiology plugin epicurve", () => {
         password: primaryUser.password,
         workspaceSlug,
       });
-      await _installPlugin({ page, workspaceSlug });
+      await installPluginThroughWizard(page, {
+        workspaceSlug,
+        pluginName: "Epidemiology",
+      });
       await _pickEpicurve({ page, workspaceSlug });
       await expect(_getBars(page)).toHaveCount(EPICURVE_BAR_COUNT, {
         timeout: MEDIUM_WAIT,
```

- [ ] **Step 3: Type check, format, lint**

Run:

```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore tests/e2e/helpers/pluginFlow.ts tests/e2e/plugins-epidemiology-regression.spec.ts tests/e2e/plugins-epidemiology-incidence.spec.ts tests/e2e/plugins-epidemiology-epicurve.spec.ts
pnpm exec eslint tests/e2e/helpers/pluginFlow.ts tests/e2e/plugins-epidemiology-regression.spec.ts tests/e2e/plugins-epidemiology-incidence.spec.ts tests/e2e/plugins-epidemiology-epicurve.spec.ts
```

Expected: no errors. (`tsconfig.app.json` includes `tests/`; the type check takes about 25 seconds.)

- [ ] **Step 4: Run the three specs, one at a time**

First confirm this worktree is on its own switched stack:

```bash
node apps/ava-cli/dist/main.cjs supabase status
```

Expected: the first line names the switched project `feat-plugins-slots`. If it says `This is the develop local Supabase`, stop: Task 1 did not switch.

Then run each spec on its own:

```bash
pnpm test:e2e plugins-epidemiology-regression.spec.ts
pnpm test:e2e plugins-epidemiology-incidence.spec.ts
pnpm test:e2e plugins-epidemiology-epicurve.spec.ts
```

Expected: each passes (1 test each). These specs have never run, so this is their first real run: if one fails, read the trace and the failure screenshot under `test-results/`, fix the selector in `tests/e2e/helpers/pluginFlow.ts` or the spec against the UI file it names in the notes below, re-run, and amend this task's commit.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/helpers/pluginFlow.ts tests/e2e/plugins-epidemiology-regression.spec.ts tests/e2e/plugins-epidemiology-incidence.spec.ts tests/e2e/plugins-epidemiology-epicurve.spec.ts
git commit -m "test(plugins): install plugins through the wizard in the epidemiology specs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The helper module is `pluginFlow.ts`, named like `dataExplorerFlow.ts` and `shareModalFlow.ts`, because it holds both the install flow and `runPluginCommand`. Its exports: `getPluginCard(page, pluginName)`, `installPluginThroughWizard(page, { workspaceSlug, pluginName, chooseRecords?, onInstallStarted?, beforeDone? })`, `runPluginCommand(page, commandTitle)`. Tasks 22 and 23 use all three, plus `chooseRecords` and `beforeDone`.
- How the helper walks the wizard: the active step is the stepper button with `aria-current="step"` (set by `InstallWizardStepper.tsx`; Mantine 9's `Stepper.Step` forwards it to its `<button>`). Every page starts with one level 3 heading (`InstallWizardStepHeading.tsx`), so after each Next or Skip the helper waits for that heading's text to change before reading the step again. A plugin with several data slots gets one Records page per slot, and `chooseRecords` runs on each.
- Without `chooseRecords` a Records page is left with `Skip for now`, which only an optional slot offers (`InstallWizardFooter.tsx`). Epidemiology's `cases` slot is optional.
- `runPluginCommand` waits for either the command's own button or the `Plugins` button to be enabled: a plugin command is disabled until a query result is on screen (`PluginMenuSlot.tsx`), and before the result's facts arrive the toolbar may show a different set of commands. Two or fewer commands show as buttons; three or more collapse into `Plugins` (`MAX_INLINE_ITEMS` in `PluginMenuSlot.tsx`). Both specs' queries here have two number columns, so Linear regression, Incidence per 100k, and Case epicurve all show and collapse into the menu.
- The incidence spec still deletes the install only when it started one: `onInstallStarted` replaces the old `onInstallConfirmed`. The regression and epicurve specs keep their unconditional cleanup. The regression spec still uninstalls through the card; Uninstall keeps its confirm dialog (`usePluginActionCopy.ts`).
- `installPluginThroughWizard` lands on Settings with `page.goto`, as the old per-spec helpers did, so call it right after signing in. The `?sql=` deep links after it reload the page; `PluginHost` refetches installs on mount (`ALWAYS_REFETCH_ON_MOUNT`), so the new install is seen.
- Selectors and where they come from: card `region` named by the plugin name (`PluginSettingsCard.tsx`, `PluginCardHeading.tsx`); `Not installed` / `Installed` (`PluginStatusBadge.tsx`); card `Install` (`PluginInstallButton.tsx`); dialog `Install <plugin name>` (`openPluginInstallWizard.tsx`); step labels `Review`, `Records`, `Datasets`, `Confirm` (`InstallWizardStepper.tsx`); heading `About this plugin` (`ReviewStep.tsx`); `Next`, `Skip for now`, `Install`, `Done` (`InstallWizardFooter.tsx`); `<plugin name> is installed.` (`ConfirmStep.tsx`); `Plugins` button and `menuitem`s (`src/lib/plugins/PluginMenuSlot/PluginOverflowMenu.tsx`); inline command buttons (`PluginInlineButtons.tsx`); command titles `Linear regression`, `Incidence per 100k` (`plugins/epidemiology/locales/en.json`).

---

### Task 22: E2E: install the Mozambique pack

**Goal:** Prove the no-code content path end to end: an admin installs the Mozambique pack through the wizard with both datasets checked, both import, the plugin's card links each one under "Datasets it includes", and Data Sources lists both.

**Files:**
- Create: `tests/e2e/plugins-mozambique-install.spec.ts`

**Depends on:** Task 21 (`installPluginThroughWizard`, `getPluginCard`), Task 17 (`usePluginContentImports`, including its dataset list refresh, the Datasets step, import statuses), Task 18 (the card's "Datasets it includes" links), Task 9 (the Mozambique pack and its titles).

- [ ] **Step 1: Write the spec**

Create `tests/e2e/plugins-mozambique-install.spec.ts`:

```ts
/*
 * The Mozambique pack, end to end: installing it through the wizard imports
 * its province and district boundaries as datasets, which the plugin's card
 * links to and Data Sources lists.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { makeDatasetPageUrlPatternFromWorkspaceSlug } from "./helpers/manualUploadCloudSyncFlow";
import {
  getPluginCard,
  installPluginThroughWizard,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { Locator, Page } from "@playwright/test";

const PLUGIN_ID = "avandar.mozambique";
const PLUGIN_NAME = "Mozambique";

/** Each content item's title, which also names the dataset it becomes. */
const DATASET_NAMES = ["Mozambique provinces", "Mozambique districts"];

/** Waits on the Confirm step until every dataset of the pack is imported. */
async function _expectEveryDatasetImported(wizard: Locator): Promise<void> {
  await expect(wizard.getByText("Imported", { exact: true })).toHaveCount(
    DATASET_NAMES.length,
    { timeout: LONG_WAIT },
  );
}

/**
 * Deletes the datasets the pack imported into the workspace, found through
 * its import rows, then any import row left behind. Deleting a dataset
 * deletes its import row with it.
 */
async function _deleteImportedContent(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { admin, workspaceId } = options;
  const { data: imports } = await admin
    .from("plugin_content_imports")
    .select("dataset_id")
    .eq("workspace_id", workspaceId)
    .eq("plugin_id", PLUGIN_ID)
    .throwOnError();
  for (const contentImport of imports) {
    await deleteDatasetFixture({
      admin,
      datasetId: contentImport.dataset_id,
      workspaceId,
    });
  }
  await admin
    .from("plugin_content_imports")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("plugin_id", PLUGIN_ID)
    .throwOnError();
}

/** Checks that the plugin's card links each dataset to its page. */
async function _expectCardLinksEveryDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const card = getPluginCard(options.page, PLUGIN_NAME);
  await expect(
    card.getByRole("heading", { name: "Datasets it includes" }),
  ).toBeVisible();
  for (const datasetName of DATASET_NAMES) {
    await expect(
      card.getByRole("link", { name: datasetName, exact: true }),
    ).toHaveAttribute(
      "href",
      makeDatasetPageUrlPatternFromWorkspaceSlug(options.workspaceSlug),
      { timeout: MEDIUM_WAIT },
    );
  }
}

/**
 * Opens Data Sources from the nav and checks that it lists each dataset.
 * It goes client-side, as a user would, because a reload could restore a
 * dataset list cached before the import. A dataset's row may also carry an
 * Offline badge, so its link is matched by the name it contains.
 */
async function _expectDataSourcesListsEveryDataset(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Data Sources", exact: true }).click();
  for (const datasetName of DATASET_NAMES) {
    await expect(page.getByRole("link", { name: datasetName })).toBeVisible({
      timeout: LONG_WAIT,
    });
  }
}

/** Deletes the plugin's install. */
async function _deletePluginInstallation(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("plugin_installations")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("plugin_id", PLUGIN_ID);
  if (error) {
    console.warn(
      `[e2e] Mozambique plugin installation cleanup: ${error.message}`,
    );
  }
}

test.describe("Mozambique plugin", () => {
  test("installing it imports its provinces and districts as datasets its card links to", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    // Set once Install is clicked in the install wizard, so cleanup never
    // deletes an install this spec did not make.
    let didInstall = false;
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      // Both datasets start checked on the wizard's Datasets step, and the
      // helper leaves them that way.
      await installPluginThroughWizard(page, {
        workspaceSlug,
        pluginName: PLUGIN_NAME,
        onInstallStarted: () => {
          didInstall = true;
        },
        beforeDone: _expectEveryDatasetImported,
      });
      await _expectCardLinksEveryDataset({ page, workspaceSlug });
      await _expectDataSourcesListsEveryDataset(page);
    } finally {
      // Each cleanup step runs even when an earlier one fails.
      await _deleteImportedContent({ admin, workspaceId }).catch(
        (error: unknown) => {
          console.warn(`[e2e] Mozambique content cleanup: ${String(error)}`);
        },
      );
      if (didInstall) {
        await _deletePluginInstallation({ admin, workspaceId });
      }
    }
  });
});
```

- [ ] **Step 2: Type check, format, lint**

Run:

```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore tests/e2e/plugins-mozambique-install.spec.ts
pnpm exec eslint tests/e2e/plugins-mozambique-install.spec.ts
```

Expected: no errors

- [ ] **Step 3: Run the spec**

Confirm the switch first:

```bash
node apps/ava-cli/dist/main.cjs supabase status
```

Expected: the first line names the switched project `feat-plugins-slots`.

Then run:

```bash
pnpm test:e2e plugins-mozambique-install.spec.ts
```

Expected: passes (1 test). This spec has never run, so this is its first real run. If it fails, read the trace and failure screenshot under `test-results/` before changing anything; if an import shows `Failed: <reason>`, that reason is the bug to fix (in Task 17's `importPluginContentItem`), not the spec. After a failed run, check that the `finally` cleanup ran: `plugin_content_imports` and `plugin_installations` should have no `avandar.mozambique` row for the worker workspace.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/plugins-mozambique-install.spec.ts
git commit -m "test(plugins): cover installing the Mozambique pack end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The spec does not use `expectDatasetVisibleInDataManager` from `datasetSharingFlow.ts`: that helper lands with `page.goto`, which `docs/rules/e2e-testing.md` forbids mid-test (a reload restores the persisted query cache as fresh). It clicks the `Data Sources` nav link instead and checks the same thing, a `link` per dataset name. That link may also hold an `Offline` badge and a parse status (`DatasetNavbar.tsx`), so it is matched by the name it contains, not exactly.
- `beforeDone` waits up to `LONG_WAIT` (30 seconds) for two `Imported` statuses on the Confirm step. The two CSVs are small (12 and 160 lines, about 1.2 MB together), so the whole test should fit the 45-second local limit; if it is close, time the import before raising anything.
- Cleanup finds the imported datasets through `plugin_content_imports`, deletes each with `deleteDatasetFixture` (its import row goes with it: the composite FK cascades), then deletes any import row left, then the install row only when this test clicked Install.
- Selectors and where they come from: card `region` `Mozambique`, `Installed` (Task 21's helper); Datasets step heading `Datasets to import` (`ContentStep.tsx`); `Imported` (`pluginContent/PluginContentImportStatusText.tsx`, shown by `ConfirmContentItemRow.tsx`); card heading `Datasets it includes` (`PluginContentSection.tsx` through `PluginDetailsSection.tsx`); card links named `Mozambique provinces` and `Mozambique districts` to `/<slug>/data-manager/<dataset id>` (`PluginContentDatasetLink.tsx`; titles from `plugins/mozambique/locales/en.json`); nav link `Data Sources`; dataset links in Data Sources (`DatasetNavbar.tsx`).

---

### Task 23: E2E: bind the epidemiology cases slot and chart it with the Case epicurve

**Goal:** Prove the data slot path end to end: with a case type over a small line list, an admin installs Epidemiology through the wizard and binds `Cases` to that case type (`Onset date` → `onset_date`, `District` → `district`), the live check counts all 30 records, and the `Case epicurve` command, run from the Data Explorer's `Plugins` menu, draws one bar per onset week and, with `Stack by district` on, one bar per week and district.

**Files:**
- Create: `tests/data/case-line-list/case-line-list.csv`
- Modify: `tests/e2e/helpers/constants.ts` (`CASE_LINE_LIST_CSV_PATH`, `CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT`)
- Modify: `tests/e2e/helpers/CaseTypeSeedHelpers.ts` (`SeedAttribute.dataType` accepts `"date"`; new `seedCaseTypeWithFields`)
- Create: `tests/e2e/plugins-epidemiology-case-slot.spec.ts`

**Depends on:** Task 21 (`installPluginThroughWizard` with `chooseRecords`, `runPluginCommand`, `getPluginCard`), Task 16 (data slot panel and check preview), Task 18 (the card's `Case type: <name>` line), Task 19 (`querySlot`), Task 20 (the `cases` slot, `Case epicurve`, `Stack by district`).

- [ ] **Step 1: Add the line list fixture**

Create `tests/data/case-line-list/case-line-list.csv`:

```csv
case_id,onset_date,district
C001,2024-01-01,Ilala
C002,2024-01-02,Ilala
C003,2024-01-03,Kinondoni
C004,2024-01-04,Ilala
C005,2024-01-05,Temeke
C006,2024-01-06,Kinondoni
C007,2024-01-07,Ilala
C008,2024-01-08,Ilala
C009,2024-01-08,Kinondoni
C010,2024-01-09,Ilala
C011,2024-01-10,Temeke
C012,2024-01-10,Kinondoni
C013,2024-01-11,Ilala
C014,2024-01-12,Kinondoni
C015,2024-01-12,Ilala
C016,2024-01-13,Temeke
C017,2024-01-14,Ilala
C018,2024-01-15,Kinondoni
C019,2024-01-15,Ilala
C020,2024-01-16,Kinondoni
C021,2024-01-17,Ilala
C022,2024-01-18,Temeke
C023,2024-01-18,Kinondoni
C024,2024-01-19,Ilala
C025,2024-01-20,Kinondoni
C026,2024-01-21,Ilala
C027,2024-01-22,Kinondoni
C028,2024-01-22,Ilala
C029,2024-01-23,Temeke
C030,2024-01-24,Temeke
```

- [ ] **Step 2: Name the fixture in the E2E constants**

Apply this change to `tests/e2e/helpers/constants.ts`:

```diff
@@ -67,6 +67,22 @@ export const CASE_BUCKETED_VISITS_CSV_PATH = path.join(
  */
 export const CASE_BUCKETED_VISITS_CSV_EXPECTED_ROW_COUNT = 7;
 
+/**
+ * Thirty cases, `C001` to `C030`, each with an onset date and a district,
+ * for the epidemiology plugin's cases data slot. The onset dates fall in four
+ * MMWR weeks, starting 2023-12-31 (6 cases), 2024-01-07 (10), 2024-01-14 (9),
+ * and 2024-01-21 (5). The districts are Ilala (14 cases), Kinondoni (10), and
+ * Temeke (6), and every week has a case in each, so the epicurve stacked by
+ * district draws 12 bars.
+ */
+export const CASE_LINE_LIST_CSV_PATH = path.join(
+  process.cwd(),
+  "tests/data/case-line-list/case-line-list.csv",
+);
+
+/** Row count reported after DuckDB parses {@link CASE_LINE_LIST_CSV_PATH}. */
+export const CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT = 30;
+
 /**
  * Real 10-page tagged PDF (see `public/test-data/pdf/README.md` for its
  * provenance and licence). Well under the 50-page import cap, so its page
```

- [ ] **Step 3: Seed a case type with single-value fields**

Apply this change to `tests/e2e/helpers/CaseTypeSeedHelpers.ts`:

```diff
@@ -55,7 +55,7 @@ async function _getDatasetColumnId(
 type SeedAttribute = {
   id: string;
   name: string;
-  dataType: "varchar" | "double";
+  dataType: "varchar" | "double" | "date";
   /** The label and identifier. A case type has exactly one. */
   isKey: boolean;
   isArray: boolean;
@@ -338,6 +338,75 @@ async function _seedCaseTypeWithPerMonthField(
   });
 }
 
+type SeedCaseTypeWithFieldsOptions = {
+  supabaseAdminClient: AvaSupabaseDBClient;
+  workspaceId: string;
+  caseTypeName: string;
+  datasetId: string;
+  /** The dataset column whose values key, and label, each record. */
+  keyColumnName: string;
+  keyAttributeName: string;
+  /**
+   * One field per entry, named after the dataset column it reads and
+   * keeping the first value of that column for each record.
+   */
+  fields: ReadonlyArray<{
+    columnName: string;
+    dataType: SeedAttribute["dataType"];
+  }>;
+  /** One record per key, named after it. */
+  recordKeys: readonly string[];
+};
+
+/**
+ * Seeds a case type whose label and identifier reads `keyColumnName`, plus
+ * one single-value field per entry of `fields`, with Active and Inactive
+ * statuses and one Active record per key.
+ */
+async function _seedCaseTypeWithFields(
+  options: Readonly<SeedCaseTypeWithFieldsOptions>,
+): Promise<SeededCaseType> {
+  const { supabaseAdminClient, datasetId } = options;
+  const getColumnId = (columnName: string): Promise<string> => {
+    return _getDatasetColumnId({ supabaseAdminClient, datasetId, columnName });
+  };
+  const [keyColumnId, fieldAttributes] = await Promise.all([
+    getColumnId(options.keyColumnName),
+    Promise.all(
+      options.fields.map(async (field): Promise<SeedAttribute> => {
+        return {
+          id: randomUUID(),
+          name: field.columnName,
+          dataType: field.dataType,
+          isKey: false,
+          isArray: false,
+          valuePickerRuleType: "first",
+          datasetColumnId: await getColumnId(field.columnName),
+        };
+      }),
+    ),
+  ]);
+  return _seedCaseType({
+    supabaseAdminClient,
+    workspaceId: options.workspaceId,
+    caseTypeName: options.caseTypeName,
+    datasetId,
+    recordKeys: options.recordKeys,
+    attributes: [
+      {
+        id: randomUUID(),
+        name: options.keyAttributeName,
+        dataType: "varchar",
+        isKey: true,
+        isArray: false,
+        valuePickerRuleType: "first",
+        datasetColumnId: keyColumnId,
+      },
+      ...fieldAttributes,
+    ],
+  });
+}
+
 /** Deletes a seeded case type, which cascades to its statuses and records. */
 async function _deleteCaseType(
   options: Readonly<{
@@ -366,6 +435,12 @@ export const CaseTypeSeedHelpers = {
    */
   seedCaseTypeWithPerMonthField: _seedCaseTypeWithPerMonthField,
 
+  /**
+   * Seeds a dataset-backed case type with single-value fields named after
+   * the columns they read, and one Active record per key.
+   */
+  seedCaseTypeWithFields: _seedCaseTypeWithFields,
+
   /** Deletes a seeded case type with its statuses and records. */
   deleteCaseType: _deleteCaseType,
 };
```

- [ ] **Step 4: Write the spec**

Create `tests/e2e/plugins-epidemiology-case-slot.spec.ts`:

```ts
/*
 * The epidemiology plugin's cases data slot, end to end: an admin binds it to
 * a case type in the install wizard, and the Case epicurve command then
 * charts that case type's records by onset week, stacked by district on
 * request.
 *
 * The line list is imported and the case type seeded in `beforeAll`, in a
 * browser context of its own: the case type list is cached for minutes once
 * a session loads it, so the session under test has to start after the case
 * type exists. See `CASE_LINE_LIST_CSV_PATH` for the counts the chart shows.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CaseTypeSeedHelpers } from "./helpers/CaseTypeSeedHelpers";
import {
  CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  CASE_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  getPluginCard,
  installPluginThroughWizard,
  runPluginCommand,
} from "./helpers/pluginFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerCredentials } from "./fixtures/e2e.fixture";
import type { SeededCaseType } from "./helpers/CaseTypeSeedHelpers";
import type { Browser, Locator, Page } from "@playwright/test";

const PLUGIN_ID = "avandar.epidemiology";
const PLUGIN_NAME = "Epidemiology";
const CASE_TYPE_NAME = "E2E plugin cases";

/** The line list's case ids, `C001` to `C030`, one record each. */
const CASE_IDS = Array.from(
  { length: CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT },
  (_value, index) => {
    return `C${String(index + 1).padStart(3, "0")}`;
  },
);

/** The line list's MMWR weeks, each with at least one case. */
const EPI_WEEK_COUNT = 4;

/**
 * The line list's districts in the order the chart's legend lists them,
 * which is alphabetical.
 */
const DISTRICTS = ["Ilala", "Kinondoni", "Temeke"];

/**
 * Two number columns turn on Linear regression and Incidence per 100k as
 * well, so the toolbar's three epidemiology commands collapse into the
 * Plugins menu.
 */
const RESULT_SQL = "SELECT 1 AS first_number, 2 AS second_number";

/** What `beforeAll` created, so `afterAll` removes exactly that. */
const seededWorld: {
  workspaceId: string | undefined;
  datasetId: string | undefined;
  caseType: SeededCaseType | undefined;
} = { workspaceId: undefined, datasetId: undefined, caseType: undefined };

/** The bars a Recharts bar chart draws. */
function _getBars(scope: Locator): Locator {
  return scope.locator(".recharts-bar-rectangle path");
}

/** Picks an option in one of the wizard's pickers. */
async function _pickOption(
  options: Readonly<{
    page: Page;
    wizard: Locator;
    pickerName: string;
    optionName: string;
  }>,
): Promise<void> {
  const { page, wizard, pickerName, optionName } = options;
  await wizard
    .getByRole("combobox", { name: pickerName, exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/**
 * Binds the cases slot to the seeded case type on the wizard's Records page
 * and waits for the check to count every record.
 */
async function _chooseCaseRecords(
  options: Readonly<{ page: Page; wizard: Locator }>,
): Promise<void> {
  const { page, wizard } = options;
  await _pickOption({
    page,
    wizard,
    pickerName: "Case type or dataset",
    optionName: CASE_TYPE_NAME,
  });
  await _pickOption({
    page,
    wizard,
    pickerName: "Onset date",
    optionName: "onset_date",
  });
  await _pickOption({
    page,
    wizard,
    pickerName: "District",
    optionName: "district",
  });
  await expect(
    wizard.getByText(`${CASE_IDS.length} records`, { exact: true }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/**
 * Imports the line list through Data Sources in a browser context of its
 * own, recording the new dataset's id in `seededWorld` as soon as it exists.
 */
async function _importLineList(
  options: Readonly<{
    browser: Browser;
    baseURL: string | undefined;
    workspaceSlug: string;
    user: E2EWorkerCredentials;
  }>,
): Promise<void> {
  const { workspaceSlug, user } = options;
  const context = await options.browser.newContext({
    baseURL: options.baseURL,
    reducedMotion: "reduce",
  });
  await installDuckDbExtensionCache(context);
  try {
    const page = await context.newPage();
    await signInWithEmailPassword(page, { ...user, workspaceSlug });
    await importDatasetViaUi({
      page,
      filePath: CASE_LINE_LIST_CSV_PATH,
      expectedRowCount: CASE_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
      workspaceSlug,
      onDatasetCreated: (datasetId) => {
        seededWorld.datasetId = datasetId;
      },
    });
  } finally {
    await context.close();
  }
}

/**
 * Installs the plugin with its cases slot bound to the seeded case type,
 * and waits for the plugin's card to name that case type.
 */
async function _installBoundToCaseType(
  options: Readonly<{
    page: Page;
    workspaceSlug: string;
    onInstallStarted: () => void;
  }>,
): Promise<void> {
  const { page } = options;
  await installPluginThroughWizard(page, {
    workspaceSlug: options.workspaceSlug,
    pluginName: PLUGIN_NAME,
    chooseRecords: (wizard) => {
      return _chooseCaseRecords({ page, wizard });
    },
    onInstallStarted: options.onInstallStarted,
  });
  await expect(
    getPluginCard(page, PLUGIN_NAME).getByText(`Case type: ${CASE_TYPE_NAME}`, {
      exact: true,
    }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/** Opens the Data Explorer with a result on screen, so commands turn on. */
async function _showQueryResult(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  // The `?sql=` deep link stands in for typing the query: the editor is not
  // what this spec covers, and the command is still driven by clicks.
  await page.goto(
    `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(RESULT_SQL)}`,
  );
  await dismissBlockingOverlays(page);
  await expect(
    page.getByRole("columnheader", { name: "second_number", exact: true }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Runs the Case epicurve from the toolbar and checks its bars: one per
 * onset week, then one per week and district once stacked by district.
 */
async function _expectCaseEpicurveBars(page: Page): Promise<void> {
  await runPluginCommand(page, "Case epicurve");
  const dialog = page.getByRole("dialog", {
    name: "Case epicurve",
    exact: true,
  });
  const chart = dialog.getByRole("img", { name: "Case epicurve", exact: true });
  await expect(chart).toBeVisible({ timeout: LONG_WAIT });
  await expect(_getBars(chart)).toHaveCount(EPI_WEEK_COUNT);

  await dialog
    .getByRole("switch", { name: "Stack by district", exact: true })
    .click();
  await expect(dialog.locator(".recharts-legend-item-text")).toHaveText(
    DISTRICTS,
  );
  await expect(_getBars(chart)).toHaveCount(EPI_WEEK_COUNT * DISTRICTS.length);
}

/** Deletes the plugin's install, which deletes its binding with it. */
async function _deletePluginInstallation(
  options: Readonly<{ admin: AvaSupabaseDBClient; workspaceId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("plugin_installations")
    .delete()
    .eq("workspace_id", options.workspaceId)
    .eq("plugin_id", PLUGIN_ID);
  if (error) {
    console.warn(
      `[e2e] case slot plugin installation cleanup: ${error.message}`,
    );
  }
}

test.describe("Epidemiology plugin cases slot", () => {
  test.beforeAll(async ({ browser, e2eWorkerDb }, testInfo) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    seededWorld.workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    await _importLineList({
      browser,
      baseURL: testInfo.project.use.baseURL,
      workspaceSlug,
      user: primaryUser,
    });
    if (!seededWorld.datasetId) {
      throw new Error("The line list dataset was not created.");
    }
    seededWorld.caseType = await CaseTypeSeedHelpers.seedCaseTypeWithFields({
      supabaseAdminClient: admin,
      workspaceId: seededWorld.workspaceId,
      caseTypeName: CASE_TYPE_NAME,
      datasetId: seededWorld.datasetId,
      keyColumnName: "case_id",
      keyAttributeName: "case_id",
      fields: [
        { columnName: "onset_date", dataType: "date" },
        { columnName: "district", dataType: "varchar" },
      ],
      recordKeys: CASE_IDS,
    });
  });

  test.afterAll(async () => {
    const admin = createSupabaseAdminClient();
    if (seededWorld.caseType) {
      await CaseTypeSeedHelpers.deleteCaseType({
        supabaseAdminClient: admin,
        conceptId: seededWorld.caseType.conceptId,
      });
    }
    if (seededWorld.datasetId && seededWorld.workspaceId) {
      await deleteDatasetFixture({
        admin,
        datasetId: seededWorld.datasetId,
        workspaceId: seededWorld.workspaceId,
      });
    }
  });

  test("the Case epicurve charts the bound case type by onset week, stacked by district on request", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    // Set once Install is clicked in the install wizard, so cleanup never
    // deletes an install this spec did not make.
    let didInstall = false;
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installBoundToCaseType({
        page,
        workspaceSlug,
        onInstallStarted: () => {
          didInstall = true;
        },
      });

      await _showQueryResult({ page, workspaceSlug });
      await expect(
        page.getByRole("button", { name: "Plugins", exact: true }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await _expectCaseEpicurveBars(page);
    } finally {
      // Removes only the install this spec made.
      if (didInstall) {
        await _deletePluginInstallation({ admin, workspaceId });
      }
    }
  });
});
```

- [ ] **Step 5: Type check, format, lint**

Run:

```bash
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec oxfmt --ignore-path .oxfmtignore tests/e2e/plugins-epidemiology-case-slot.spec.ts tests/e2e/helpers/CaseTypeSeedHelpers.ts tests/e2e/helpers/constants.ts
pnpm exec eslint tests/e2e/plugins-epidemiology-case-slot.spec.ts tests/e2e/helpers/CaseTypeSeedHelpers.ts tests/e2e/helpers/constants.ts
```

Expected: no errors

- [ ] **Step 6: Run the spec**

Confirm the switch first:

```bash
node apps/ava-cli/dist/main.cjs supabase status
```

Expected: the first line names the switched project `feat-plugins-slots`.

Then run:

```bash
pnpm test:e2e plugins-epidemiology-case-slot.spec.ts
```

Expected: passes (1 test, after its `beforeAll` imports the line list and seeds the case type). This spec has never run, so this is its first real run. If it fails, read the trace and the failure screenshot under `test-results/` before changing anything. A check that never reaches `30 records`, or an epicurve that shows an alert instead of a chart, is a product bug in Tasks 13 to 20, not a selector to loosen.

- [ ] **Step 7: Commit**

```bash
git add tests/data/case-line-list/case-line-list.csv tests/e2e/helpers/constants.ts tests/e2e/helpers/CaseTypeSeedHelpers.ts tests/e2e/plugins-epidemiology-case-slot.spec.ts
git commit -m "test(plugins): chart a bound case type with the Case epicurve end to end" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- The fixture is 30 cases, `C001` to `C030`, in four MMWR weeks starting 2023-12-31 (6 cases), 2024-01-07 (10), 2024-01-14 (9), and 2024-01-21 (5), in Ilala (14), Kinondoni (10), and Temeke (6), with every week holding a case in every district. So the default epi-week chart draws exactly 4 bars, and stacked by district exactly 12 (no zero-height bar, which Recharts would not draw). The spec asserts those exact counts rather than "more than zero"; `plugins-epidemiology-epicurve.spec.ts` counts the same four weeks, with the same `.recharts-bar-rectangle path` locator, for onset dates from 2024-01-01 to 2024-01-21. Recharts 3 sorts legend items by name, so the legend reads `Ilala`, `Kinondoni`, `Temeke`.
- Setup follows `case-bucketed-fields.spec.ts`: the line list is imported through the UI in `beforeAll`, in a browser context of its own, and the case type is seeded with the admin client right after, before the test's own session loads (the case type list is cached for minutes once loaded). The case type has a `case_id` key and two single-value fields, `onset_date` (`date`) and `district` (`varchar`), each named after its column and keeping its first value, with one record per case id: a case type view has one row per record, so all 30 ids must be seeded for the check to count 30.
- Concept attributes allow `date` (`datasets__ava_data_type`), and only a per-period field's bucket column is type-checked against the dataset column, so the seeder needs no other change. The field's dataset column is a real `DATE` because DuckDB sniffs `YYYY-MM-DD`.
- No helper in `dataExplorerFlow.ts` shows a literal result: `runSqlOverDataset` needs a dataset source and eight UI steps. The spec uses the `?sql=` deep link with `dismissBlockingOverlays`, as the other plugin specs do. Its query has two number columns so Linear regression and Incidence per 100k turn on too and the three commands collapse into `Plugins`, which the spec checks before running `Case epicurve`.
- Cleanup: the test deletes the install row when it clicked Install (its binding cascades), and `afterAll` deletes the case type (`deleteCaseType`; statuses and records cascade) and then the dataset (`deleteDatasetFixture`). A binding left behind would not block either delete: its `concept_id` and `dataset_id` are `on delete set null`.
- Timing: the test runs two DuckDB loads of the case type view (the wizard's check, then `querySlot` after the deep link's reload). The check waits up to `LONG_WAIT`. If the whole test runs close to the 45-second local limit, look for what is slow; do not raise the limit.
- Selectors and where they come from: source picker `combobox` `Case type or dataset` (`DataSlotPanel/DataSlotSourceSelect.tsx`); attribute pickers `combobox` `Onset date` and `District`, named by the attribute titles (`DataSlotPanel/DataSlotAttributeSelect.tsx`, titles from `plugins/epidemiology/locales/en.json`); options by the case type's and its attributes' names (Mantine `option`); `30 records` (`DataSlotCheckPreview/DataSlotCheckSummary.tsx`); card line `Case type: E2E plugin cases` (`PluginDataSlotsSection/PluginDataSlotRow.tsx` with `useDataSlotSourceLabels.ts`); `Plugins` (`src/lib/plugins/PluginMenuSlot/PluginOverflowMenu.tsx`); `menuitem` `Case epicurve` and dialog `Case epicurve` (`plugins/epidemiology/src/index.tsx`, `cases.epicurve.title`); chart `img` `Case epicurve` (`plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/CaseEpicurveChart.tsx`: `role="img"` and `title` land on the Recharts `<svg>` and its `<title>`); `switch` `Stack by district` (`CaseEpicurveControls.tsx`); `.recharts-bar-rectangle path` and `.recharts-legend-item-text` (Recharts 3.8 markup).

---

### Task 24: Restore `pnpm check:plugin-bundle`

**Design note:** The generated `loadContentUrls` dynamically imports one generated module per plugin, `virtual:ava-plugin-content/<plugin id>` (new prefix `PLUGIN_CONTENT_MODULE_PREFIX` in `scripts/vite-plugin-ava-plugins/pluginModuleIds.ts`), which statically imports each file with `?url` and default-exports the URLs keyed by content id. `PluginIndexEntry.loadContentUrls` keeps its type and behaviour. Also new: `src/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler.ts` exports `invokePluginAiToolHandler`, which is `runDataAgentTurn.ts`'s former private `_invokePluginAiTool`, moved so the chat reaches the plugin SDK and `makePluginApi` through one lazy runtime module.

**Goal:** `pnpm check:plugin-bundle` passes again. The chat's plugin AI tool runtime counts as a lazy runtime, the generated plugin index shrinks, and `HOST_BUDGET_BYTES` is re-baselined by the rule the check already documents (measured bytes rounded up to the next 1,000, plus 2,000).

**Files:**
- Modify: `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts` (two lazy runtime markers, content modules must be plugin-only, new budget) and its test `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`
- Create: `src/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler.ts`
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts` (imports the handler caller lazily instead of the SDK, module cache, index helpers, and `makePluginApi` one by one)
- Modify: `scripts/vite-plugin-ava-plugins/pluginModuleIds.ts` (`PLUGIN_CONTENT_MODULE_PREFIX`)
- Modify: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts` (`makeContentModuleSourceFromPlugin`, one-line `loadContentUrls`) and its test `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`
- Modify: `scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins.ts` (resolves and loads the content module)

**Depends on:** every code task before it (2-20), because the budget is measured on the finished slice: Task 5 (the `loadContentUrls` generator this task replaces), Task 9 (the Mozambique pack, the second bundled plugin), Task 19 (`makePluginApi` and `fetchRowsForInvocation` changes, now lazy), Task 19 (no admin check in `usePluginCommandRunner`; the binding modal from Task 18 does it). Tasks 21-23 change only `tests/e2e/` and do not move the numbers.

- [ ] **Step 1: Record the failing check**

Run: `pnpm check:plugin-bundle`
Expected: FAIL (about 40 seconds), `The plugin host adds 60258 bytes to chunks the app can load without any plugin, over its 40200 byte budget.` The budget is `HOST_BUDGET_BYTES` (39,000) plus 600 for each of the two bundled plugins. A few bytes either way is fine; what matters is the size of each drop below.

- [ ] **Step 2: Write the failing tests for the chat's lazy runtime**

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`, add two module constants directly above `const PLUGINS_DIRECTORY = "/repo/plugins";`:

```ts
const AI_TOOL_HANDLER_MODULE =
  "/repo/src/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler.ts";
const AI_TOOL_RUNNER_MODULE =
  "/repo/src/lib/plugins/runPluginAiTool/runPluginAiTool.ts";
```

and add these tests directly before `it("leaves a chunk only the command runner and the chart runtime share out of the host budget", ...)`:

```ts
  it("leaves the chat's lazily loaded plugin AI tool runner out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "layout.js",
          imports: ["index.js", "plugin-index.js"],
          dynamicImports: ["runner.js", "chat-turn.js"],
          moduleLengths: { [PLUGIN_HOST_MODULE]: 4_000 },
        }),
        _chunk({
          fileName: "chat-turn.js",
          dynamicImports: ["ai-tool-runner.js"],
        }),
        _chunk({
          fileName: "ai-tool-runner.js",
          imports: ["sdk.js"],
          moduleLengths: { [AI_TOOL_RUNNER_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });

  it("leaves the chat's lazily loaded plugin AI tool handler, and the API it builds, out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "layout.js",
          imports: ["index.js", "plugin-index.js"],
          dynamicImports: ["runner.js", "chat-turn.js"],
          moduleLengths: { [PLUGIN_HOST_MODULE]: 4_000 },
        }),
        _chunk({
          fileName: "chat-turn.js",
          dynamicImports: ["ai-tool-handler.js"],
        }),
        _chunk({
          fileName: "ai-tool-handler.js",
          imports: ["sdk.js", "plugin-api.js"],
          moduleLengths: { [AI_TOOL_HANDLER_MODULE]: HOST_BUDGET_BYTES },
        }),
        _chunk({
          fileName: "plugin-api.js",
          moduleLengths: {
            "/repo/src/lib/plugins/makePluginApi/makePluginApi.tsx":
              HOST_BUDGET_BYTES,
          },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });

  it("counts the chat's plugin AI tool runner when a route imports it statically", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js", "ai-tool-runner.js"],
        }),
        _chunk({
          fileName: "ai-tool-runner.js",
          imports: ["sdk.js"],
          moduleLengths: { [AI_TOOL_RUNNER_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(
        `plugin host adds ${HOST_BUDGET_BYTES + 5_300} bytes`,
      ),
    ]);
  });
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle`
Expected: FAIL, 2 tests: `leaves the chat's lazily loaded plugin AI tool runner out of the host budget` (received `"The plugin host adds 44300 bytes to chunks the app can load without any plugin, over its 39600 byte budget."`) and `leaves the chat's lazily loaded plugin AI tool handler, and the API it builds, out of the host budget` (`... adds 83300 bytes ...`). `counts the chat's plugin AI tool runner when a route imports it statically` passes already: it guards that a marker never hides a statically imported chunk.

- [ ] **Step 4: Register the chat's plugin AI tool runtime as lazy**

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts`, replace the `LAZY_RUNTIME_MODULE_MARKERS` docstring and array with:

```ts
/**
 * The modules the lazily loaded plugin runtimes are found by: the command
 * runner, which loads when a user picks a command, the plugin chart runtime,
 * which loads when a plugin chart draws, and the chat's plugin AI tool
 * runner and handler caller, which load when the data agent calls a plugin
 * tool. The app reaches each only through a dynamic `import()`.
 */
const LAZY_RUNTIME_MODULE_MARKERS = [
  "/src/lib/plugins/runPluginCommand/runPluginCommand.ts",
  "/src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx",
  "/src/lib/plugins/runPluginAiTool/runPluginAiTool.ts",
  "/src/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler.ts",
];
```

and replace the `checkPluginBundle` docstring with:

```ts
/**
 * Checks that workspaces without plugins pay nothing for them. Every plugin
 * code, manifest, locale, or content module must sit in a plugin-only chunk:
 * one the app loads only through a plugin loader in
 * `virtual:ava-plugin-index`. The host modules in every other chunk, except
 * those only a lazily loaded runtime (the command runner, the plugin chart
 * runtime, or the chat's plugin AI tool runtime) reaches, must stay within
 * the host's byte budget. Returns one message per violation, for
 * `vitePluginAvaPlugins` to fail the build.
 *
 * `pluginsDirectory` must be a real, forward-slash absolute path without a
 * trailing slash, because Vite module ids are realpathed.
 */
```

(The "content module" wording is for Step 10; writing it now saves a second edit.)

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle`
Expected: PASS (24 tests)

- [ ] **Step 6: Move the chat's handler call into the lazy runtime module**

The chat imported `@avandar/plugin-sdk` (for `isPluginDefinition`), `makePluginModuleCache`, `pluginIndexHelpers`, and `makePluginApi` with four dynamic imports. The SDK's barrel chunk pulls five SDK modules (3,674 bytes) that nothing else at startup needs, and no marker can name a barrel honestly. One module that imports them statically, loaded with one dynamic import, is the runtime the marker names.

Create `src/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler.ts`:

```ts
import { isPluginDefinition } from "@avandar/plugin-sdk";
import { makePluginApi } from "@/lib/plugins/makePluginApi/makePluginApi";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { PluginAiToolArgs } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
import type { AgentToolContext, AvandarApi } from "@avandar/plugin-sdk";

/**
 * Loads a bundled plugin's code and calls the handler it declares for the
 * AI tool, with an `avandar` API that has no data slot members. Throws when
 * the plugin or the handler is missing, which the runner reports to the
 * model as a failed tool.
 *
 * Import it lazily, with a dynamic `import()` when the data agent calls a
 * plugin tool. It reaches the plugin SDK runtime and `makePluginApi`, which
 * `pnpm check:plugin-bundle` leaves out of the host budget only because
 * this module is one of its lazy runtimes.
 */
export async function invokePluginAiToolHandler(
  options: Readonly<{
    declaration: PluginAiToolDeclaration;
    context: AgentToolContext;
    args: PluginAiToolArgs;
    workspace: AvandarApi["workspace"];
  }>,
): Promise<unknown> {
  const { pluginId, name } = options.declaration;
  const entry = getPluginIndexEntry(pluginId);
  if (entry === undefined) {
    throw new Error(`Plugin "${pluginId}" is not bundled`);
  }
  const codeModule = await PluginModuleCache.loadCode(entry);
  const { definition } = codeModule;
  const handler =
    isPluginDefinition(definition) && Object.hasOwn(definition.aiTools, name)
      ? definition.aiTools[name]
      : undefined;
  if (typeof handler !== "function") {
    throw new Error(`Plugin "${pluginId}" has no AI tool "${name}"`);
  }
  const pluginApi = makePluginApi({
    pluginName: pluginId,
    context: options.context,
    workspace: options.workspace,
    messages: codeModule.messages,
  });
  return handler(pluginApi, options.args);
}
```

In `src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts`, delete the whole `_invokePluginAiTool` function and its docstring (from `/**` above `async function _invokePluginAiTool(` down to its closing `}`), and replace the `invoke` callback inside `_runConversationPluginAiTool` with:

```ts
    invoke: async (context, args) => {
      // The handler caller reaches the plugin SDK and `makePluginApi`, so it
      // loads on first use to keep them out of the agent's chunk.
      const { invokePluginAiToolHandler } =
        await import("@/lib/plugins/invokePluginAiToolHandler/invokePluginAiToolHandler");
      return invokePluginAiToolHandler({
        declaration: request.declaration,
        context,
        args,
        workspace: {
          id: turn.workspaceId,
          slug: turn.workspaceSlug ?? "",
          locale: i18n.locale,
        },
      });
    },
```

Then delete the imports only that function used:

```ts
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
```

```ts
import type { AgentToolContext, AvandarApi } from "@avandar/plugin-sdk";
```

and narrow the `createPluginAiTool` type import to:

```ts
import type { RunPluginAiTool } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
```

- [ ] **Step 7: Run the chat tests and confirm they still pass**

Run: `pnpm vitest run src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn`
Expected: PASS (24 tests). These call the agent's plugin tool runner with the real handler caller (only `pluginIndexHelpers` and `runPluginAiTool` are mocked), so they cover the moved code: the handler called with the plugin API and arguments, a plugin with no handler for the tool, a plugin that is not bundled, and an AI tool getting no data slot API.

- [ ] **Step 8: Measure what is still counted**

Run: `pnpm check:plugin-bundle`
Expected: FAIL, `The plugin host adds 40648 bytes ..., over its 40200 byte budget.` (60,258 before Steps 4-6.) What remains is startup host code; see the notes for the list. Of it, only the generated plugin index is cheap to shrink.

- [ ] **Step 9: Write the failing tests for one content module per plugin**

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`, add `makeContentModuleSourceFromPlugin` to the import:

```ts
import {
  makeContentModuleSourceFromPlugin,
  makeIndexModuleSourceFromPlugins,
  makeLocalesModuleSourceFromPlugin,
  makeManifestModuleSourceFromPlugin,
} from "./makePluginModuleSources";
```

replace the test `"gives a plugin with content a loadContentUrls that imports each file as a URL and keys it by content id"` with:

```ts
  it("gives a plugin with content a loadContentUrls that imports its content module once", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN_WITH_CONTENT],
      repoRoot: "/repo",
    });
    expect(code).toContain(
      '    loadContentUrls: () => import("virtual:ava-plugin-content/avandar.epidemiology").then((content) => content.default),',
    );
  });

  it("names no content file in the index", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN_WITH_CONTENT],
      repoRoot: "/repo",
    });
    expect(code).not.toContain(".csv");
  });
```

and add this block directly before `describe("makeLocalesModuleSourceFromPlugin", ...)`:

```ts
describe("makeContentModuleSourceFromPlugin", () => {
  it("imports each content file as a URL and exports the URLs keyed by content id", () => {
    expect(
      makeContentModuleSourceFromPlugin({
        plugin: PLUGIN_WITH_CONTENT,
        repoRoot: "/repo",
      }),
    ).toBe(
      [
        'import url0 from "/plugins/epidemiology/content/mz-adm1.csv?url";',
        'import url1 from "/plugins/epidemiology/content/mz-adm2.csv?url";',
        'export default { "provinces": url0, "districts": url1 };',
        "",
      ].join("\n"),
    );
  });
});

```

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`, add this test directly before `it("fails when the plugin host exceeds its budget", ...)`:

```ts
  it("fails when a plugin content module is statically reachable", () => {
    const violations = _checkChunks([
      _chunk({
        fileName: "index.js",
        isEntry: true,
        moduleLengths: {
          "\0virtual:ava-plugin-content/avandar.mozambique": 120,
        },
      }),
    ]);

    expect(violations).toEqual([
      expect.stringContaining("virtual:ava-plugin-content/avandar.mozambique"),
    ]);
  });
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: FAIL, 4 tests: `fails when a plugin content module is statically reachable` (`expected [] to deeply equal [ StringContaining{…} ]`), `gives a plugin with content a loadContentUrls that imports its content module once` and `names no content file in the index` (the index still imports each `.csv?url`), and `imports each content file as a URL and exports the URLs keyed by content id` (`TypeError: (0 , makeContentModuleSourceFromPlugin) is not a function`).

- [ ] **Step 11: Generate one content module per plugin**

Append to `scripts/vite-plugin-ava-plugins/pluginModuleIds.ts`:

```ts

/** Prefix of the per-plugin content module: each content file's URL. */
export const PLUGIN_CONTENT_MODULE_PREFIX = "virtual:ava-plugin-content/";
```

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts`, add `PLUGIN_CONTENT_MODULE_PREFIX` to the `../pluginModuleIds` import:

```ts
import {
  PLUGIN_CONTENT_MODULE_PREFIX,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "../pluginModuleIds";
```

replace the whole `_makeLoadContentUrlsSourceLinesFromPlugin` function with:

```ts
// One import of the plugin's content module, however many files it has,
// keeps the entry short, since the index loads at startup. `.then` rather
// than `(await import(...)).default`, which Vite rewrites into longer code.
function _makeLoadContentUrlsSourceLinesFromPlugin(
  plugin: PluginDirectory,
): string[] {
  if (Object.keys(plugin.contentPathsById).length === 0) {
    return [];
  }
  const contentModuleId = `${PLUGIN_CONTENT_MODULE_PREFIX}${plugin.compiled.manifest.id}`;
  return [
    `    loadContentUrls: () => import(${JSON.stringify(contentModuleId)}).then((content) => content.default),`,
  ];
}
```

in `_makeIndexEntrySourceFromPlugin`, pass it the plugin only:

```ts
    ..._makeLoadContentUrlsSourceLinesFromPlugin(options.plugin),
```

replace the docstring of `makeIndexModuleSourceFromPlugins` with:

```ts
/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. A plugin with no entry gets a
 * `loadCode` that loads only its locales and returns a definition with no
 * handlers, and a plugin with content gets a `loadContentUrls` that loads
 * its `virtual:ava-plugin-content/<id>` module. It must contain no static
 * imports, so the main bundle carries only these few bytes per plugin.
 * `vitePluginAvaPlugins`'s `load` hook calls it.
 */
```

and add this function directly before the docstring of `makeLocalesModuleSourceFromPlugin`:

```ts
/**
 * Source for `virtual:ava-plugin-content/<id>`: each content file's URL,
 * keyed by content id. `?url` makes Vite emit each file as an asset and
 * import only its URL (a file under Vite's asset inline limit becomes a data
 * URL here instead), so no file downloads until an import fetches it.
 * `vitePluginAvaPlugins`'s `load` hook calls it.
 */
export function makeContentModuleSourceFromPlugin(options: {
  plugin: PluginDirectory;
  repoRoot: string;
}): string {
  const { plugin, repoRoot } = options;
  const contentEntries = Object.entries(plugin.contentPathsById);
  const importLines = contentEntries.map(([, path], index) => {
    const rootRelativePath = _makeRootRelativePathFromPath({ path, repoRoot });
    return `import url${index} from ${JSON.stringify(`${rootRelativePath}?url`)};`;
  });
  const urlProperties = contentEntries.map(([contentId], index) => {
    return `${JSON.stringify(contentId)}: url${index}`;
  });
  return [
    ...importLines,
    `export default { ${urlProperties.join(", ")} };`,
    "",
  ].join("\n");
}
```

In `scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins.ts`, add `makeContentModuleSourceFromPlugin` to the `./makePluginModuleSources/makePluginModuleSources` import and `PLUGIN_CONTENT_MODULE_PREFIX` to the `./pluginModuleIds` import (both alphabetical, first in their lists), replace `_isPluginVirtualId` with:

```ts
function _isPluginVirtualId(id: string): boolean {
  return (
    id === PLUGIN_INDEX_MODULE_ID ||
    id.startsWith(PLUGIN_MANIFEST_MODULE_PREFIX) ||
    id.startsWith(PLUGIN_LOCALES_MODULE_PREFIX) ||
    id.startsWith(PLUGIN_CONTENT_MODULE_PREFIX)
  );
}
```

and in `_loadVirtualModule`, add this branch after the locales branch, before `return null;`:

```ts
  if (id.startsWith(PLUGIN_CONTENT_MODULE_PREFIX)) {
    const pluginId = id.slice(PLUGIN_CONTENT_MODULE_PREFIX.length);
    return makeContentModuleSourceFromPlugin({
      plugin: _findPluginOrFail({ pluginId, plugins, context }),
      repoRoot,
    });
  }
```

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts`, add `PLUGIN_CONTENT_MODULE_PREFIX` to the `../pluginModuleIds` import (first in the list) and replace `_isLazyPluginModule` with:

```ts
function _isLazyPluginModule(
  moduleId: string,
  pluginsDirectory: string,
): boolean {
  return (
    moduleId.startsWith(`${pluginsDirectory}/`) ||
    moduleId.startsWith(`\0${PLUGIN_MANIFEST_MODULE_PREFIX}`) ||
    moduleId.startsWith(`\0${PLUGIN_LOCALES_MODULE_PREFIX}`) ||
    moduleId.startsWith(`\0${PLUGIN_CONTENT_MODULE_PREFIX}`)
  );
}
```

- [ ] **Step 12: Run the tests and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: PASS (40 tests in 3 files)

- [ ] **Step 13: Measure again**

Run: `pnpm check:plugin-bundle`
Expected: FAIL, `The plugin host adds 40429 bytes ..., over its 40200 byte budget.` The plugin index went from 1,383 to 1,164 rendered bytes: Mozambique's `loadContentUrls` went from 378 to 159.

- [ ] **Step 14: Re-baseline the host budget**

40,429 rounded up to the next 1,000 is 41,000; plus 2,000 is 43,000. In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts`, replace the `HOST_BUDGET_BYTES` docstring and value with:

```ts
/**
 * Rendered bytes of host code a workspace without plugins may load. Measured
 * at 40,429 bytes with two bundled plugins (one with code, one with only
 * datasets), plugin charts drawing in the Data Explorer and on dashboards,
 * and the Data Explorer keeping its result for plugin AI tools, rounded up
 * to the next 1,000 bytes, plus 2,000 of headroom. The chat's plugin AI tool
 * runtime loads only when the data agent calls a plugin tool, so it is a
 * lazy runtime and not part of the measurement.
 */
export const HOST_BUDGET_BYTES = 43_000;
```

Run: `pnpm check:plugin-bundle`
Expected: PASS: `✓ built in ...`, exit code 0, no `Plugin bundle check failed`. The budget is now 44,200 (43,000 plus 600 for each of two plugins), 3,771 bytes above the measurement.

- [ ] **Step 15: Run every touched suite, type check, format, lint**

Run:
```bash
pnpm vitest run scripts/vite-plugin-ava-plugins src/components/ChatPanel/useAvandarChatRuntime src/lib/plugins src/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent
pnpm exec tsc -b --force
pnpm exec oxfmt --ignore-path .oxfmtignore scripts/vite-plugin-ava-plugins src/lib/plugins/invokePluginAiToolHandler src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts
pnpm exec eslint scripts/vite-plugin-ava-plugins src/lib/plugins/invokePluginAiToolHandler src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts
```
Expected: PASS (754 tests in 78 files); no type errors (an unused import left in `runDataAgentTurn.ts` shows up here as TS6133/TS6192, which ESLint does not catch); no lint errors.

- [ ] **Step 16: Commit**

```bash
git add scripts/vite-plugin-ava-plugins src/lib/plugins/invokePluginAiToolHandler src/components/ChatPanel/useAvandarChatRuntime/runDataAgentTurn/runDataAgentTurn.ts
git commit -m "fix(plugins): restore the plugin bundle check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- `pnpm check:plugin-bundle` runs `vite build` into `node_modules/.tmp/plugin-bundle-check` with `AVA_PLUGIN_BUNDLE_CHECK=1`; it takes about 40 seconds. When it fails, the build writes no output files.
- Measured host bytes on the finished slice: 60,258 at the start; 44,322 if only `runPluginAiTool.ts` and `makePluginApi.tsx` were markers (the chat's `import("@avandar/plugin-sdk")` still counted `makePluginTranslator` 1,543, `AvandarContext` 1,012, `definePlugin` 536, `PluginVizContext` 432, and `PluginError` 151); 40,648 with the handler caller module and its marker (Steps 4-6); 40,429 with the content module (Step 11).
- What is still counted, largest first (bytes): `PluginVizConfiguredChart.tsx` 3,036; `usePluginCommandRunner.ts` 2,717; `evaluateWhenCondition.ts` 2,631; `usePluginVizCode.ts` 2,333; `PluginHost.tsx` 2,288; `PluginVizPlaceholder.tsx` 2,281; `usePluginVizType.ts` 1,976; `PluginVizTransformChart.tsx` 1,684; `getMenuItemsFromActivePlugins.ts` 1,432; `QueryHandleRegistry.ts` 1,289; `PluginDrawerStore.ts` 1,272; `getLocalizedTextFromManifestStrings.ts` 1,201; `virtual:ava-plugin-index` 1,164; `PluginOverflowMenu.tsx` 1,102; then 27 modules under 1,000 bytes. Each is startup code a route, the workspace layout, or a chart needs before any plugin runs, so none was cheap to move. Only the generated index changed.
- The Mozambique entry in the index is 440 rendered bytes, under its 600-byte per-plugin allowance. The rest of the rise from the old 39,000 is startup code that was already over budget before this slice (the Data Explorer's plugin result store, 388 bytes), hidden because the chat runtime made the check fail anyway.
- Vite rewrites `(await import(x)).default` into a longer destructuring wrapper (`const {default: __vite_default__} = await import(...)`), which is why the generated `loadContentUrls` uses `.then((content) => content.default)`.
- The content module is a plugin-only chunk (122 bytes in the build: two URL constants and the map). Each CSV stays its own asset (`mz-adm1-*.csv` 336,346 bytes, `mz-adm2-*.csv` 907,996 bytes) and downloads only when an import fetches its URL. The two tiny per-file JavaScript chunks the old `loadContentUrls` produced are gone. The service worker precaches `js,css,html,ico,png,svg,woff2` only, so it never precaches the CSVs.
- A marker can never hide startup code: `_getLazyRuntimeOnlyFileNames` still counts any runtime chunk that a counted chunk imports statically (the new test `counts the chat's plugin AI tool runner when a route imports it statically` guards that).
- `invokePluginAiToolHandler` has no test file of its own: `runDataAgentTurn.test.ts` drives it through the agent's `runPluginAiTool` request (`request.invoke`), with the real module cache and `makePluginApi`.

---

### Task 25: Docs: data slots, bundled datasets, and no-code plugins in `docs/plugin-authoring.md`

**Goal:** A plugin author can declare and read a data slot, bundle datasets, and ship a plugin with no code, using only `docs/plugin-authoring.md`. The guide's existing tables list the new permission, API members, error codes, allowlisted components, and validator behaviour.

**Files:**
- Modify: `docs/plugin-authoring.md` (new sections 13 "Read records an admin chooses" and 14 "Bundle datasets"; edits to the intro and sections 3, 5, 8, 10, 11, 12, and "Rules to keep in mind")

No new doc file, so the repo's `CLAUDE.md` Documentation list does not change.

**Depends on:** every code task, because the guide describes what they built: Task 2 (`dataSlots`, `data:slots`), Task 3 (`contributes.content`, optional `entry`, content file checks, `ava plugin validate` skipping `tsc` and `eslint`), Task 4 (reserved AI tool names), Task 6 (error codes, `QuerySlotResult`, `Bar`, `Switch`), Tasks 15-18 (wizard, card sections, binding modal copy, including the non-admin message in the modal), Task 19 (`querySlot`, `openDataSlotBinding`, slot handles in `fetchRows`), Task 20 (Case epicurve), Task 9 (the Mozambique pack).

- [ ] **Step 1: Confirm the guide does not cover this slice yet**

Run: `grep -c "querySlot\|contributes.content\|data:slots" docs/plugin-authoring.md`
Expected: `0`

- [ ] **Step 2: Edit the guide**

Apply these edits to `docs/plugin-authoring.md`, in order. Each "Replace" text appears exactly once in the file. The blocks are fenced with four backticks because they contain fenced code themselves; copy what is between the fences.

1. The intro: say what the guide now covers. Replace

````markdown
This guide shows how to add a bundled plugin that puts a command in the Data
Explorer toolbar or adds a chart type. It assumes a checkout of this repository
with dependencies installed, and the `ava` CLI on your `PATH` (run
`pnpm build:ava-cli` if it is not).
````

with

````markdown
This guide shows how to add a bundled plugin that puts a command in the Data
Explorer toolbar, adds a chart type, reads records an admin chooses for it, or
bundles datasets. It assumes a checkout of this repository with dependencies
installed, and the `ava` CLI on your `PATH` (run `pnpm build:ava-cli` if it is
not).
````

2. The design background list: add the data slots spec. Replace

````markdown
Design background:
`docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`, and
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`. Package
````

with

````markdown
Design background:
`docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`,
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`, and
`docs/superpowers/specs/2026-11-11-plugins-1d-data-slots-design.md`. Package
````

3. Section 3, the manifest key table: the `entry` rule, the `permissions` list, and two new rows. Replace

````markdown
| `entry` | A relative `.ts` or `.tsx` path inside the plugin folder. The file must exist |
| `permissions` | A list of `data:context` and `query:addColumns` (see the API table in section 5) |
````

with

````markdown
| `entry` | A relative `.ts` or `.tsx` path inside the plugin folder. The file must exist. Required when the plugin contributes commands, chart types, or AI tools. A plugin that only bundles datasets leaves it out (see section 14) |
| `permissions` | A list of `data:context`, `query:addColumns`, and `data:slots` (see the API table in section 5) |
| `dataSlots` | Optional. The records the plugin reads, keyed by slot id (see section 13) |
| `contributes.content` | Optional. The datasets the plugin bundles (see section 14) |
````

4. Section 5, the API table: `fetchRows` reads slot handles too, and a `querySlot` row. Replace

````markdown
| `avandar.data.fetchRows(handle, { columns, limit })` | Resolves `{ rows, isTruncated }` for the invoked-on result, with only the requested columns. `limit` defaults to 50,000 and is clamped to at most 200,000. `isTruncated` is true when the result had more rows | `data:context` |
````

with

````markdown
| `avandar.data.fetchRows(handle, { columns, limit })` | Resolves `{ rows, isTruncated }` for the invoked-on result, or for a data slot `querySlot` read, with only the requested columns. `limit` defaults to 50,000 and is clamped to at most 200,000. `isTruncated` is true when the result had more rows | `data:context` |
| `avandar.data.querySlot(slotId)` | Reads the records an admin chose for one of the plugin's data slots and resolves `{ queryHandle, columns, rowCount, isTruncated }`. Commands only (see section 13) | `data:slots` |
````

5. Section 5, the API table: an `openDataSlotBinding` row after `closeModal`. Replace

````markdown
| `avandar.ui.closeModal()` | Closes the modal this invocation opened last. Does nothing when it opened none, or the user already closed it | none |
````

with

````markdown
| `avandar.ui.closeModal()` | Closes the modal this invocation opened last. Does nothing when it opened none, or the user already closed it | none |
| `avandar.ui.openDataSlotBinding(slotId)` | Opens the modal that chooses a data slot's records, and resolves when it closes. Commands only (see section 13) | `data:slots` |
````

6. Section 5, the paragraph under the table: which handles `fetchRows` accepts. Replace

````markdown
`fetchRows` accepts only the `queryHandle` of the current invocation. Any other
handle rejects with a `PluginError` coded `PermissionDenied`, and a result that
is no longer available rejects with `InvalidHandle`.
````

with

````markdown
`fetchRows` accepts only the `queryHandle` of the current invocation, or a
handle `querySlot` returned during the same invocation. Any other handle
rejects with a `PluginError` coded `PermissionDenied`, and a result that is no
longer available rejects with `InvalidHandle`.
````

7. Section 8, the `@avandar/plugin-ui/charts` table: `Bar`. Replace

````markdown
| `ComposedChart`, `Scatter`, `ErrorBar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`, `Legend` | Recharts building blocks |
````

with

````markdown
| `ComposedChart`, `Bar`, `Scatter`, `ErrorBar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`, `Legend` | Recharts building blocks |
````

8. Section 10, the allowlist paragraph: `Switch`, and charts in command UI. Replace

````markdown
Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`,
`SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, and `Title`, and draw
component charts only from `@avandar/plugin-ui/charts`. Every API call is async
or fire-and-forget and passes serializable data, with three exceptions: the
synchronous `i18n.t`, the React `content` of `openModal` and `openDrawer`, and
chart components, which are React components too.
````

with

````markdown
Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `SegmentedControl`, `Select`,
`SimpleGrid`, `Stack`, `Switch`, `Table`, `Text`, `TextInput`, and `Title`, and
draw charts only from `@avandar/plugin-ui/charts`, in a chart component or in
command UI such as a modal. Every API call is async or fire-and-forget and
passes serializable data, with three exceptions: the synchronous `i18n.t`, the
React `content` of `openModal` and `openDrawer`, and chart components, which
are React components too.
````

9. Section 11: content files in the manifest checks, and no `tsc` or `eslint` without code. Replace

````markdown
1. The manifest checks: `ava.yaml` against the schema, locale files, the
   referenced `%key%` strings, the entry file, Tabler icons, and `package.json`
   dependencies.
2. `tsc` on `plugins/<name>/tsconfig.json`.
3. `eslint` on `plugins/<name>`.

Steps 2 and 3 are skipped when step 1 fails. The command exits nonzero when any
plugin fails, so CI can use it.
````

with

````markdown
1. The manifest checks: `ava.yaml` against the schema, locale files, the
   referenced `%key%` strings, the entry file, each content file (it exists
   and is at most 1 MB), Tabler icons, and `package.json` dependencies.
2. `tsc` on `plugins/<name>/tsconfig.json`.
3. `eslint` on `plugins/<name>`.

Steps 2 and 3 are skipped when step 1 fails, and for a plugin with no `entry`,
which has no code to check: the command prints
`No plugin code, skipping tsc and eslint.` instead. The command exits nonzero
when any plugin fails, so CI can use it.
````

10. Section 12, step 1: reserved AI tool names. Replace

````markdown
1. Declare it under `contributes.aiTools` in `ava.yaml`. Each tool has a
   `name`, a plain-text `description` the model sees, and `parameters`.
````

with

````markdown
1. Declare it under `contributes.aiTools` in `ava.yaml`. Each tool has a
   `name`, a plain-text `description` the model sees, and `parameters`. A
   `name` may not match a built-in tool's name (`run_query`, `lookup_values`,
   or `ask_user`) once both are lowercased with underscores removed, so
   `runQuery` and `askUser` fail validation too.
````

11. Section 12, the paragraph about where a tool runs: no data slots for tools. Replace

````markdown
The tool runs only when the plugin's install status is `installed`, and only on
the hosted data agent.
````

with

````markdown
The tool runs only when the plugin's install status is `installed`, and only on
the hosted data agent. A tool handler's `avandar` has no `querySlot` or
`openDataSlotBinding` (see section 13).
````

12. New sections 13 and 14, directly before `## Rules to keep in mind`:

````markdown
## 13. Read records an admin chooses

A command can read workspace records nobody opened for it, such as every case
of a case type, through a **data slot**. The manifest declares the shape of
the records the plugin needs, and a settings admin binds the slot to a case
type or a dataset, attribute by attribute. The binding is the permission
grant: the plugin reads only the fields the admin chose, under its own
attribute names.

Declare slots under the top-level `dataSlots` key, and list `data:slots` in
`permissions`:

```yaml
permissions:
  - data:slots
dataSlots:
  cases:
    title: "%slot.cases.title%"
    description: "%slot.cases.description%"
    concept: Case
    required: false
    attributes:
      onsetDate:
        type: date
        title: "%slot.cases.onsetDate%"
      district:
        type: geo.admin2
        title: "%slot.cases.district%"
        required: false
```

| Key | Rule |
| --- | --- |
| Slot id | A letter, then letters and digits, such as `cases`. Unique within the plugin. `querySlot` takes it |
| `title` | A `%key%` reference |
| `description` | Optional `%key%` reference, shown above the slot's fields |
| `concept` | Optional. A case type name the install wizard lists first, compared without case. A hint, not a requirement |
| `required` | Optional, `false` by default. A required slot must be bound before Install. An optional slot can be skipped and bound later |
| `attributes` | At least one, keyed by attribute key: a letter, then letters and digits. Each key names a column `querySlot` returns |
| `attributes.<key>.type` | One of the types below |
| `attributes.<key>.title` | A `%key%` reference |
| `attributes.<key>.required` | Optional, `true` by default. A binding must map every required attribute |

| `type` | Binds to fields of type | The admin reads |
| --- | --- | --- |
| `number` | whole number (`bigint`) or decimal (`double`) | Number |
| `date` | `date` or `timestamp` | Date |
| `text` | text (`varchar`) | Text |
| `boolean` | `boolean` | Yes / no |
| `geo.admin1` | text (`varchar`) | Province or region, name or code |
| `geo.admin2` | text (`varchar`) | District, name or code |

A manifest that declares `dataSlots` must list `data:slots` in `permissions`,
and one that lists `data:slots` must declare at least one slot. The geo types
only change the admin's labels: Avandar does not check the values against
known boundaries.

### Binding a slot

The Install button opens a wizard with the steps a manifest needs: Review,
Records (when it declares `dataSlots`), Datasets (when it declares
`contributes.content`), and Confirm. On the Records step, the admin picks a
case type or a dataset for each slot, case types whose name matches `concept`
first, then a field for each attribute. Each attribute lists only the fields
whose type fits it. Once every required attribute has a field, the wizard
checks the records: how many there are, how many have a value for each
attribute, and the first 5 rows. An optional slot has **Skip for now**, and a
required slot keeps **Next** disabled until it is bound. Install saves the
installation and its bindings together.

After install, the plugin's card in Settings → Plugins lists its slots under
"Records it reads", each with its source, such as "Case type: Measles cases",
and its status: Bound, Not bound, or Broken with the reason. A binding breaks
when its case type or dataset is deleted, a chosen field is deleted or changes
to a type the attribute does not accept, or a required attribute has no field.
Settings admins can choose or change a slot's records there, and remove them
from an optional slot. An admin who approves `data:slots` under "Review new
permissions" binds the slots from the card. Uninstalling the plugin deletes
its bindings.

### Reading a slot

```ts
const { querySlot } = avandar.data;
if (querySlot === undefined) {
  return;
}
const slot = await querySlot("cases");
const { rows } = await avandar.data.fetchRows(slot.queryHandle, {
  columns: ["onsetDate", "district"],
  limit: slot.rowCount,
});
```

`querySlot(slotId)` resolves:

| Field | Meaning |
| --- | --- |
| `queryHandle` | A handle `fetchRows` accepts for the rest of this invocation, and in no other |
| `columns` | One `{ name, dataType }` per attribute, in manifest order, named by attribute key. `dataType` is the bound field's type. An unmapped optional attribute is `null` in every row, and its `dataType` follows its attribute type: `double` for `number`, `date` for `date`, `boolean` for `boolean`, and `varchar` for the rest |
| `rowCount` | The records read, at most 200,000 |
| `isTruncated` | True when the slot holds more than 200,000 records |

Avandar builds the query from the binding and runs it in the browser's DuckDB
with the current user's access, so no record leaves the device and nobody
reads records they could not already read. The plugin sees only its own
attribute keys, never the workspace's field names. `fetchRows` reads 50,000
rows unless told otherwise, so pass `limit: slot.rowCount` to read them all.

`querySlot` rejects with a `PluginError`:

| `code` | When |
| --- | --- |
| `InvalidSlot` | The manifest declares no data slot with that id |
| `SlotNotBound` | Nobody has chosen the slot's records yet |
| `SlotBroken` | The binding no longer fits the slot. The message names the attribute key and the reason, never a value |
| `PermissionDenied` | The current user cannot read the bound case type or dataset |

`avandar.ui.openDataSlotBinding(slotId)` opens a modal titled "Choose records
for *slot title*", the same one the card's Choose and Change buttons open. A
settings admin chooses the records there and saves them. Anyone else reads
"Ask a workspace admin to choose which records this plugin reads." and a
Close button. It resolves when the modal closes, saved or not, so a command
can call `querySlot` again then. A slot id the manifest does not declare
rejects with `InvalidSlot`. The epidemiology plugin's Case epicurve does both:
on `SlotNotBound` or `SlotBroken` it shows an alert with a "Choose records"
button, then reads the slot again
(`plugins/epidemiology/src/caseEpicurve/CaseEpicurveModal/useCaseSlotRows.ts`).

Only commands get data slots. An AI tool handler's and a chart's `avandar`
have no `querySlot` or `openDataSlotBinding`, because a tool that aggregates
every bound record without anyone looking at it needs its own privacy review.

Records a slot returns are workspace data the admin shared with the plugin for
the person running it. Show them to that person, or aggregate them, as the
Case epicurve does. Never send a value anywhere else: not in a network
request, not into browser storage or a URL, and not into SQL a command adds to
a query.

## 14. Bundle datasets

A plugin can bundle CSV files that installing it imports as ordinary
workspace datasets, such as a country's district boundaries. Such a plugin
needs no code. The Mozambique pack is a manifest, a `package.json`, a locale
file, and two CSV files:

```text
plugins/mozambique/
  ava.yaml            no entry, no permissions, contributes.content
  package.json        name, version, private, license, and type; no dependencies
  locales/en.json
  content/mz-adm1.csv
  content/mz-adm2.csv
```

A plugin with no commands, chart types, or AI tools leaves out `entry`,
`src/`, and `tsconfig.json`. Its `package.json` is still required. Declare
each file under `contributes.content`:

```yaml
license: CC-BY-3.0-IGO
contributes:
  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/mz-adm1.csv
```

| Key | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, and hyphens in dot-separated words, like a command id. Unique within the plugin. Keep it stable: it is how a workspace remembers what it already imported |
| `kind` | `dataset`, the only kind |
| `title`, `description` | `%key%` references. They become the dataset's name and description, in the language of the admin who installs it |
| `file` | A relative path to a `.csv` file inside the plugin folder, made of letters, digits, `_`, `-`, `.`, and `/`. It must not start with `/` or contain `..`. The file must exist and be at most 1 MB (1,048,576 bytes) |

A content file goes through the same import as a CSV uploaded in Data
Manager: DuckDB detects the delimiter, the header row, and each column's type.
Give it a header row. For map boundaries, add a geometry column as WKT text in
longitude and latitude (EPSG:4326), and GIS offers the dataset as boundaries
with no other setup. Commit the script that builds the files, as
`scripts/plugins/buildMozambiqueBoundaries.ts` does for the Mozambique pack.

None of the files downloads until an admin imports it. Installing the plugin
works like this:

1. The wizard's Datasets step lists each item, every one checked to start
   with. An item this workspace already imported shows "Already in this
   workspace" and is not imported again.
2. After Install, the Confirm step imports the checked items one at a time,
   each showing Waiting, Importing, Imported, or "Failed: *reason*" with a
   Retry button. A failure stops that item only, and the install stands. Done
   stays disabled until the imports finish.
3. Importing needs the right to create datasets. Without it, each item fails
   with that reason.

After install, the plugin's card lists its items under "Datasets it includes",
each linked to its dataset once imported, with Import for an item that is
missing and Retry for one that failed. Uninstalling the plugin keeps the
datasets. Deleting an imported dataset lets the item be imported again.

The description is where workspace members see where the data came from, so
credit its source and license there, and set the manifest's `license` and
`package.json`'s `license` to the data's license. The Mozambique pack's
descriptions name INE and OCHA through geoBoundaries, under CC BY 3.0 IGO.
````

13. Rules to keep in mind, the permissions bullet: add `data:slots`. Replace

````markdown
  enforce them: bundled plugins run in-process. Declare `data:context`
  whenever the plugin calls `fetchRows`, and `query:addColumns` whenever it
  calls `avandar.dataExplorer.addColumns`, so the manifest states what the
  plugin does.
````

with

````markdown
  enforce them: bundled plugins run in-process. Declare `data:context`
  whenever the plugin calls `fetchRows`, `query:addColumns` whenever it
  calls `avandar.dataExplorer.addColumns`, and `data:slots` whenever it
  declares `dataSlots` (the manifest fails without it), so the manifest states
  what the plugin does.
````

14. Rules to keep in mind: a new bullet after the chart type ids bullet. Replace

````markdown
- **Keep chart type ids and setting keys stable.** Dashboards and Data
  Explorer links store them. A renamed chart type id shows the missing-plugin
  placeholder wherever the old one was saved, and a renamed setting key loses
  that setting's value.
````

with

````markdown
- **Keep chart type ids and setting keys stable.** Dashboards and Data
  Explorer links store them. A renamed chart type id shows the missing-plugin
  placeholder wherever the old one was saved, and a renamed setting key loses
  that setting's value.
- **Keep data slot ids, attribute keys, and content ids stable.** Bindings
  store the slot id and attribute keys, so renaming one leaves the slot unbound
  or broken in every workspace. Workspaces remember imports by content id, so
  a renamed id imports the dataset a second time.
````

- [ ] **Step 3: Check the result**

Run:
```bash
grep -c "querySlot\|contributes.content\|data:slots" docs/plugin-authoring.md
grep -n "^## " docs/plugin-authoring.md
grep -n "—" docs/plugin-authoring.md
pnpm exec oxfmt --ignore-path .oxfmtignore docs/plugin-authoring.md
```
Expected: the first prints `25`; the headings run `## 1.` to `## 14.` and then `## Rules to keep in mind`; the em dash search prints nothing; oxfmt prints `Expected at least one target file. All matched files may have been excluded by ignore rules.` and exits 2, because `.oxfmtignore` excludes `*.md` on purpose (nothing reformats prose in `docs/`), so there is nothing to format.

- [ ] **Step 4: Read it through against the code**

Check each item, and fix the guide (not the code) where it disagrees:

- [ ] The slot key rules, attribute types, and the two `data:slots` pairing rules match `packages/shared/plugin-manifest/src/PluginManifest/PluginDataSlotSchema.ts` and `_refineDataSlots` in `PluginManifestSchema.ts`.
- [ ] The type labels match `useDataSlotAttributeTypeLabels.ts` (`Number`, `Date`, `Text`, `Yes / no`, `Province or region, name or code`, `District, name or code`), and the accepted field types match `DATA_SLOT_ACCEPTED_DATA_TYPES` in `src/lib/pluginDataSlots/isDataTypeAcceptedBySlotAttribute/`.
- [ ] The wizard step names (`Review`, `Records`, `Datasets`, `Confirm`), `Skip for now`, `Next`, `Already in this workspace`, the statuses `Waiting`, `Importing`, `Imported`, `Failed: <reason>`, and `Retry` match the wizard under `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/` and `pluginContent/PluginContentImportStatusText.tsx`.
- [ ] The card headings `Records it reads` and `Datasets it includes`, the badges `Bound`, `Not bound`, `Broken`, and the source line `Case type: <name>` match `PluginSettingsCard/PluginDataSlotsSection/` and `PluginSettingsCard/PluginContentSection/`.
- [ ] The binding modal title `Choose records for <slot title>` and the non-admin text `Ask a workspace admin to choose which records this plugin reads.` with a `Close` button match `DataSlotBinding/openDataSlotBindingModal.tsx` and `DataSlotBinding/DataSlotBindingForm/DataSlotBindingAdminGate.tsx`.
- [ ] `QuerySlotResult`, the error codes, and "commands only" match `packages/web/plugin-sdk/src/PluginApi.types.ts` and `PluginError.ts`; the 200,000-row limit matches `QUERY_SLOT_MAX_ROWS`; the unmapped-attribute types match `UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE` in `src/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation.ts`.
- [ ] The content `id` and `file` rules and the 1,048,576-byte limit match `PluginContentSchema.ts` and `readPluginDirectory.ts`; the no-code `package.json` fields match `plugins/mozambique/package.json`.
- [ ] `No plugin code, skipping tsc and eslint.` matches `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.ts`.
- [ ] The reserved tool names match `RESERVED_AI_TOOL_NAMES` in `packages/shared/plugin-manifest/src/PluginManifest/makeComparableAiToolName.ts`.
- [ ] `Switch` and `Bar` appear in `packages/web/plugin-ui/src/index.ts` and `charts.ts`.
- [ ] No sentence names a roadmap slice or phase, and no new prose line is over 80 columns (tables and code are exempt, as elsewhere in the guide).

- [ ] **Step 5: Commit**

```bash
git add docs/plugin-authoring.md
git commit -m "docs(plugins): document data slots, bundled datasets, and no-code plugins" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**
- Sections 13 and 14 go after section 12, so no existing section number or cross-reference changes. Sections 3 and 5 point forward to them.
- The guide calls the wizard step "Records" and the card section "Records it reads", as the UI does; the code says "data slot". Keep that split: user-facing words in the UI's terms, code identifiers as they are.
- `openDataSlotBinding` opens the binding modal for everyone. The modal, not the command runtime, decides what the user sees (Task 18's `DataSlotBindingAdminGate`), so the guide says a non-admin reads the message inside the modal, not in a notification.
- The privacy paragraph at the end of section 13 is the spec's rule for slot records: show or aggregate, never send a value anywhere else. Keep it next to the API description, where an author reads it before writing a handler.

---

### Task 26: Whole-branch review, full verification, live eval, and handoff

**Goal:** Prove the slice is done by the spec's "Done when", with every check run
on its own, and leave a handoff for the next slice. Nothing is pushed or merged.

**Files:**
- Create: the retired plugins 1d handoff (use the actual date)
- Modify: whatever the review findings require

**Depends on:** Tasks 1 to 25.

- [ ] **Step 1: Whole-branch review**

Use the `requesting-code-review` skill on the whole branch diff against
`origin/demo/measles`. Ask the reviewer to try to break these claims, not just
read them:

1. `fetchRows` reads only the invocation's handle or a handle `querySlot`
   issued in the same invocation.
2. `querySlot` never returns rows the current user cannot read (dataset access,
   case type access), and a broken binding never leaks a cell value in its
   error message.
3. An AI tool handler cannot reach `querySlot` or `openDataSlotBinding`.
4. A non-admin cannot write a binding or an import row (RLS), and a binding
   cannot point at another workspace's case type or dataset (trigger).
5. A failing binding rolls back the whole install.
6. A corrupted plugin chart config cannot crash the dashboard editor.
7. A plugin AI tool cannot take a built-in tool's name in any casing.

Fix every Critical and Important finding, and the cheap Minor ones, each as its
own commit, then re-review the fixes.

- [ ] **Step 2: Sync with `demo/measles` again**

Run:

```bash
git fetch origin
git rev-list --left-right --count origin/demo/measles...HEAD
```

If the left number is not 0, merge `origin/demo/measles` as in Task 1, Step 1,
then `pnpm install --frozen-lockfile`. If measles added migrations, confirm the
switch (`node apps/ava-cli/dist/main.cjs supabase status`) and run
`pnpm db:reset`, then check that this slice's migration still sorts after
measles' newest one. If it does not, rename it to a later timestamp, and make
the matching change in `apps/desktop/migrations/`.

- [ ] **Step 3: Run every check on its own**

Run each command separately and record the result:

```bash
pnpm test:frontend
pnpm vitest run packages/shared/plugin-manifest packages/web/plugin-sdk packages/web/plugin-ui scripts/vite-plugin-ava-plugins plugins
pnpm test:executed src/lib/pluginDataSlots plugins
pnpm test:ava-cli
pnpm exec tsc -b --force
pnpm type-check:deno
pnpm exec eslint .
pnpm exec oxfmt --ignore-path .oxfmtignore --check $(git diff --name-only origin/demo/measles...HEAD -- '*.ts' '*.tsx' '*.json' '*.md' '*.yaml')
pnpm exec prettier --check $(git diff --name-only origin/demo/measles...HEAD -- '*.sql')
node apps/ava-cli/dist/main.cjs plugin validate
pnpm check:plugin-bundle
pnpm verify:packages
pnpm desktop:sqlite:check-migrations
pnpm i18n:extract && pnpm i18n:compile
```

Then confirm the switch and run the database tests:

```bash
node apps/ava-cli/dist/main.cjs supabase status
pnpm test:db
```

Expected: every command exits 0. `git status` after `i18n:extract` shows only
new `msgid`s for this slice's strings. A failure listed as pre-existing in
Task 1's baseline notes is reported, not fixed.

- [ ] **Step 4: Run the plugin E2Es one at a time**

Confirm the switch first. Then:

```bash
pnpm test:e2e plugins-mozambique-install.spec.ts
pnpm test:e2e plugins-epidemiology-case-slot.spec.ts
pnpm test:e2e plugins-epidemiology-regression.spec.ts
pnpm test:e2e plugins-epidemiology-incidence.spec.ts
pnpm test:e2e plugins-epidemiology-epicurve.spec.ts
```

Expected: each passes. Never run the whole E2E suite.

- [ ] **Step 5: Live AI eval against the 1c baseline**

The eval data is at `~/cleaned-test-data` (a symlink). Run:

```bash
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5 --questions R
pnpm vite-script scripts/ai-eval/runEval.ts -- --harness pi --model anthropic/claude-haiku-5.5
```

Expected: `R01` passes (the model calls `fitRegression` and states the slope),
and the default 45 score at least 42/45. If `R01` fails because the eval's
epidemiology install lacks `data:slots`, the eval harness grants permissions
from an older manifest: update it to grant the manifest's permissions and rerun.
Rerun any failed question three times before calling it a regression, and
compare against the 1c failures (H06, N02, N04).

- [ ] **Step 6: Check the done-when by hand**

With `pnpm dev` running on the switched stack, sign in with the seed user from
`seed/SeedData.ts`. Use headless Playwright MCP and save screenshots under
`.temp/feat-plugins-slots/`:

1. Settings → Plugins → Mozambique → Install. Both datasets import, appear in
   Data Manager, and the GIS boundary picker lists them.
2. Settings → Plugins → Epidemiology → Install, binding `cases` to a case type
   with a date field. In the Data Explorer, run any query, then Plugins → Case
   epicurve. Bars render.

Stop `pnpm dev` afterwards.

- [ ] **Step 7: Write the handoff**

Create the retired plugins 1d handoff in the shape of
the retired plugins 1c handoff: start-here steps, where
things stand, what 1d built (a table of area and path), where it left off,
open follow-ups (including the two from 1c and 1b that this slice closed), what
comes next (1e), the environment (switched project `feat-plugins-slots` and its
ports), and a kickoff prompt.

- [ ] **Step 8: Commit**

```bash
git add the retired plugins 1d handoff
git commit -m "docs(plugins): hand off the plugin work after slice 1d" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Notes for the implementer:**

- Do not push and do not merge. Pablo asks for those explicitly, each time. A
  push to `demo/**` deploys.
- The pre-push hook translates new strings with an LLM and formats files. That
  only matters when Pablo asks for a push.
- Do not rebuild the global `ava` link.

---

## Spec coverage

| Spec requirement | Task |
| --- | --- |
| `dataSlots` manifest key, attribute types, `data:slots` pairing, locale keys | 2 |
| `contributes.content`, CSV and 1 MB rules, optional `entry` | 3 |
| Reserved built-in tool names in any casing, drift test against `DATA_AGENT_TOOLS` | 4 |
| Lazy content asset URLs, no-code plugin loading | 3, 5, 24 |
| `QuerySlotResult`, `SlotNotBound`, `SlotBroken`, `InvalidSlot`, `Bar`, `Switch` | 6 |
| Corrupted plugin chart config shows a reset instead of crashing | 7 |
| Mozambique data from gbHumanitarian, simplified under 1 MB, every district placed | 8 |
| Mozambique pack with no code, bundled, validated | 9 |
| `plugin_data_slot_bindings`, `plugin_content_imports`, workspace checks, RLS, both RPCs, desktop exclusion | 10 |
| RLS, rollback, survive-uninstall, and upsert tests | 11 |
| Models and clients, `install` and `saveBinding` mutations | 12 |
| Accepted data types, slot sources, binding status | 13 |
| Slot SQL with typed nulls, query runner with user access, check preview queries | 14 |
| Wizard with only the steps a manifest needs, Review, Confirm, install RPC | 15 |
| Data slots step: source picker, compatible fields, required logic, Skip for now, check preview | 16 |
| Content step, CSV import path, rollback of a half-imported dataset, per-item progress and Retry, dataset list refresh | 17 |
| Card Records and Datasets sections, Change, Remove, Import, Retry, binding modal with its own admin check | 18 |
| `querySlot`, per-invocation slot handles in `fetchRows`, `openDataSlotBinding`, commands only | 19 |
| Epidemiology `cases` slot and the Case epicurve | 20 |
| Install through the wizard in E2E, toolbar collapsing into Plugins | 21 |
| Done when 1: the Mozambique pack installs and imports both datasets | 22, 26 |
| Done when 2: the epidemiology plugin binds `cases` and the Case epicurve draws | 23, 26 |
| `pnpm check:plugin-bundle` passes again | 24 |
| Authoring docs for data slots, content, and no-code plugins | 25 |
| Whole-branch review, every check, live eval against 42/45, handoff | 26 |
