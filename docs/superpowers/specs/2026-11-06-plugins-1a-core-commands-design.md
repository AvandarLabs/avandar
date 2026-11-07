# Plugins Slice 1a: Plugin Core and Commands

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-06
**Status:** Design approved
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
(Milestone 1, slice 1a)

## Context

The plugin ecosystem design splits Milestone 1 (first-party plugins) into six
slices. This is the first one. It builds the plugin core: how a plugin is
declared, built into the app, installed per workspace, loaded lazily, and
given a first contribution point. That contribution point is a command
placed in the Data Explorer toolbar.

First-party plugins in Milestone 1 are trusted and run in-process. The
sandbox arrives in Milestone 2. Every API in this slice is async and passes
only serializable data, so the same plugin code runs sandboxed later
without changes.

## Goals

- A plugin is a folder in this monorepo with an `ava.yaml` manifest, code,
  and locale files.
- Each plugin listed in `plugins/bundled.yaml` is compiled into the app as its
  own lazy chunk.
- A settings admin installs, disables, enables, or uninstalls a bundled plugin
  per workspace from Settings → Plugins.
- An installed plugin can add buttons to the Data Explorer toolbar. Whether a
  button shows is controlled by a declarative `when` condition, so plugin
  code is never needed to decide.
- Clicking a plugin button loads the plugin's code on first use and runs the
  command with a scoped `avandar` API.
- **No load-time cost for workspaces without the plugin.** This is enforced in
  CI.

## Non-goals

These belong to later slices or milestones:

- Viz types (1b), AI tools (1c), data slots, content, and the install wizard
  (1d).
- Views and plugin roles (1e), and GIS contributions (1f).
- The `.ava` format, `ava plugin build`, file and URL installs, and the
  sandbox (Milestone 2).
- Enforcing permissions. In 1a, permissions are declared and shown but not
  enforced, since trusted in-process code could bypass checks anyway.
  Enforcement arrives with the Milestone 2 broker.
- Plugin storage. It arrives with the first slice that needs it.
- "Request install" for editors.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Delivery | Plugins are bundled at build time from `plugins/<name>/` and listed in `plugins/bundled.yaml`. Each plugin's code is a separate lazy chunk |
| 2 | Enabling | A minimal Settings → Plugins tab. Settings admins install, disable, enable, and uninstall |
| 3 | `when` conditions | Structured YAML conditions validated by Zod. No string expression language |
| 4 | Manifest schema | Strict: unknown keys are rejected. It covers only the keys 1a uses. Later slices extend it in backward-compatible revisions |
| 5 | Data access | A new `data:context` permission: a plugin can read only the query result it was invoked on |
| 6 | Imports | Plugin code may import only `@avandar/plugin-sdk`, `@avandar/plugin-ui`, relative files, and approved npm packages. An ESLint rule enforces this |
| 7 | Plugin UI | Built only from `@avandar/plugin-ui`. In 1a it re-exports a subset of `@avandar/ui` and Mantine |
| 8 | Plugin strings | `locales/<lang>.json`. English is required, and other languages fall back to it. Manifest strings are plain lookups (`%key%`). Strings in plugin code are ICU messages, formatted by the SDK |
| 9 | Contract plugins | Not bundled, because this monorepo is public. They wait for `.ava` distribution |

## Section 1: packages, plugin layout, build

### Layout

```text
packages/shared/plugin-manifest   Zod schema, ava.yaml compiler, `when` evaluator, slot fact registry
packages/web/plugin-sdk           definePlugin, avandar API types, useAvandar(), useT()
packages/web/plugin-ui            re-exported subset of @avandar/ui + Mantine
plugins/bundled.yaml              which plugins this deployment bundles
plugins/epidemiology/
  ava.yaml
  package.json                    deps: @avandar/plugin-sdk, @avandar/plugin-ui, simple-statistics
  locales/en.json
  src/index.tsx
  src/RegressionModal.tsx
```

All three packages use the MIT license, like the other packages under
`packages/`. `plugin-manifest` lives in `packages/shared` because it runs in
both Node (the Vite plugin and CLI) and the browser (the `when` evaluator).
`pnpm-workspace.yaml` gains `plugins/*`.

### Manifest

```yaml
# plugins/epidemiology/ava.yaml
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots            # Tabler icon name
permissions:
  - data:context
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
```

**Schema rules:**

- **`id`** must match `^[a-z0-9-]+\.[a-z0-9-]+$` (`publisher.name`).
- **`version`** must be a semver string. An unquoted `1.10` is parsed as a
  number and fails validation.
- **`entry`** must point to a file inside the plugin folder.
- **Commands and menus:**
  - Every `menus` entry must reference a declared command.
  - Every command ID must be unique within the plugin.
  - At runtime, command IDs are namespaced as `<pluginId>/<commandId>`.
- **Strings:**
  - Any `%key%` string must exist in `locales/en.json`.
  - Manifest strings are plain text, with no ICU arguments.
- **Unknown keys** fail validation.

**Permissions in 1a:** `data:context` is the only value the schema accepts.

**`when` grammar.** A condition is exactly one of the following:

- `{ all: Condition[] }`
- `{ any: Condition[] }`
- `{ not: Condition }`
- `{ <fact>: { <op>: value } }`, with exactly one fact key and one operator.

Operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, and `in`. Each slot
declares its facts and their types in the slot fact registry in
`plugin-manifest`. A condition on a fact the slot does not declare, or with a
value of the wrong type, fails validation.

The `dataExplorer.toolbar` slot declares these facts:

| Fact | Type |
| --- | --- |
| `hasResult` | boolean |
| `rowCount` | number |
| `columnCount` | number |
| `numericColumnCount` | number |
| `dateColumnCount` | number |

### Build integration

A Vite plugin (`vite-plugin-ava-plugins`) runs during `vite build` and
`vite dev`:

1. **Read and validate.** It reads `plugins/bundled.yaml`, then parses each
   plugin's `ava.yaml` with the `yaml` package in strict YAML 1.2 mode and
   validates it with the `plugin-manifest` Zod schema. Any error fails the
   build, naming the file and path.
2. **Emit a manifest chunk per plugin.** The chunk contains the compiled
   manifest plus a `strings` map, holding only the keys the manifest
   references, for every locale the plugin ships.
3. **Generate the plugin index.** It writes `virtual:ava-plugin-index`, an
   array of `{ id, loadManifest, loadCode }` entries. Both loaders are
   dynamic `import()` calls.
4. **Hot reload.** In dev it watches `ava.yaml` and `locales/` and triggers
   hot reload when they change.

### CLI (`apps/ava-cli/src/PluginCli`)

- `ava plugin init <name>` scaffolds `plugins/<name>/` with a working
  "hello" command, adds it to `bundled.yaml`, and prints the next steps.
- `ava plugin validate [name]` runs four checks: the manifest schema, the
  locale key check, `tsc` on the plugin, and the import-restriction lint.
  Without a name, it validates every bundled plugin.

### CI checks

`scripts/check-plugin-bundle/` runs after `vite build` in
`pr-develop.yaml`. It reads Vite's build manifest and fails if either check
fails:

- Any `plugins/**` module is statically reachable from the entry chunk.
- The plugin host's modules add more than their budget to statically loaded
  chunks. The check runs in a single build and reads Rollup's per-module
  rendered sizes, so no second build with an empty `bundled.yaml` is
  needed. The starting budget is 24,000 rendered bytes for the host plus 600
  per bundled plugin, roughly 8 KB and 200 bytes gzipped. Both are constants
  in the check.

### Import restriction

An ESLint config block for `plugins/**` uses `no-restricted-imports` with an
allowlist pattern. It permits `@avandar/plugin-sdk`, `@avandar/plugin-ui`,
relative imports, and the approved npm list. The approved list is a constant
exported by `plugin-manifest`. In 1a it contains `simple-statistics`,
`d3-array`, and `date-fns`. `ava plugin validate` also checks that a
plugin's `package.json` dependencies stay within the approved list.

## Section 2: runtime in the app

### Plugin host

`PluginHost` is a provider mounted in `WorkspaceLayoutContents`:

1. It reads `plugin_installations` for the current workspace through
   `PluginInstallationClient`, a `createRdbCrudClient` client.
2. It matches the rows against `virtual:ava-plugin-index`. Rows with no
   bundled match are reported as "Unavailable" in Settings and otherwise
   ignored.
3. For each enabled install whose manifest permissions are covered by
   `granted_permissions`, it calls `loadManifest()` in parallel. Results are
   cached for the session.
4. It exposes `usePluginMenuItems(slotId, facts)`, which returns the menu
   items for that slot whose `when` condition is true.

A plugin whose bundled manifest requests permissions missing from
`granted_permissions` has its contributions hidden. Settings shows a "Review
new permissions" action, which updates `granted_permissions`. This is the
first version of the update re-approval flow.

### Data Explorer slot

`<PluginMenuSlot slotId="dataExplorer.toolbar" />` renders inside Data
Explorer's action row (`src/views/DataExplorerApp/DataExplorerApp.tsx`), next
to Reset, Open, Save, and Export.

- Up to 2 plugin commands render as buttons, using the command's icon and
  title.
- When there are more than 2, all of them collapse into one overflow menu
  button.

`DataExplorerApp` builds the invocation context where the result rows live:

```ts
type DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar";
  queryHandle: QueryHandle; // opaque, see below
  columns: ReadonlyArray<{ name: string; dataType: AvaDataType }>;
  rowCount: number;
};
```

Facts for `when` are derived from this context.

A `QueryHandle` is an opaque ID. The host registers it against the result
rows Data Explorer already holds in memory, which is exactly the result the
user invoked the command on, so nothing is queried twice. A new result gets
a new handle, and only the most recent handles stay live. This lets the API
cross the sandbox boundary in Milestone 2 without exposing SQL.

### Activation and command execution

1. **First click.** The first click on a plugin button calls `loadCode()`.
   The promise is cached for the session, and the button shows a loading
   state while the chunk downloads.
2. **Resolving the handler.** The module's default export must be the result
   of `definePlugin(...)`. The host looks up the handler by command ID. A
   missing handler shows an error notification and logs the plugin and
   command IDs.
3. **Running.** The host calls `handler(avandar)` with an `avandar` object
   scoped to the plugin, workspace, user, and this invocation. The button
   stays disabled until the handler's promise settles.

```ts
// plugins/epidemiology/src/index.tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { RegressionModal } from "./RegressionModal";

export default definePlugin({
  commands: {
    "regression.linear": async (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
});
```

Plugin components read the same scoped object through `useAvandar()`, and
translate strings with `useT()`.

### The 1a API

| Member | Purpose | Permission |
| --- | --- | --- |
| `avandar.context` | The invocation context (`DataExplorerToolbarContext` in 1a) | None |
| `avandar.data.fetchRows(queryHandle, { columns, limit })` | Fetches rows of the invocation's result as `{ rows: Record<string, unknown>[], isTruncated: boolean }`. The default limit is 50,000 and the maximum is 200,000. Reads the in-memory result behind the handle, selecting only the requested columns | `data:context` |
| `avandar.ui.openModal({ title, content })`, `openDrawer(...)`, `notify({ message, color })` | Show UI. `content` must be built from `@avandar/plugin-ui` components | None |
| `avandar.i18n.t(key, values?)`, `useT()` | Plugin strings from `locales/`, formatted as ICU messages in the user's locale | None |
| `avandar.workspace` | `{ id, slug, locale }`, read-only | None |

`fetchRows` accepts only the handle from the current invocation. Any other
handle rejects with `PermissionDenied`. In 1a this is the API's contract,
not a security boundary.

### Errors

The SDK exports a `PluginError` type with codes `PermissionDenied`,
`InvalidHandle`, `LoadFailed`, and `CommandFailed`.

| Failure | Behavior |
| --- | --- |
| The handler throws or rejects | Notification "*Plugin name*: the command failed", and the error is logged with plugin and command IDs |
| The code chunk fails to load | Notification with a retry action. The cached promise is cleared so a retry refetches |
| A plugin component throws while rendering | An error boundary inside the modal or drawer shows a failure message. The rest of the app is unaffected |
| An invalid manifest | Not possible at runtime: the build fails first |

## Section 3: database, Settings → Plugins, testing

### `plugin_installations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `workspace_id` | `uuid` | Foreign key to `workspaces`, `on delete cascade` |
| `plugin_id` | `text` | Check constraint: `^[a-z0-9-]+\.[a-z0-9-]+$` |
| `installed_version` | `text` | Manifest version at install time |
| `is_enabled` | `boolean` | Default `true` |
| `granted_permissions` | `text[]` | Snapshot of manifest permissions approved at install |
| `installed_by` | `uuid` | Default `auth.uid()` |
| `created_at`, `updated_at` | `timestamptz` | `util__set_updated_at` trigger |

- **Uniqueness:** `(workspace_id, plugin_id)`.
- **Triggers:** the standard `prevent_workspace_id_change` trigger.
- **Grants:** to `authenticated` and `service_role` only.
- **RLS:**
  - `select`: workspace members, via `util__get_auth_user_workspaces()`.
  - `insert`, `update`, `delete`: only when
    `util__can_manage_workspace_settings` is true.
- **Location:** follows the declarative schema conventions, in
  `supabase/schemas/10.plugin_installations.sql`.

### Model and client

- **Model:** `shared/models/PluginInstallation/`, with `PluginInstallation.T`,
  `PluginInstallation.Id`, and its parsers. Scaffolded with `ava new model`.
- **Client:** `src/clients/plugins/PluginInstallationClient/`, built with
  `createRdbCrudClient`.

### Settings → Plugins tab

- **Where it lives:** add the tab ID `plugins` to both the owner and non-owner
  settings tab lists in `WorkspaceSettingsPage.tsx`.
- **Who sees it:** settings admins only, gated by a new permission key
  `settings__can_manage_plugins` in `PermissionRegistry.ts`, at the admin
  level of the `settings` app.
- **What each bundled plugin shows:**
  - its icon, name, publisher (from the ID), and version
  - its description
  - a generated "Adds" summary, for example "1 button in Data Explorer"
  - its permissions in plain language
  - a status badge: Not installed, Installed, Disabled, Needs review, or
    Unavailable
- **Actions:** Install, Disable, Enable, Uninstall, and Review new
  permissions. Each one confirms in a modal before writing.
  - Uninstall deletes the row. There is no plugin data to keep in 1a.
- **Layout and text:**
  - Follow `docs/design/app-view-layout.md` and the existing settings tabs.
  - All host UI text goes through Lingui.

### Documentation

`docs/plugin-authoring.md` explains how to write a bundled plugin: layout,
manifest, `when`, the 1a API, `ava plugin init` and `validate`, and the
import rules. `CLAUDE.md`'s documentation list links to it.

### Tests

| Layer | Tests |
| --- | --- |
| `plugin-manifest` unit | Strict schema (unknown keys, bad IDs, menu entries referencing missing commands), YAML edge cases (`version: 1.10` fails, `NO` stays a string), missing locale keys, the `when` evaluator (each operator, `all`/`any`/`not`, unknown facts, wrong value types) |
| Vite plugin unit | Index generation, manifest chunks with locale strings, build failure on an invalid manifest |
| Plugin host | Install rows matched against the index, unavailable plugins, hidden contributions when permissions need review, manifest caching |
| `PluginMenuSlot` component | Items show and hide by `when`, inline vs. overflow at more than 2, loading state on first click, error notification when a handler throws, retry after a load failure |
| `fetchRows` | Column projection, the default and maximum limit, `isTruncated`, rejection of a handle that is not the invocation's |
| pgTAP | Members can select. Settings admins can insert, update, and delete. Other members cannot write. Other workspaces cannot read |
| Bundle check | Entry chunk is free of plugin modules. Entry size stays within budget |
| Playwright E2E | Through the UI: a settings admin installs Epidemiology in Settings → Plugins, runs a Data Explorer query with 2 numeric columns, clicks "Linear regression", picks the columns, and sees slope, intercept, r², and n. The test uninstalls the plugin in `finally` |

## Acceptance

Slice 1a is done when all of these hold:

1. **The epidemiology plugin works end to end.** `avandar.epidemiology`
   v0.1.0 is bundled. Its "Linear regression" command opens a modal to pick
   an X and a Y numeric column, then fits a simple linear regression with
   `simple-statistics` and shows slope, intercept, r², and n. When the
   result was truncated, it says so.
2. **Every test above passes**, including the E2E flow.
3. **The bundle check passes.** A workspace without the plugin installed
   downloads no plugin manifest, code, or CSS.

## Implementation notes

- **Rebase first.** Rebase the implementation branch onto `origin/develop`
  before starting. Local `develop` was 9 commits behind when this spec was
  written.
- **Database work.** Before any database command on the implementation
  branch, run `ava supabase status` and `ava supabase switch`, as `CLAUDE.md`
  requires. Use the `supabase-declarative-schema` skill for the table.
- **Model.** Use the `ava-model-creation` skill. It still describes the
  retired `createSupabaseCRUDClient`, so follow the `createRdbCrudClient`
  pattern used by `src/clients/maps/AvaMapClient/AvaMapClient.ts` instead.
- **Test-driven.** Build each unit red/green, as the project rules require.

## Implementation notes: as built

What changed from this spec while building slice 1a. Where the two
disagree, the code and `docs/plugin-authoring.md` are current.

### Final exported names

Repo naming rules (`create*` for objects, `make*` for strings and
primitives, `get*From*` for derived values) renamed the helpers the plan
named. Behavior is unchanged.

| Plan or spec name | Built name |
| --- | --- |
| `collectWhenConditionIssues` | `getIssuesFromWhenCondition` |
| `resolveManifestString` | `getLocalizedTextFromManifestStrings` |
| `getLocalizedKey` | `getMessageKeyFromManifestString` |
| `getManifestStringKeys` | `getMessageKeysFromManifest` |
| `toTablerIconComponentName` | `makeTablerComponentNameFromIconName` |
| `findUnapprovedDependencies` | `getUnapprovedDependenciesFromPackageJson` |
| `createPluginTranslator` | `makePluginTranslator` |
| `buildPluginIndexModule` | `makeIndexModuleSourceFromPlugins` |
| `buildPluginManifestModule` | `makeManifestModuleSourceFromPlugin` |
| `buildPluginLocalesModule` | `makeLocalesModuleSourceFromPlugin` |
| `toChunkSummaries` | `makeChunkSummariesFromBundle` |
| `createPluginModuleCache` | `makePluginModuleCache` (the shared instance is `PluginModuleCache`) |
| `getPluginInstallStatus` | `getPluginInstallStatusFromInstallation` |
| `selectLoadableInstallations` | `getLoadablePluginsFromInstallations` |
| `selectActivePlugins` | `getActivePluginsFromLoadablePlugins` |
| `selectPluginMenuItems` | `getMenuItemsFromActivePlugins` |
| `countPluginContributions` | `getContributionCountsFromManifest` |
| `createPluginApi` | `makePluginApi` |
| `makeDataExplorerToolbarFacts` | `makeToolbarFactsFromQueryResult` |
| `buildPluginScaffoldFiles` | `makePluginScaffoldFilesFromName` |
| `toRegressionPoints` | `makeRegressionPointsFromRows` |
| `PLUGIN_INDEX` read directly | `getBundledPluginEntries` and `getPluginIndexEntry` in `pluginIndexHelpers.ts` |
| `PluginInstallationRead`, `PluginInstallationId` | `PluginInstallation.T`, `PluginInstallation.Id` |

`makeQueryHandleRegistry` is new: `QueryHandleRegistry` is one instance of
it, which lets a test build an isolated registry. `parseStrictYaml` is also
new. It is the strict YAML 1.2 parser behind `compileManifest` and the
`bundled.yaml` reader.

### Per-module folder layout

Every module sits in a folder named after it, with its test beside it, for
example `src/lib/plugins/makePluginApi/makePluginApi.tsx` and
`makePluginApi.test.tsx`. The flat files the plan listed became folders. The
same holds in `packages/*`, `plugins/epidemiology`, `apps/ava-cli`, and the
Settings tab. Integration tests live in `__tests__/` directories. The
regression modal split into `RegressionModal/` with `ColumnPickers`,
`RegressionForm`, `FitOutcome`, `FittedResult`, and
`makeStatisticTextFromNumber`.

### Build and bundle check

- **Single-build bundle check.** The check is not a separate
  `scripts/check-plugin-bundle/` step reading Vite's build manifest. It is
  `checkPluginBundle` in `scripts/vite-plugin-ava-plugins/`, called from the
  Vite plugin's `generateBundle` hook in the same build when
  `AVA_PLUGIN_BUNDLE_CHECK=1`. `pnpm check:plugin-bundle` sets it, and
  `pr-develop.yaml` runs that script.
- **What it measures.** It walks the static `imports` of every entry chunk.
  A `plugins/**` module, a plugin manifest module, or a plugin locale module
  in any statically reachable chunk is a violation. It also sums the rendered
  bytes of host modules in those chunks: `src/lib/plugins/`,
  `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and the virtual plugin
  index. The plugin SDK counts as host code. The budget is 24,000 bytes plus
  600 per bundled plugin.
- **Lazy runner.** `runPluginCommand` loads at click time through
  `loadRunPluginCommand`, a dynamic `import()` cached after the first success.
  The runner reaches the SDK runtime and Lingui's message compiler, so loading
  it lazily keeps both out of the main bundle. A failed import is forgotten,
  so the next click retries it.
- **`runnerImport` in `vite.config.ts`.** The config loads
  `vitePluginAvaPlugins` through Vite's `runnerImport` with
  `vite-tsconfig-paths`, not a static import. A static import would have Node
  load `@avandar/plugin-manifest` source directly and fail on its
  `@plugin-manifest/...` aliases. `runnerImport` is experimental in Vite 7,
  and editing the Vite plugin's own source needs a dev server restart.
- **`optimizeDeps.entries`.** The Vite plugin adds each plugin's entry file to
  `optimizeDeps.entries`. The startup dependency scan does not follow imports
  out of a virtual module, so without these entries an npm package only a
  plugin imports was first optimized when its chunk loaded, and the resulting
  full page reload closed the user's open modal or drawer.

### Runtime

- **Settled per-plugin manifest loading.** `loadManifestModules` loads each
  manifest with `Promise.allSettled`, so one failing chunk does not hide the
  other plugins. Each failure is logged with its plugin id. The result carries
  `hasFailures`, and a result with failures is stale at once, so the next use
  retries it.
- **Manifest queries excluded from persistence.** The manifest query sets
  `meta: { persist: false }`. A manifest module carries React icon
  components, and JSON persistence turns each one into `{}`, which crashed the
  first render after a reload.
- **Installation reads refetch on mount.** `PluginHost` and the Plugins tab
  read installs with `ALWAYS_REFETCH_ON_MOUNT`. A reload right after an
  install restored the pre-install snapshot from the persisted cache and
  counted it as fresh, so the plugin stayed hidden until it went stale.
- **Plugins tab errors.** When installs fail to load and there is no cached
  installs data, the tab shows an error and no cards, because every plugin
  would look uninstalled. A background refetch failure keeps showing the
  cached cards.

### Database

- **Desktop sync exclusion.** `plugin_installations` is listed as not synced
  in `apps/desktop/sync/syncable-tables.ts`, like `maps`.
- **RLS hardening.** The insert policy pins `installed_by` to the caller. A
  dedicated `plugin_installations__prevent_identity_change` trigger makes both
  `workspace_id` and `plugin_id` immutable, in place of the standard
  `prevent_workspace_id_change` trigger the spec named. `installed_by` is not
  pinned on update, because deleting a user sets it to null through an update.

### CLI

`ava plugin init` takes `--publisher` (default `avandar`) and, in a terminal,
asks for a missing name and publisher. Without a terminal, a missing name
fails with the exact command to run. `ava plugin validate` runs the manifest
checks (schema, locale keys, entry file, icons, approved dependencies), then
`tsc`, then `eslint`, and skips the last two when the manifest fails. In a
terminal it asks which plugin, and an empty answer validates all of them.
