# Plugins Slice 1b, Part A: Plugin Chart Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a plugin add chart types that render in the Data Explorer, the dashboard editor, workspace dashboards, and public dashboard links, and ship the epidemiology plugin's epicurve and rate plot.

**Architecture:** A plugin declares chart types and their settings in `ava.yaml`, and the app draws the settings form from the manifest. Stored charts use one new `plugin` member of the viz config unions, routed by `VisualizationContainer` to a `PluginVizRenderer` that loads the plugin's code lazily and either runs a transform (rows plus a built-in chart spec, drawn by the existing renderer) or renders the plugin's chart component. Charts render from bundled code everywhere without an install check, and installs only control the chart type picker.

**Tech Stack:** TypeScript, React 19, Mantine 9 and `@mantine/charts`, Recharts 3, Zod 4, ts-pattern, Puck, TanStack Router, Lingui 6, React Query (`@avandar/query-hooks`), Vite 7, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md` (Part A). Part B (derived columns) gets its own plan.

**Branch:** `feat/plugins-viz` in the worktree created from `feat/plugins-core`. It merges into `demo/measles`, never `develop`.

---

## Before you start

- Work in the `feat/plugins-viz` worktree. Commit each task by path. Never stage `supabase/config.toml`.
- `pnpm type-check` runs a Deno check, so Deno must be installed. `deno.json` has no `dist/` exclusion: delete `packages/shared/plugin-manifest/dist` before `pnpm type-check` whenever `pnpm verify:packages` or a package build ran first.
- Before any database-backed command (the E2E specs, `pnpm db:reset`, `pnpm test:db`), run `ava supabase status` and confirm this worktree is on its own switched project. If it is not, run `ava supabase switch` first.
- Run E2E specs one at a time, never the full suite.
- The translation catalogs go stale from Task 6 until Task 26 runs `pnpm i18n:extract`. `pnpm i18n:check` is expected to fail in between.

## Decisions made while planning

These refine the spec. Where they differ, this plan wins.

1. **Built-in and plugin configs are split.** `AvaVizConfig = BuiltInAvaVizConfig | AvaPluginVizConfig`, and the same for `UiVizConfig`. The nine per-type modules, their conversion matrices, `VizTypes`, `makeEmptyConfig`, `getDescriptors`, `VIZ_RENDER_LIMITS`, `vizTypeLabel`, and `getAxisRolesFromVizType` are typed over `BuiltInVizType`, so they gain no plugin branches.
2. **The facade handles plugin sources itself.** Converting a plugin config to a built-in type starts from that type's empty config, and the caller's usual hydration fills it. Hydrating a plugin config returns it unchanged, because plugin configs are filled from the manifest when the chart type is picked.
3. **`VisualizationContainer` is a router.** Built-in configs render `BuiltInVizContainer` (the old body). Its chart dispatch lives in `UiVizConfigRenderer`, which transform output reuses.
4. **The SDK runtime loads lazily for charts too.** Everything that imports the SDK runtime lives in `PluginVizRuntime`, loaded by `loadPluginVizRuntime()`. The bundle check exempts chunks reachable only through it, as it already exempts the command runner.
5. **Transforms get a translator.** A transform is called as `transform(input, { i18n, locale })`, so it can translate labels such as "Other" and "Unknown".
6. **Bar gap is a top-level bar field,** `barGap?: "default" | "none"`, drawn as Recharts `barCategoryGap: 0` for `"none"`.
7. **The union widens in Task 8, not Task 7.** Adding the plugin member breaks the converters it needs, so Task 7 lands the new types and every `BuiltInVizType` narrowing with the unions unchanged, and Task 8 widens them together with every plugin branch and the guards existing callers need.
8. **The dashboard chart type field becomes a custom Puck field** that reuses the Data Explorer's `VizTypeSelect`. Puck 0.21's `select` is a native `<select>` without option groups, and every plugin chart stores `vizType: "plugin"`, so it could not show which plugin chart is selected.
9. **No caller has a truncation signal yet.** `PluginVizRenderer` takes an optional `isTruncated` (default `false`), so the truncation note appears only where a caller supplies it.
10. **The public route renders in English.** Plugin strings follow `useLingui().i18n.locale`, and the public dashboard route always runs in `en` today.

## Task index

| # | Task | Depends on |
| --- | --- | --- |
| 1 | Manifest: shared field schemas, `vizTypes` schema, `getIssuesFromVizTypes`, exported types | |
| 2 | Manifest: locale keys and icons for viz types | 1 |
| 3 | SDK: chart types, `PluginDefinition.vizTypes`, `definePlugin`, `isPluginDefinition` | |
| 4 | SDK: `PluginVizProvider`, `useT` fallback, `useAvandar` error inside charts | 3 |
| 5 | `@avandar/plugin-ui/charts` and `useChartTheme` | |
| 6 | Extract `BuiltInVizContainer` and `UiVizConfigRenderer` (no behavior change) | |
| 7 | Plugin viz config types, schemas, `BuiltInVizType` narrowing, `PluginVizPlaceholder` | 6 |
| 8 | Widen the viz config unions with the plugin member | 7 |
| 9 | `AvaPluginVizConfigs` and the shared column picker data type check | 8 |
| 10 | Built-in bar chart `barGap` | 6 |
| 11 | Plugin chart type lookup, picker options, and labels | 1, 8 |
| 12 | Plugin chart spec schema and its built-in config | 3, 8 |
| 13 | Lazily loaded plugin chart runtime | 4, 12 |
| 14 | `PluginVizRenderer` in the visualization router | 9, 11, 13 |
| 15 | Plugin chart settings form | 9, 11 |
| 16 | Bundle check: lazy runtime exemption and budget re-measure | 14, 15 |
| 17 | Data Explorer state: plugin targets, plugin config memory, `vc` validation | 8, 11 |
| 18 | `VizTypeSelect` "Plugins" group | 9, 11, 17 |
| 19 | Dashboards: chart type field, empty-config fallback, settings field | 15, 18 |
| 20 | Gadget summaries: "Plugin chart" label | 8 |
| 21 | Epidemiology: `getDateFromCellValue` and `getBucketStartFromDate` | |
| 22 | Epidemiology: `makeEpicurveFromRows` | 3, 21 |
| 23 | Epidemiology: rate plot | 4, 5 |
| 24 | Epidemiology: manifest `vizTypes`, locale strings, `definePlugin` wiring | 1, 2, 22, 23 |
| 25 | `docs/plugin-authoring.md`: chart types | 24 |
| 26 | Extract and compile the translation catalogs | 25 |
| 27 | E2E: an epicurve from the Data Explorer renders on a public dashboard link | 26 |
| 28 | Final verification, every check on its own | 27 |

Execute the tasks in numeric order. The dependency column is for reviewers.

## File structure

Files this plan creates, by area. Modified files are listed in each task.

**`packages/shared`**

| File | Task |
| --- | --- |
| `packages/shared/plugin-manifest/src/PluginManifest/manifestFieldSchemas.ts` | 1 |
| `packages/shared/plugin-manifest/src/PluginManifest/PluginVizTypeSchema.ts` | 1 |
| `packages/shared/plugin-manifest/src/PluginManifest/getIssuesFromVizTypes.ts` | 1 |

**`packages/web`**

| File | Task |
| --- | --- |
| `packages/web/plugin-sdk/src/PluginViz.types.ts` | 3 |
| `packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.tsx` | 4 |
| `packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.test.tsx` | 4 |
| `packages/web/plugin-ui/src/charts.ts` | 5 |
| `packages/web/plugin-ui/src/useChartTheme/useChartTheme.ts` | 5 |
| `packages/web/plugin-ui/src/useChartTheme/useChartTheme.test.tsx` | 5 |
| `packages/web/plugin-ui/vitest.config.ts` | 5 |

**`src`**

| File | Task |
| --- | --- |
| `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx` | 6 |
| `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx` | 6 |
| `src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.tsx` | 7 |
| `src/lib/plugins/vizs/pluginVizOptionHelpers.ts` | 11 |
| `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.ts` | 11 |
| `src/lib/plugins/vizs/usePluginVizType/usePluginVizType.ts` | 11 |
| `src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.ts` | 11 |
| `src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.ts` | 11 |
| `src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.ts` | 12 |
| `src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.ts` | 12 |
| `src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx` | 13 |
| `src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx` | 13 |
| `src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.ts` | 13 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants.ts` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader.tsx` | 14 |
| `src/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode.ts` | 14 |
| `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.tsx` | 15 |
| `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls.tsx` | 15 |
| `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers.ts` | 15 |
| `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx` | 17 |
| `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.tsx` | 19 |
| `src/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig.tsx` | 19 |
| `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx` | 19 |

**`shared`**

| File | Task |
| --- | --- |
| `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts` | 7 |
| `shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts` | 7 |
| `shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts` | 9 |
| `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts` | 9 |

**`plugins/epidemiology`**

| File | Task |
| --- | --- |
| `plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.ts` | 21 |
| `plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.ts` | 21 |
| `plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.ts` | 22 |
| `plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.ts` | 22 |
| `plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.ts` | 23 |
| `plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.ts` | 23 |
| `plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.tsx` | 23 |
| `plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.types.ts` | 23 |
| `plugins/epidemiology/src/ratePlot/RatePlot/RatePlotChart.tsx` | 23 |
| `plugins/epidemiology/src/ratePlot/RatePlot/RatePlotTooltip.tsx` | 23 |

**`tests/e2e`**

| File | Task |
| --- | --- |
| `tests/e2e/plugins-epidemiology-epicurve.spec.ts` | 27 |

---

## Tasks

### Task 1: Manifest: shared field schemas, `vizTypes` schema, `getIssuesFromVizTypes`, exported types

**Files:**
- Create: `packages/shared/plugin-manifest/src/PluginManifest/manifestFieldSchemas.ts`
- Create: `packages/shared/plugin-manifest/src/PluginManifest/PluginVizTypeSchema.ts`
- Create: `packages/shared/plugin-manifest/src/PluginManifest/getIssuesFromVizTypes.ts`
- Modify: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts` (imports and constants lines 1-17, field schemas lines 39-45, `CommandSchema` lines 87-96, `contributes` lines 133-136, `superRefine` lines 195-204, new exported types after line 223)
- Modify: `packages/shared/plugin-manifest/src/runtime.ts` (type export lines 8-13)
- Modify: `packages/shared/plugin-manifest/src/index.ts` (type export lines 7-19)
- Modify: `packages/shared/plugin-manifest/README.md` (Exports table, after line 33)
- Modify: `src/lib/plugins/PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx` (line 74 `contributes` literal)
- Modify: `src/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts` (line 23 `contributes` literal)
- Modify: `src/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts` (line 8)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx` (line 101 `contributes` literal)
- Modify: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.test.tsx` (line 14 `contributes` literal)
- Modify: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts` (line 19 `contributes` literal)
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`

**Context:** Implements contract C1's schema half: `contributes.vizTypes`, the cross-entry checks, and the `PluginVizType`, `PluginVizSetting`, `PluginVizSettingControl` types every later task reads. `packages/shared/**` is Deno-reachable, so every import carries `.ts`, uses the `@plugin-manifest/` alias, and is never relative. `src/runtime.ts` must stay free of Zod and YAML, so it re-exports the new types with `export type` only. The tests go into the existing `PluginManifestSchema.test.ts` (the way `getIssuesFromWhenCondition` is tested), because `src/PluginManifest/` may hold only one test file. Zod 4 skips `superRefine` when the base object has issues, so `getIssuesFromVizTypes` only ever sees schema-valid entries. The CLI scaffold (`apps/ava-cli/src/PluginCli/InitPluginCli/makePluginScaffoldFilesFromName.ts`) writes `ava.yaml` as text, so it stays unchanged: `vizTypes` defaults to `[]`. The other manifest fixtures (`getActivePluginsFromLoadablePlugins.test.ts`, `loadManifestModules.test.ts`, `makePluginModuleCache.test.ts`, `usePluginInstallationActions.test.tsx`) have no `contributes` object and stay unchanged.

- [ ] **Step 1: Write the failing tests**

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`, insert these helpers directly after line 59 (`const WHEN_PATH = "contributes.menus.dataExplorer.toolbar.0.when";`):

```ts
const SETTING_PATH = "contributes.vizTypes.0.settings.0";

const DAY_AND_WEEK_OPTIONS = [
  { value: "day", label: "%viz.interval.day%" },
  { value: "week", label: "%viz.interval.week%" },
];

function _makeSetting(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    key: "interval",
    label: "%viz.interval%",
    control: { kind: "segmented", options: DAY_AND_WEEK_OPTIONS },
    ...overrides,
  };
}

function _makeVizType(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "epicurve",
    title: "%viz.epicurve.title%",
    icon: "chart-histogram",
    render: "transform",
    settings: [_makeSetting()],
    ...overrides,
  };
}

function _makeManifestWithVizTypes(
  vizTypes: unknown[],
): Record<string, unknown> {
  const manifest = _makeValidManifest();
  manifest.contributes = { commands: [], menus: {}, vizTypes };
  return manifest;
}

function _makeManifestWithSetting(
  setting: Record<string, unknown>,
): Record<string, unknown> {
  return _makeManifestWithVizTypes([_makeVizType({ settings: [setting] })]);
}
```

Then append this block at the end of the file, after the closing `});` of `describe("PluginManifestSchema", ...)`:

```ts
describe("PluginManifestSchema contributes.vizTypes", () => {
  it("defaults vizTypes to an empty list when the manifest declares none", () => {
    const result = PluginManifestSchema.parse(_makeValidManifest());
    expect(result.contributes.vizTypes).toEqual([]);
  });

  it("defaults a setting's required flag to false", () => {
    const result = PluginManifestSchema.parse(
      _makeManifestWithSetting(_makeSetting()),
    );
    expect(result.contributes.vizTypes[0]?.settings[0]?.required).toBe(false);
  });

  it("defaults a viz type's settings to an empty list", () => {
    const vizType = _makeVizType();
    delete vizType.settings;
    const result = PluginManifestSchema.parse(
      _makeManifestWithVizTypes([vizType]),
    );
    expect(result.contributes.vizTypes[0]?.settings).toEqual([]);
  });

  it.each([
    ["columnPicker", { kind: "columnPicker", dataType: "temporal" }],
    ["select", { kind: "select", options: [{ value: "a", label: "%a%" }] }],
    ["switch", { kind: "switch" }],
    ["number", { kind: "number", min: 1, max: 10, step: 1, unit: "%unit%" }],
    ["text", { kind: "text", placeholder: "%placeholder%" }],
    ["color", { kind: "color" }],
  ])("accepts a %s control", (_kind, control) => {
    expect(
      _getIssues(_makeManifestWithSetting(_makeSetting({ control }))),
    ).toEqual([]);
  });

  it("lists the known control kinds when a control kind is unknown", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "slider" } }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.kind`,
        message:
          "must be columnPicker, select, segmented, switch, number, text, or color",
      },
    ]);
  });

  it("rejects a render mode other than transform or component", () => {
    const issues = _getIssues(
      _makeManifestWithVizTypes([_makeVizType({ render: "canvas" })]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("contributes.vizTypes.0.render");
  });

  it("explains the viz type id format in lowercase words", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType({ id: "Epi_Curve" }),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.0.id",
        message:
          "must be lowercase letters, digits, and hyphens, in dot-separated words",
      },
    ]);
  });

  it("rejects a setting key that does not start with a letter", () => {
    const manifest = _makeManifestWithSetting(_makeSetting({ key: "1st" }));
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.key`,
        message: "must start with a letter and hold only letters and digits",
      },
    ]);
  });

  it("rejects duplicate viz type ids", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType(),
      _makeVizType(),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.1.id",
        message: 'duplicate viz type id "epicurve"',
      },
    ]);
  });

  it("rejects duplicate setting keys within a viz type", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType({ settings: [_makeSetting(), _makeSetting()] }),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.0.settings.1.key",
        message: 'duplicate setting key "interval"',
      },
    ]);
  });

  it("accepts the same setting key in two viz types", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType(),
      _makeVizType({ id: "rate-plot" }),
    ]);
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("rejects duplicate option values within a control", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({
        control: {
          kind: "segmented",
          options: [
            { value: "day", label: "%viz.interval.day%" },
            { value: "day", label: "%viz.interval.week%" },
          ],
        },
      }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.options.1.value`,
        message: 'duplicate option value "day"',
      },
    ]);
  });

  it("rejects a default on a column picker", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "columnPicker" }, default: "date" }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.default`,
        message: "a column picker cannot have a default",
      },
    ]);
  });

  it.each([
    [
      "a segmented default that is not an option value",
      { kind: "segmented", options: DAY_AND_WEEK_OPTIONS },
      "month",
      "must be one of the option values: day, week",
    ],
    [
      "a select default that is not an option value",
      { kind: "select", options: [{ value: "a", label: "%a%" }] },
      "b",
      "must be one of the option values: a",
    ],
    [
      "a switch default that is not a boolean",
      { kind: "switch" },
      "yes",
      "must be true or false for a switch",
    ],
    [
      "a number default that is not a number",
      { kind: "number" },
      "5",
      "must be a number for a number control",
    ],
    [
      "a number default below min",
      { kind: "number", min: 1 },
      0,
      "must be at least 1",
    ],
    [
      "a number default above max",
      { kind: "number", max: 10 },
      11,
      "must be at most 10",
    ],
    [
      "a text default that is not a string",
      { kind: "text" },
      5,
      "must be a string for a text control",
    ],
    [
      "a color default that is not a string",
      { kind: "color" },
      true,
      "must be a string for a color control",
    ],
  ])("rejects %s", (_label, control, defaultValue, message) => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control, default: defaultValue }),
    );
    expect(_getIssues(manifest)).toEqual([
      { path: `${SETTING_PATH}.default`, message },
    ]);
  });

  it.each([
    ["segmented", { kind: "segmented", options: DAY_AND_WEEK_OPTIONS }, "week"],
    ["switch", { kind: "switch" }, true],
    ["number", { kind: "number", min: 1, max: 10 }, 10],
    ["text", { kind: "text" }, "Cases"],
    ["color", { kind: "color" }, "#228be6"],
  ])("accepts a %s default that fits the control", (_kind, control, value) => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control, default: value }),
    );
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("rejects a number control whose min is greater than its max", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "number", min: 10, max: 1 } }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.min`,
        message: "must not be greater than max (1)",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @avandar/plugin-manifest test src/PluginManifest/PluginManifestSchema.test.ts`
Expected: FAIL. The 32 new tests fail (the strict `contributes` object reports `Unrecognized key: "vizTypes"`, and `result.contributes.vizTypes` is `undefined`). The 23 existing tests still pass.

- [ ] **Step 3: Create `manifestFieldSchemas.ts`**

`packages/shared/plugin-manifest/src/PluginManifest/manifestFieldSchemas.ts`:

```ts
import { LOCALIZED_KEY_PATTERN } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";
import { z } from "zod";

const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The format of a command id or a chart type id: lowercase words of letters,
 * digits, and hyphens, separated by dots. The manifest schemas share it so
 * both kinds of id follow one rule.
 */
export const COMMAND_ID_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;

/** The issue message for an id that does not match `COMMAND_ID_PATTERN`. */
export const COMMAND_ID_MESSAGE =
  "must be lowercase letters, digits, and hyphens, in dot-separated words";

/**
 * A user-facing manifest string, which must be a `%key%` reference to
 * `locales/en.json`, for example a command title or a chart setting label.
 */
export const LocalizedStringSchema = z
  .string()
  .regex(LOCALIZED_KEY_PATTERN, "must be a %key% reference to locales/en.json");

/**
 * A Tabler icon name such as `chart-dots`, for the plugin, command, and
 * chart type icons a manifest declares.
 */
export const IconNameSchema = z
  .string()
  .regex(ICON_NAME_PATTERN, "must be a Tabler icon name, e.g. chart-dots");
```

- [ ] **Step 4: Create `PluginVizTypeSchema.ts`**

`packages/shared/plugin-manifest/src/PluginManifest/PluginVizTypeSchema.ts`:

```ts
import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  IconNameSchema,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { z } from "zod";

const SETTING_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const CONTROL_KIND_MESSAGE =
  "must be columnPicker, select, segmented, switch, number, text, or color";

/**
 * How a plugin chart type is drawn. `transform` returns rows and a chart
 * spec that Avandar draws with a built-in chart, and `component` draws the
 * chart itself. A chart type's `render` field picks one.
 */
export const PLUGIN_VIZ_RENDER_MODES = ["transform", "component"] as const;

/**
 * The column types a `columnPicker` setting can ask for, so its picker lists
 * only matching columns. `any` lists every column.
 */
export const PLUGIN_VIZ_COLUMN_DATA_TYPES = [
  "numeric",
  "any",
  "temporal",
  "text",
] as const;

const PluginVizOptionSchema = z.strictObject({
  value: z.string().min(1),
  label: LocalizedStringSchema,
});

/**
 * The control a chart setting is edited with, one of the kinds Avandar's
 * built-in chart settings already use. Option labels, a number's unit, and
 * a text placeholder are `%key%` references.
 */
export const PluginVizSettingControlSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({
      kind: z.literal("columnPicker"),
      dataType: z.enum(PLUGIN_VIZ_COLUMN_DATA_TYPES).optional(),
    }),
    z.strictObject({
      kind: z.literal("select"),
      options: z
        .array(PluginVizOptionSchema)
        .min(1, "a select needs at least one option"),
    }),
    z.strictObject({
      kind: z.literal("segmented"),
      options: z
        .array(PluginVizOptionSchema)
        .min(2, "a segmented control needs at least two options"),
    }),
    z.strictObject({ kind: z.literal("switch") }),
    z.strictObject({
      kind: z.literal("number"),
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().positive().optional(),
      unit: LocalizedStringSchema.optional(),
    }),
    z.strictObject({
      kind: z.literal("text"),
      placeholder: LocalizedStringSchema.optional(),
    }),
    z.strictObject({ kind: z.literal("color") }),
  ],
  { error: CONTROL_KIND_MESSAGE },
);

const PluginVizSettingSchema = z.strictObject({
  key: z
    .string()
    .regex(
      SETTING_KEY_PATTERN,
      "must start with a letter and hold only letters and digits",
    ),
  label: LocalizedStringSchema,
  control: PluginVizSettingControlSchema,
  required: z.boolean().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

/**
 * The schema for one entry of a manifest's `contributes.vizTypes`: a chart
 * type the plugin adds to Avandar's chart picker. Rules that span entries,
 * such as unique ids and defaults that fit their control, are checked by
 * `getIssuesFromVizTypes`.
 */
export const PluginVizTypeSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
  render: z.enum(PLUGIN_VIZ_RENDER_MODES),
  settings: z.array(PluginVizSettingSchema).default([]),
});
```

- [ ] **Step 5: Create `getIssuesFromVizTypes.ts`**

`packages/shared/plugin-manifest/src/PluginManifest/getIssuesFromVizTypes.ts`:

```ts
import type { PluginVizTypeSchema } from "@plugin-manifest/PluginManifest/PluginVizTypeSchema.ts";
import type { z } from "zod";

type IssuePath = ReadonlyArray<string | number>;
type VizType = z.output<typeof PluginVizTypeSchema>;
type VizSetting = VizType["settings"][number];
type VizSettingControl = VizSetting["control"];
type VizSettingValue = NonNullable<VizSetting["default"]>;

/**
 * A problem found in a manifest's `contributes.vizTypes` and where it sits,
 * in the shape the manifest schema needs to report it as a Zod issue.
 */
export type VizTypeIssue = Readonly<{ path: IssuePath; message: string }>;

/** Each value that already appeared earlier in `values`, with its index. */
function _getRepeatedValues(
  values: readonly string[],
): Array<{ index: number; value: string }> {
  return values.flatMap((value, index) => {
    return values.indexOf(value) < index ? [{ index, value }] : [];
  });
}

function _getNumberDefaultMessages(options: {
  control: Extract<VizSettingControl, { kind: "number" }>;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  if (typeof value !== "number") {
    return ["must be a number for a number control"];
  }
  if (control.min !== undefined && value < control.min) {
    return [`must be at least ${control.min}`];
  }
  if (control.max !== undefined && value > control.max) {
    return [`must be at most ${control.max}`];
  }
  return [];
}

function _getOptionDefaultMessages(options: {
  control: Extract<VizSettingControl, { kind: "select" | "segmented" }>;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  const values = control.options.map((option) => {
    return option.value;
  });
  return typeof value === "string" && values.includes(value)
    ? []
    : [`must be one of the option values: ${values.join(", ")}`];
}

/** Why a setting's `default` does not fit its control, if it does not. */
function _getDefaultMessages(options: {
  control: VizSettingControl;
  value: VizSettingValue;
}): string[] {
  const { control, value } = options;
  switch (control.kind) {
    case "columnPicker":
      return ["a column picker cannot have a default"];
    case "select":
    case "segmented":
      return _getOptionDefaultMessages({ control, value });
    case "switch":
      return typeof value === "boolean"
        ? []
        : ["must be true or false for a switch"];
    case "number":
      return _getNumberDefaultMessages({ control, value });
    case "text":
    case "color":
      return typeof value === "string"
        ? []
        : [`must be a string for a ${control.kind} control`];
  }
}

function _getOptionIssues(options: {
  control: VizSettingControl;
  path: IssuePath;
}): VizTypeIssue[] {
  const { control, path } = options;
  if (control.kind !== "select" && control.kind !== "segmented") {
    return [];
  }
  const values = control.options.map((option) => {
    return option.value;
  });
  return _getRepeatedValues(values).map(({ index, value }) => {
    return {
      path: [...path, "control", "options", index, "value"],
      message: `duplicate option value "${value}"`,
    };
  });
}

function _getRangeIssues(options: {
  control: VizSettingControl;
  path: IssuePath;
}): VizTypeIssue[] {
  const { control, path } = options;
  if (
    control.kind !== "number" ||
    control.min === undefined ||
    control.max === undefined ||
    control.min <= control.max
  ) {
    return [];
  }
  return [
    {
      path: [...path, "control", "min"],
      message: `must not be greater than max (${control.max})`,
    },
  ];
}

function _getSettingIssues(options: {
  setting: VizSetting;
  path: IssuePath;
}): VizTypeIssue[] {
  const { setting, path } = options;
  const { control } = setting;
  const defaultIssues =
    setting.default === undefined
      ? []
      : _getDefaultMessages({ control, value: setting.default }).map(
          (message) => {
            return { path: [...path, "default"], message };
          },
        );
  return [
    ..._getOptionIssues({ control, path }),
    ..._getRangeIssues({ control, path }),
    ...defaultIssues,
  ];
}

function _getVizTypeIssues(options: {
  vizType: VizType;
  path: IssuePath;
}): VizTypeIssue[] {
  const { vizType, path } = options;
  const settingsPath = [...path, "settings"];
  const keys = vizType.settings.map((setting) => {
    return setting.key;
  });
  const keyIssues = _getRepeatedValues(keys).map(({ index, value }) => {
    return {
      path: [...settingsPath, index, "key"],
      message: `duplicate setting key "${value}"`,
    };
  });
  const settingIssues = vizType.settings.flatMap((setting, index) => {
    return _getSettingIssues({ setting, path: [...settingsPath, index] });
  });
  return [...keyIssues, ...settingIssues];
}

/**
 * Gets the problems in a manifest's `contributes.vizTypes` that a per-field
 * schema cannot see: repeated chart type ids, setting keys, and option
 * values, a `default` that does not fit its control or sits on a column
 * picker, and a number control whose `min` exceeds its `max`. The manifest
 * schema reports them as Zod issues.
 */
export function getIssuesFromVizTypes(options: {
  vizTypes: readonly VizType[];
  path: IssuePath;
}): VizTypeIssue[] {
  const { vizTypes, path } = options;
  const ids = vizTypes.map((vizType) => {
    return vizType.id;
  });
  const idIssues = _getRepeatedValues(ids).map(({ index, value }) => {
    return {
      path: [...path, index, "id"],
      message: `duplicate viz type id "${value}"`,
    };
  });
  const vizTypeIssues = vizTypes.flatMap((vizType, index) => {
    return _getVizTypeIssues({ vizType, path: [...path, index] });
  });
  return [...idIssues, ...vizTypeIssues];
}
```

- [ ] **Step 6: Wire `vizTypes` into `PluginManifestSchema.ts`**

In `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`, make these six edits.

Edit 1. Replace lines 1-17 (imports through `ENTRY_PATTERN`):

```ts
import { getIssuesFromWhenCondition } from "@plugin-manifest/PluginManifest/getIssuesFromWhenCondition.ts";
import {
  SLOT_IDS,
  SlotFactRegistry,
} from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import { LOCALIZED_KEY_PATTERN } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";
import { z } from "zod";
import type {
  WhenCondition,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const PLUGIN_ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const COMMAND_ID_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;
const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTRY_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.tsx?$/;
```

with:

```ts
import { getIssuesFromVizTypes } from "@plugin-manifest/PluginManifest/getIssuesFromVizTypes.ts";
import { getIssuesFromWhenCondition } from "@plugin-manifest/PluginManifest/getIssuesFromWhenCondition.ts";
import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  IconNameSchema,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { PluginVizTypeSchema } from "@plugin-manifest/PluginManifest/PluginVizTypeSchema.ts";
import {
  SLOT_IDS,
  SlotFactRegistry,
} from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import { z } from "zod";
import type {
  WhenCondition,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const PLUGIN_ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ENTRY_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.tsx?$/;
```

Edit 2. Replace (old lines 37-47):

```ts
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const LocalizedStringSchema = z
  .string()
  .regex(LOCALIZED_KEY_PATTERN, "must be a %key% reference to locales/en.json");

const IconNameSchema = z
  .string()
  .regex(ICON_NAME_PATTERN, "must be a Tabler icon name, e.g. chart-dots");

const FactValueSchema = z.union([z.string(), z.number(), z.boolean()]);
```

with:

```ts
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const FactValueSchema = z.union([z.string(), z.number(), z.boolean()]);
```

Edit 3. Replace `CommandSchema` (old lines 87-96):

```ts
const CommandSchema = z.strictObject({
  id: z
    .string()
    .regex(
      COMMAND_ID_PATTERN,
      "must be lowercase letters, digits, and hyphens, in dot-separated words",
    ),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
});
```

with:

```ts
const CommandSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
});
```

Edit 4. Replace the `contributes` block (old lines 133-136):

```ts
  contributes: z.strictObject({
    commands: z.array(CommandSchema).default([]),
    menus: MenusSchema.default({}),
  }),
```

with:

```ts
  contributes: z.strictObject({
    commands: z.array(CommandSchema).default([]),
    menus: MenusSchema.default({}),
    vizTypes: z.array(PluginVizTypeSchema).default([]),
  }),
```

Edit 5. Replace the schema export (old lines 195-204):

```ts
/**
 * The schema for a compiled `ava.yaml`. Strict: unknown keys fail, so a typo
 * is a build error rather than a silently ignored setting.
 */
export const PluginManifestSchema = BasePluginManifestSchema.superRefine(
  (manifest, context) => {
    _refineCommands(manifest, context);
    _refineMenus(manifest, context);
  },
);
```

with:

```ts
function _refineVizTypes(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  getIssuesFromVizTypes({
    vizTypes: manifest.contributes.vizTypes,
    path: ["contributes", "vizTypes"],
  }).forEach((issue) => {
    context.addIssue({
      code: "custom",
      path: [...issue.path],
      message: issue.message,
    });
  });
}

/**
 * The schema for a compiled `ava.yaml`. Strict: unknown keys fail, so a typo
 * is a build error rather than a silently ignored setting.
 */
export const PluginManifestSchema = BasePluginManifestSchema.superRefine(
  (manifest, context) => {
    _refineCommands(manifest, context);
    _refineMenus(manifest, context);
    _refineVizTypes(manifest, context);
  },
);
```

Edit 6. Append after the last line (`export type PluginMenuEntry = z.output<typeof MenuItemSchema>;`):

```ts

/**
 * A chart type a plugin declares under `contributes.vizTypes`, for example
 * to list it in a chart picker or to build its settings form.
 */
export type PluginVizType = PluginManifest["contributes"]["vizTypes"][number];

/**
 * One setting of a plugin chart type, in declaration order, for code that
 * builds the chart's settings form or fills in its defaults.
 */
export type PluginVizSetting = PluginVizType["settings"][number];

/**
 * The control a plugin chart setting is edited with, discriminated by
 * `kind`, for example to map it onto a settings form control.
 */
export type PluginVizSettingControl = PluginVizSetting["control"];
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm --filter @avandar/plugin-manifest test src/PluginManifest/PluginManifestSchema.test.ts`
Expected: PASS (55 tests).

- [ ] **Step 8: Export the new types**

In `packages/shared/plugin-manifest/src/runtime.ts`, replace lines 8-13:

```ts
export type {
  PluginCommand,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

with:

```ts
export type {
  PluginCommand,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
  PluginVizSetting,
  PluginVizSettingControl,
  PluginVizType,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

In `packages/shared/plugin-manifest/src/index.ts`, replace lines 7-19:

```ts
export type {
  CompiledPluginManifest,
  FactType,
  FactValue,
  PluginCommand,
  PluginLocaleMessages,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
  SlotId,
  WhenCondition,
  WhenFacts,
} from "@plugin-manifest/runtime.ts";
```

with:

```ts
export type {
  CompiledPluginManifest,
  FactType,
  FactValue,
  PluginCommand,
  PluginLocaleMessages,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
  PluginVizSetting,
  PluginVizSettingControl,
  PluginVizType,
  SlotId,
  WhenCondition,
  WhenFacts,
} from "@plugin-manifest/runtime.ts";
```

In `packages/shared/plugin-manifest/README.md`, insert after line 33 (the `PluginMenuEntry` row):

```md
| `PluginVizType` | Type | main, runtime | A chart type declared under `contributes.vizTypes` |
| `PluginVizSetting` | Type | main, runtime | One setting of a chart type, edited in the chart's settings form |
| `PluginVizSettingControl` | Type | main, runtime | The control a chart setting uses, such as `columnPicker` or `segmented` |
```

- [ ] **Step 9: Add `vizTypes: []` to every `PluginManifest` fixture with a `contributes` object**

Code that reads `manifest.contributes.vizTypes` (Task 2 and the host tasks) would throw on these cast fixtures without it.

`src/lib/plugins/PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx`, old (lines 74-77):

```tsx
      contributes: {
        commands: [{ id: "run", title: `Run ${pluginId}`, icon: "none" }],
        menus: { [SLOT_ID]: [{ command: "run" }] },
      },
```

new:

```tsx
      contributes: {
        commands: [{ id: "run", title: `Run ${pluginId}`, icon: "none" }],
        menus: { [SLOT_ID]: [{ command: "run" }] },
        vizTypes: [],
      },
```

`src/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts`, old (lines 23-28):

```ts
        contributes: {
          commands: [
            { id: "regression.linear", title: "%title%", icon: "trending-up" },
          ],
          menus: { [SLOT_ID]: [{ command: "regression.linear", when }] },
        },
```

new:

```ts
        contributes: {
          commands: [
            { id: "regression.linear", title: "%title%", icon: "trending-up" },
          ],
          menus: { [SLOT_ID]: [{ command: "regression.linear", when }] },
          vizTypes: [],
        },
```

`src/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts`, old (line 8):

```ts
  return { contributes: { commands: [], menus } } as unknown as PluginManifest;
```

new:

```ts
  return {
    contributes: { commands: [], menus, vizTypes: [] },
  } as unknown as PluginManifest;
```

`src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx`, old (lines 101-104):

```tsx
      contributes: {
        commands: [{ id: "run", title: "%name%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
      },
```

new:

```tsx
      contributes: {
        commands: [{ id: "run", title: "%name%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
        vizTypes: [],
      },
```

`src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.test.tsx`, old (lines 21-25):

```tsx
          },
        ),
      },
    },
  } as unknown as PluginManifest;
```

new:

```tsx
          },
        ),
      },
      vizTypes: [],
    },
  } as unknown as PluginManifest;
```

`scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`, old (lines 19-24):

```ts
      contributes: {
        commands: [
          { id: "regression.linear", title: "%t%", icon: "trending-up" },
        ],
        menus: {},
      },
```

new:

```ts
      contributes: {
        commands: [
          { id: "regression.linear", title: "%t%", icon: "trending-up" },
        ],
        menus: {},
        vizTypes: [],
      },
```

- [ ] **Step 10: Run the fixture tests and the whole manifest package**

Run: `pnpm vitest run src/lib/plugins/PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx src/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts src/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.test.tsx scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`
Expected: PASS (6 files, 46 tests).

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS (9 files, 148 tests).

- [ ] **Step 11: Format, type-check, and lint the touched area**

Run: `pnpm format:oxfmt packages/shared/plugin-manifest/src packages/shared/plugin-manifest/README.md src/lib/plugins/PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx src/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts src/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.test.tsx scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`
Expected: exit 0.

Run: `pnpm --filter @avandar/plugin-manifest type-check`
Expected: exit 0.

Run: `pnpm type-check`
Expected: exit 0 (this includes `deno check packages/shared`, which covers the new `.ts`-extension imports).

Run: `pnpm exec eslint packages/shared/plugin-manifest src/lib/plugins src/views/WorkspaceSettingsPage/WorkspacePluginsTab scripts/vite-plugin-ava-plugins/makePluginModuleSources`
Expected: exit 0.

- [ ] **Step 12: Commit**

```bash
git add packages/shared/plugin-manifest/src/PluginManifest/manifestFieldSchemas.ts \
  packages/shared/plugin-manifest/src/PluginManifest/PluginVizTypeSchema.ts \
  packages/shared/plugin-manifest/src/PluginManifest/getIssuesFromVizTypes.ts \
  packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts \
  packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts \
  packages/shared/plugin-manifest/src/runtime.ts \
  packages/shared/plugin-manifest/src/index.ts \
  packages/shared/plugin-manifest/README.md \
  src/lib/plugins/PluginHost/__tests__/pluginHostMenuItems.integration.test.tsx \
  src/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins.test.ts \
  src/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest.test.ts \
  src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.test.tsx \
  src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.test.tsx \
  scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): declare chart types in the plugin manifest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 2: Manifest: locale keys and icons for viz types

**Files:**
- Modify: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts` (type import line 5, `getMessageKeysFromManifest` lines 90-107)
- Modify: `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts` (`_getIconIssues` lines 171-176)
- Modify: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts` (`_getDistinctIconNamesFromPlugin` lines 43-53)
- Test: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`
- Test: `packages/shared/plugin-manifest/src/node/__tests__/readPluginFolders.integration.test.ts`
- Test: `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`

**Context:** Implements the rest of C1: the compiler checks every viz `title`, setting `label`, option `label`, `number.unit`, and `text.placeholder` against `locales/en.json` and copies them into the compiled `strings`; both icon sites (validation and the virtual manifest module's Tabler imports) include each viz `icon`. Relies on Task 1 (the schema, the `PluginVizType` and `PluginVizSettingControl` types, and `vizTypes: []` in the `makePluginModuleSources.test.ts` fixture). The two icon lists are separate code today (`ref-plugin-packages.md` section 0, fact 9), so both change. `scripts/` tests run with the root Vitest config.

- [ ] **Step 1: Write the failing compiler tests**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`, insert after the `_getIssues` helper (after line 57):

```ts
const VIZ_YAML = `${VALID_YAML}  vizTypes:
    - id: epicurve
      title: "%viz.title%"
      icon: chart-histogram
      render: transform
      settings:
        - key: interval
          label: "%viz.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.interval.day%" }
              - { value: week, label: "%viz.interval.week%" }
        - key: windowSize
          label: "%viz.windowSize%"
          control: { kind: number, unit: "%viz.windowSize.unit%" }
        - key: caption
          label: "%viz.caption%"
          control: { kind: text, placeholder: "%viz.caption.placeholder%" }
`;

const VIZ_EN_MESSAGES: Record<string, string> = {
  ...LOCALES.en,
  "viz.title": "Epidemic curve",
  "viz.interval": "Interval",
  "viz.interval.day": "Day",
  "viz.interval.week": "Week",
  "viz.windowSize": "Window",
  "viz.windowSize.unit": "days",
  "viz.caption": "Caption",
  "viz.caption.placeholder": "Add a caption",
};

function _omitVizMessage(key: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(VIZ_EN_MESSAGES).filter(([candidateKey]) => {
      return candidateKey !== key;
    }),
  );
}
```

Append inside `describe("compileManifest", ...)`, before its closing `});` (after the `it.each` ending at line 240):

```ts

  describe("viz type strings", () => {
    it.each([
      ["title", "viz.title"],
      ["setting label", "viz.windowSize"],
      ["option label", "viz.interval.week"],
      ["number unit", "viz.windowSize.unit"],
      ["text placeholder", "viz.caption.placeholder"],
    ])("requires a viz type's %s in locales/en.json", (_label, key) => {
      expect(
        _getIssues(() => {
          return _compile(VIZ_YAML, { en: _omitVizMessage(key) });
        }),
      ).toEqual([`"${key}" is referenced but missing from locales/en.json`]);
    });

    it("keeps every viz type string in the compiled strings", () => {
      const { strings } = _compile(VIZ_YAML, { en: VIZ_EN_MESSAGES });
      expect(strings.en).toEqual({
        "plugin.name": "Epidemiology",
        "plugin.description": "Statistical tools.",
        "regression.linear.title": "Linear regression",
        "viz.title": "Epidemic curve",
        "viz.interval": "Interval",
        "viz.interval.day": "Day",
        "viz.interval.week": "Week",
        "viz.windowSize": "Window",
        "viz.windowSize.unit": "days",
        "viz.caption": "Caption",
        "viz.caption.placeholder": "Add a caption",
      });
    });
  });
```

- [ ] **Step 2: Write the failing icon tests**

In `packages/shared/plugin-manifest/src/node/__tests__/readPluginFolders.integration.test.ts`, insert after the `_getError` helper (after line 78):

```ts
function _writePluginWithVizTypeIcon(iconName: string): string {
  const vizTypeYaml = [
    "  vizTypes:",
    "    - id: hello-chart",
    '      title: "%viz.title%"',
    `      icon: ${iconName}`,
    "      render: transform",
    "",
  ].join("\n");
  return _writePlugin("hello", {
    yaml: `${MANIFEST_YAML}${vizTypeYaml}`,
    localeFiles: {
      "en.json": JSON.stringify({
        ...DEFAULT_LOCALE_MESSAGES,
        "viz.title": "Hello chart",
      }),
    },
  });
}
```

Insert inside `describe("readPluginDirectory", ...)`, after the test "reports every icon as unknown when the Tabler icons directory is missing" (after line 142):

```ts

  it("reports an unknown viz type icon", () => {
    const directory = _writePluginWithVizTypeIcon("no-such-chart");
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual(['unknown Tabler icon "no-such-chart"']);
  });

  it("accepts a viz type icon that exists in the Tabler icons directory", () => {
    writeFileSync(
      join(repoRoot, ICONS_DIRECTORY_PATH, "IconChartHistogram.mjs"),
      "",
    );
    const directory = _writePluginWithVizTypeIcon("chart-histogram");
    const plugin = readPluginDirectory({ directory, repoRoot });
    expect(
      plugin.compiled.manifest.contributes.vizTypes.map((vizType) => {
        return vizType.icon;
      }),
    ).toEqual(["chart-histogram"]);
  });
```

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`, insert after `_makePluginWithIcons` (after the function that ends at line 53, before `_getIconImportBindings`):

```ts

/** A copy of `PLUGIN` that declares one viz type per icon name. */
function _makePluginWithVizTypeIcons(vizTypeIcons: string[]): PluginDirectory {
  const { manifest } = PLUGIN.compiled;
  return {
    ...PLUGIN,
    compiled: {
      ...PLUGIN.compiled,
      manifest: {
        ...manifest,
        contributes: {
          ...manifest.contributes,
          vizTypes: vizTypeIcons.map((icon, index) => {
            return {
              id: `chart-${index}`,
              title: "%t%",
              icon,
              render: "transform" as const,
              settings: [],
            };
          }),
        },
      },
    },
  };
}
```

Insert inside `describe("makeManifestModuleSourceFromPlugin", ...)`, after the test "imports each distinct icon once and exports manifest, strings, icons":

```ts

  it("imports the icon each viz type names", () => {
    const code = makeManifestModuleSourceFromPlugin(
      _makePluginWithVizTypeIcons(["chart-histogram"]),
    );
    expect(_getIconImportBindings(code)).toEqual([
      "IconChartDots",
      "IconTrendingUp",
      "IconChartHistogram",
    ]);
  });
```

- [ ] **Step 3: Run them and confirm they fail**

Run: `pnpm --filter @avandar/plugin-manifest test src/compileManifest/compileManifest.test.ts`
Expected: FAIL, 6 tests: the five "requires a viz type's ..." rows (the compile succeeds, so `_getIssues` reaches `expect.unreachable()`), and "keeps every viz type string in the compiled strings" (`strings.en` has no `viz.*` keys).

Run: `pnpm --filter @avandar/plugin-manifest test src/node/__tests__/readPluginFolders.integration.test.ts`
Expected: FAIL, 1 test: "reports an unknown viz type icon" (`readPluginDirectory` does not throw).

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`
Expected: FAIL, 1 test: "imports the icon each viz type names" (the bindings are `["IconChartDots", "IconTrendingUp"]`).

- [ ] **Step 4: Collect viz type strings in `compileManifest.ts`**

In `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts`, replace line 5:

```ts
import type { PluginManifest } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

with:

```ts
import type {
  PluginManifest,
  PluginVizSettingControl,
  PluginVizType,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

Replace lines 90-107 (the `getMessageKeysFromManifest` docstring and function):

```ts
/**
 * Gets each distinct message key the manifest's user-facing strings
 * reference, so the compiler can check that the locale files define them.
 */
export function getMessageKeysFromManifest(manifest: PluginManifest): string[] {
  const values = [
    manifest.name,
    manifest.description,
    ...manifest.contributes.commands.map((command) => {
      return command.title;
    }),
  ];
  const keys = values.flatMap((value) => {
    const key = getMessageKeyFromManifestString(value);
    return key === undefined ? [] : [key];
  });
  return [...new Set(keys)];
}
```

with:

```ts
function _getControlStrings(control: PluginVizSettingControl): string[] {
  switch (control.kind) {
    case "select":
    case "segmented":
      return control.options.map((option) => {
        return option.label;
      });
    case "number":
      return control.unit === undefined ? [] : [control.unit];
    case "text":
      return control.placeholder === undefined ? [] : [control.placeholder];
    case "columnPicker":
    case "switch":
    case "color":
      return [];
  }
}

function _getVizTypeStrings(vizType: PluginVizType): string[] {
  return [
    vizType.title,
    ...vizType.settings.flatMap((setting) => {
      return [setting.label, ..._getControlStrings(setting.control)];
    }),
  ];
}

/**
 * Gets each distinct message key the manifest's user-facing strings
 * reference, so the compiler can check that the locale files define them.
 */
export function getMessageKeysFromManifest(manifest: PluginManifest): string[] {
  const values = [
    manifest.name,
    manifest.description,
    ...manifest.contributes.commands.map((command) => {
      return command.title;
    }),
    ...manifest.contributes.vizTypes.flatMap((vizType) => {
      return _getVizTypeStrings(vizType);
    }),
  ];
  const keys = values.flatMap((value) => {
    const key = getMessageKeyFromManifestString(value);
    return key === undefined ? [] : [key];
  });
  return [...new Set(keys)];
}
```

- [ ] **Step 5: Check viz type icons in `readPluginDirectory.ts`**

In `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts`, replace lines 171-176:

```ts
  const iconNames = new Set([
    manifest.icon,
    ...manifest.contributes.commands.map((command) => {
      return command.icon;
    }),
  ]);
```

with:

```ts
  const iconNames = new Set([
    manifest.icon,
    ...manifest.contributes.commands.map((command) => {
      return command.icon;
    }),
    ...manifest.contributes.vizTypes.map((vizType) => {
      return vizType.icon;
    }),
  ]);
```

- [ ] **Step 6: Bundle viz type icons in `makePluginModuleSources.ts`**

In `scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts`, replace lines 43-53:

```ts
function _getDistinctIconNamesFromPlugin(plugin: PluginDirectory): string[] {
  const { manifest } = plugin.compiled;
  return [
    ...new Set([
      manifest.icon,
      ...manifest.contributes.commands.map((command) => {
        return command.icon;
      }),
    ]),
  ];
}
```

with:

```ts
function _getDistinctIconNamesFromPlugin(plugin: PluginDirectory): string[] {
  const { manifest } = plugin.compiled;
  return [
    ...new Set([
      manifest.icon,
      ...manifest.contributes.commands.map((command) => {
        return command.icon;
      }),
      ...manifest.contributes.vizTypes.map((vizType) => {
        return vizType.icon;
      }),
    ]),
  ];
}
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm --filter @avandar/plugin-manifest test src/compileManifest/compileManifest.test.ts`
Expected: PASS (27 tests).

Run: `pnpm --filter @avandar/plugin-manifest test src/node/__tests__/readPluginFolders.integration.test.ts`
Expected: PASS (26 tests).

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts`
Expected: PASS (7 tests).

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS (9 files, 156 tests).

- [ ] **Step 8: Format, type-check, and lint the touched area**

Run: `pnpm format:oxfmt packages/shared/plugin-manifest/src scripts/vite-plugin-ava-plugins/makePluginModuleSources`
Expected: exit 0.

Run: `pnpm --filter @avandar/plugin-manifest type-check`
Expected: exit 0.

Run: `pnpm type-check`
Expected: exit 0.

Run: `pnpm exec eslint packages/shared/plugin-manifest scripts/vite-plugin-ava-plugins/makePluginModuleSources`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts \
  packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts \
  packages/shared/plugin-manifest/src/node/readPluginDirectory.ts \
  packages/shared/plugin-manifest/src/node/__tests__/readPluginFolders.integration.test.ts \
  scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.ts \
  scripts/vite-plugin-ava-plugins/makePluginModuleSources/makePluginModuleSources.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): check chart type strings and icons when compiling plugins

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 3: SDK: `PluginViz.types.ts`, `PluginDefinition.vizTypes`, `definePlugin`, `isPluginDefinition`, exports

**Files:**
- Create: `packages/web/plugin-sdk/src/PluginViz.types.ts`
- Modify: `packages/web/plugin-sdk/src/PluginApi.types.ts` (import line 1, `PluginDefinition` lines 120-129)
- Modify: `packages/web/plugin-sdk/src/definePlugin/definePlugin.ts` (whole file)
- Modify: `packages/web/plugin-sdk/src/index.ts` (append a type export after line 27)
- Modify: `packages/web/plugin-sdk/README.md` (rows at lines 13, 14, and after line 23)
- Modify: `src/lib/plugins/runPluginCommand/runPluginCommand.test.ts` (literal definitions at lines 114 and 126-131)
- Test: `packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts`

**Context:** Implements contract C2's types and definition: `PluginViz.types.ts` exactly as C2 specifies, `PluginDefinition.vizTypes`, `definePlugin` with optional `commands` and `vizTypes` (both default to `{}`), and `isPluginDefinition` requiring an object `vizTypes`. `packages/web/**` imports are extensionless (`@plugin-sdk/...`). Callers checked: `plugins/epidemiology/src/index.tsx` and the CLI scaffold entry text (`makePluginScaffoldFilesFromName.ts`) call `definePlugin({ commands })`, which stays valid; `runPluginCommand.ts` is unchanged. Two `runPluginCommand.test.ts` cases build definitions by hand: they gain `vizTypes: {}` so they keep failing for the reason their names state (a non-function handler, a throwing getter) rather than because `isPluginDefinition` now rejects them. `PluginCodeModule.definition` is typed `unknown`, so no type-check fallout.

- [ ] **Step 1: Write the failing tests**

Replace `packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts` with:

```ts
import {
  definePlugin,
  isPluginDefinition,
} from "@plugin-sdk/definePlugin/definePlugin";
import { describe, expect, it } from "vitest";
import type { PluginVizTransformResult } from "@plugin-sdk/PluginViz.types";

function _makeEmptyBarChart(): PluginVizTransformResult {
  return { rows: [], chart: { kind: "bar", xColumn: "bucket", series: [] } };
}

describe("definePlugin", () => {
  it("marks the definition so the host can recognize it", () => {
    const definition = definePlugin({ commands: { hello: () => {} } });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("keeps the chart types it was given", () => {
    const vizTypes = { epicurve: { transform: _makeEmptyBarChart } };
    expect(definePlugin({ vizTypes }).vizTypes).toBe(vizTypes);
  });

  it("defaults the chart types to none when a plugin declares only commands", () => {
    expect(definePlugin({ commands: {} }).vizTypes).toEqual({});
  });

  it("defaults the commands to none when a plugin declares only chart types", () => {
    const definition = definePlugin({
      vizTypes: { epicurve: { transform: _makeEmptyBarChart } },
    });
    expect(definition.commands).toEqual({});
  });

  it("recognizes a definition that declares only chart types", () => {
    const definition = definePlugin({
      vizTypes: { epicurve: { transform: _makeEmptyBarChart } },
    });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("rejects values that are not plugin definitions", () => {
    expect(isPluginDefinition({ commands: {} })).toBe(false);
    expect(isPluginDefinition(undefined)).toBe(false);
  });

  it("rejects a definition whose commands are missing", () => {
    expect(isPluginDefinition({ kind: "avandar-plugin", vizTypes: {} })).toBe(
      false,
    );
    expect(
      isPluginDefinition({
        kind: "avandar-plugin",
        commands: null,
        vizTypes: {},
      }),
    ).toBe(false);
  });

  it("rejects a definition whose chart types are missing", () => {
    expect(isPluginDefinition({ kind: "avandar-plugin", commands: {} })).toBe(
      false,
    );
    expect(
      isPluginDefinition({
        kind: "avandar-plugin",
        commands: {},
        vizTypes: null,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @avandar/plugin-sdk test src/definePlugin/definePlugin.test.ts`
Expected: FAIL, 5 tests: "keeps the chart types it was given", both "defaults ..." tests (the fields are `undefined`), "recognizes a definition that declares only chart types" (`commands` is `undefined`), and "rejects a definition whose chart types are missing" (`isPluginDefinition` returns `true`). The type-only import of `@plugin-sdk/PluginViz.types` is erased, so the file loads.

- [ ] **Step 3: Create `PluginViz.types.ts`**

`packages/web/plugin-sdk/src/PluginViz.types.ts`:

```ts
import type {
  AvandarApi,
  PluginColumnDataType,
} from "@plugin-sdk/PluginApi.types";
import type { ComponentType } from "react";

/**
 * A value a chart setting holds: an option value, text, or a color as a
 * string, a number, or a switch's boolean. A column setting holds the
 * column's name.
 */
export type PluginVizSettingValue = string | number | boolean;

/**
 * What a plugin chart receives each time it draws: the query result rows,
 * the result's columns, and the settings chosen in the chart's settings
 * form. Both a transform and a chart component read it.
 */
export type PluginVizInput = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  columns: ReadonlyArray<
    Readonly<{ name: string; dataType: PluginColumnDataType }>
  >;
  /** Column settings arrive as column names. Unset settings are undefined. */
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
  /**
   * True when `rows` holds only the first part of the result, so a chart can
   * say that it was built from partial data.
   */
  isTruncated: boolean;
}>;

/**
 * What a transform receives besides its input: the plugin's translator and
 * the viewer's locale, for example to label an "Other" series or to format
 * a date.
 */
export type PluginVizContext = Readonly<{
  i18n: AvandarApi["i18n"];
  locale: string;
}>;

/**
 * The built-in chart a transform asks Avandar to draw from its output rows.
 * Avandar draws it as one of its own bar, line, or area charts.
 *
 * - `xColumn`: the output column on the x axis.
 * - `xColumnType`: `date` formats the x values as dates in the viewer's
 *   locale. Defaults to `category`.
 * - `series`: one entry per output column drawn as a series. A `label` is
 *   shown as written, so translate it with `i18n.t` first.
 * - `layout`: whether series sit side by side or stack. Defaults to `group`.
 * - `barGap`: `none` draws bars with no gap between categories, as a
 *   histogram does. Used by bar charts only.
 */
export type PluginChartSpec = Readonly<{
  kind: "bar" | "line" | "area";
  xColumn: string;
  xColumnType?: "category" | "date";
  series: ReadonlyArray<Readonly<{ column: string; label?: string }>>;
  layout?: "group" | "stack";
  barGap?: "default" | "none";
}>;

/** What a transform returns: the rows to chart and how to chart them. */
export type PluginVizTransformResult = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  chart: PluginChartSpec;
}>;

/**
 * Turns a chart's input into rows plus a built-in chart spec, for example
 * to bucket dates into an epidemic curve. A plugin declares it as a chart
 * type's `transform` in `definePlugin`. When it throws, Avandar shows an
 * error in the chart area instead of the chart.
 */
export type PluginVizTransform = (
  input: PluginVizInput,
  context: PluginVizContext,
) => PluginVizTransformResult;

/**
 * The props of a plugin chart component: the chart's input plus the width
 * and height, in pixels, of the area Avandar measured for it.
 */
export type PluginVizComponentProps = PluginVizInput &
  Readonly<{ width: number; height: number }>;

/**
 * How a plugin draws one chart type, keyed by the chart type's id in
 * `definePlugin`'s `vizTypes`. A `transform` hands Avandar rows and a chart
 * spec to draw. A `Component` draws the chart itself, for example with
 * `@avandar/plugin-ui/charts`. Use the one the manifest's `render` names.
 */
export type PluginVizDefinition =
  | Readonly<{ transform: PluginVizTransform; Component?: undefined }>
  | Readonly<{
      Component: ComponentType<PluginVizComponentProps>;
      transform?: undefined;
    }>;
```

- [ ] **Step 4: Add `vizTypes` to `PluginDefinition`**

In `packages/web/plugin-sdk/src/PluginApi.types.ts`, replace line 1:

```ts
import type { ReactNode } from "react";
```

with:

```ts
import type { PluginVizDefinition } from "@plugin-sdk/PluginViz.types";
import type { ReactNode } from "react";
```

Replace lines 120-129 (the `PluginDefinition` docstring and type):

```ts
/** What a plugin's entry module exports as its default. */
export type PluginDefinition = Readonly<{
  /** The marker the host checks before it runs anything in the module. */
  kind: "avandar-plugin";
  /**
   * The handlers, keyed by the command ids the plugin declares in its
   * `ava.yaml`.
   */
  commands: Readonly<Record<string, CommandHandler>>;
}>;
```

with:

```ts
/** What a plugin's entry module exports as its default. */
export type PluginDefinition = Readonly<{
  /** The marker the host checks before it runs anything in the module. */
  kind: "avandar-plugin";
  /**
   * The handlers, keyed by the command ids the plugin declares in its
   * `ava.yaml`.
   */
  commands: Readonly<Record<string, CommandHandler>>;
  /**
   * How each chart type draws, keyed by the chart type ids the plugin
   * declares under `contributes.vizTypes` in its `ava.yaml`.
   */
  vizTypes: Readonly<Record<string, PluginVizDefinition>>;
}>;
```

- [ ] **Step 5: Rewrite `definePlugin.ts`**

Replace `packages/web/plugin-sdk/src/definePlugin/definePlugin.ts` with:

```ts
import type {
  CommandHandler,
  PluginDefinition,
} from "@plugin-sdk/PluginApi.types";
import type { PluginVizDefinition } from "@plugin-sdk/PluginViz.types";

function _isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * True when `value` came from `definePlugin`. The host uses it to check that
 * a plugin's entry module exported a definition before it runs a command or
 * draws a chart.
 */
export function isPluginDefinition(value: unknown): value is PluginDefinition {
  if (!_isObject(value)) {
    return false;
  }
  const { kind, commands, vizTypes } = value as {
    kind?: unknown;
    commands?: unknown;
    vizTypes?: unknown;
  };
  return (
    kind === "avandar-plugin" && _isObject(commands) && _isObject(vizTypes)
  );
}

/**
 * Declares a plugin's command handlers and chart types, each keyed by the id
 * its `ava.yaml` declares. Either may be left out when the plugin has none.
 * The plugin's entry module must export the result as its default export.
 */
export function definePlugin({
  commands = {},
  vizTypes = {},
}: Readonly<{
  commands?: Readonly<Record<string, CommandHandler>>;
  vizTypes?: Readonly<Record<string, PluginVizDefinition>>;
}>): PluginDefinition {
  return { kind: "avandar-plugin", commands, vizTypes };
}
```

- [ ] **Step 6: Export the chart types from the SDK**

In `packages/web/plugin-sdk/src/index.ts`, append after line 27 (`} from "@plugin-sdk/PluginApi.types";`):

```ts
export type {
  PluginChartSpec,
  PluginVizComponentProps,
  PluginVizContext,
  PluginVizDefinition,
  PluginVizInput,
  PluginVizSettingValue,
  PluginVizTransform,
  PluginVizTransformResult,
} from "@plugin-sdk/PluginViz.types";
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm --filter @avandar/plugin-sdk test src/definePlugin/definePlugin.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: Keep the hand-built definitions in `runPluginCommand.test.ts` valid**

In `src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`, replace line 114:

```ts
          definition: { kind: "avandar-plugin", commands: { hello: "nope" } },
```

with:

```ts
          definition: {
            kind: "avandar-plugin",
            commands: { hello: "nope" },
            vizTypes: {},
          },
```

Replace the block that was lines 126-131 before the edit above:

```ts
          definition: {
            kind: "avandar-plugin",
            get commands(): never {
              throw new Error("hostile getter");
            },
          },
```

with:

```ts
          definition: {
            kind: "avandar-plugin",
            get commands(): never {
              throw new Error("hostile getter");
            },
            vizTypes: {},
          },
```

Run: `pnpm vitest run src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 9: Update the SDK README**

In `packages/web/plugin-sdk/README.md`, replace line 13:

```md
| `definePlugin` | Function | Declares a plugin's command handlers. A plugin's entry module exports the result as its default export |
```

with:

```md
| `definePlugin` | Function | Declares a plugin's command handlers and chart types. A plugin's entry module exports the result as its default export |
```

Replace line 14:

```md
| `isPluginDefinition` | Function | Checks that a value came from `definePlugin`, so a host can validate a plugin's entry module before it runs a command |
```

with:

```md
| `isPluginDefinition` | Function | Checks that a value came from `definePlugin`, so a host can validate a plugin's entry module before it runs a command or draws a chart |
```

Insert after line 23 (the `PluginDefinition` row):

```md
| `PluginVizDefinition` | Type | How a plugin draws one chart type: a `transform` or a `Component` |
| `PluginVizTransform` | Type | Turns a chart's input into rows plus a `PluginChartSpec` |
| `PluginVizTransformResult` | Type | What a transform returns: the rows and the chart spec |
| `PluginChartSpec` | Type | The built-in bar, line, or area chart a transform asks Avandar to draw |
| `PluginVizInput` | Type | What a chart receives: rows, columns, settings, and whether the rows are truncated |
| `PluginVizContext` | Type | The translator and locale a transform receives |
| `PluginVizComponentProps` | Type | A chart component's props: its input plus the measured width and height |
| `PluginVizSettingValue` | Type | A value a chart setting holds |
```

- [ ] **Step 10: Run the SDK suite, format, type-check, and lint**

Run: `pnpm --filter @avandar/plugin-sdk test`
Expected: PASS (4 files, 39 tests).

Run: `pnpm format:oxfmt packages/web/plugin-sdk/src packages/web/plugin-sdk/README.md src/lib/plugins/runPluginCommand/runPluginCommand.test.ts`
Expected: exit 0.

Run: `pnpm --filter @avandar/plugin-sdk type-check`
Expected: exit 0.

Run: `pnpm type-check`
Expected: exit 0.

Run: `pnpm exec eslint packages/web/plugin-sdk src/lib/plugins/runPluginCommand plugins/epidemiology/src/index.tsx`
Expected: exit 0.

- [ ] **Step 11: Commit**

```bash
git add packages/web/plugin-sdk/src/PluginViz.types.ts \
  packages/web/plugin-sdk/src/PluginApi.types.ts \
  packages/web/plugin-sdk/src/definePlugin/definePlugin.ts \
  packages/web/plugin-sdk/src/definePlugin/definePlugin.test.ts \
  packages/web/plugin-sdk/src/index.ts \
  packages/web/plugin-sdk/README.md \
  src/lib/plugins/runPluginCommand/runPluginCommand.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): let definePlugin declare chart types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 4: SDK: `PluginVizProvider`, `useT` fallback, `useAvandar` error inside charts

**Files:**
- Create: `packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.tsx`
- Create: `packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.test.tsx`
- Modify: `packages/web/plugin-sdk/src/AvandarContext/AvandarContext.tsx` (whole file)
- Modify: `packages/web/plugin-sdk/src/index.ts` (value export after line 11)
- Modify: `packages/web/plugin-sdk/README.md` (rows at lines 16-18)
- Modify: `docs/avandar-packages.md` (the `@avandar/plugin-sdk` paragraph, lines 205-210)
- Test: `packages/web/plugin-sdk/src/AvandarContext/AvandarContext.test.tsx`

**Context:** Implements the rest of C2: `PluginVizProvider({ vizId, t, children })` and the `useT` and `useAvandar` behavior inside a chart. The host's `PluginVizComponentView` (Task 13) renders `PluginVizProvider` around a chart component with no `AvandarProvider`, including on public dashboards. Hooks are called unconditionally (both contexts are read before any branch), so `react-hooks/rules-of-hooks` stays satisfied. The context is read through `usePluginVizContext()`, an SDK-internal hook that is not exported from `src/index.ts`. Its React context constant is named `PluginVizProviderContext` so it is not confused with the `PluginVizContext` transform type from Task 3. SDK tests use `renderHook` from `@testing-library/react` and silence React's render-error log with a `console.error` spy, as the existing tests do. Relies on Task 3 only for the shared `index.ts`.

- [ ] **Step 1: Write the failing provider test**

`packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.test.tsx`:

```tsx
import {
  PluginVizProvider,
  usePluginVizContext,
} from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

function _translateForChart(key: string): string {
  return `chart:${key}`;
}

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <PluginVizProvider vizId="epicurve" t={_translateForChart}>
      {children}
    </PluginVizProvider>
  );
}

describe("PluginVizProvider", () => {
  it("gives its children the chart type id it was given", () => {
    const { result } = renderHook(usePluginVizContext, { wrapper: _wrapper });
    expect(result.current?.vizId).toBe("epicurve");
  });

  it("gives its children the translator it was given", () => {
    const { result } = renderHook(usePluginVizContext, { wrapper: _wrapper });
    expect(result.current?.t).toBe(_translateForChart);
  });
});

describe("usePluginVizContext", () => {
  it("returns undefined outside a PluginVizProvider", () => {
    const { result } = renderHook(usePluginVizContext);
    expect(result.current).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @avandar/plugin-sdk test src/PluginVizContext/PluginVizContext.test.tsx`
Expected: FAIL, `Failed to resolve import "@plugin-sdk/PluginVizContext/PluginVizContext"`.

- [ ] **Step 3: Create `PluginVizContext.tsx`**

`packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.tsx`:

```tsx
import { createContext, useContext, useMemo } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

/** The chart type a component draws inside, and the plugin's translator. */
type PluginVizProviderValue = Readonly<{
  vizId: string;
  t: AvandarApi["i18n"]["t"];
}>;

type Props = {
  vizId: string;
  t: AvandarApi["i18n"]["t"];
  children: ReactNode;
};

const PluginVizProviderContext = createContext<
  PluginVizProviderValue | undefined
>(undefined);

/**
 * Marks its children as a plugin chart, so `useT` inside them returns the
 * chart's translator and `useAvandar` explains that a chart has no scoped
 * API. A host renders it around a plugin's chart component, for example in
 * a dashboard tile or on a public dashboard.
 */
export function PluginVizProvider({
  vizId,
  t,
  children,
}: Readonly<Props>): ReactNode {
  const value = useMemo(() => {
    return { vizId, t };
  }, [vizId, t]);
  return (
    <PluginVizProviderContext.Provider value={value}>
      {children}
    </PluginVizProviderContext.Provider>
  );
}

/**
 * The chart type id and translator of the nearest `PluginVizProvider`, or
 * undefined outside one. Read by `useT` and `useAvandar`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePluginVizContext(): PluginVizProviderValue | undefined {
  return useContext(PluginVizProviderContext);
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm --filter @avandar/plugin-sdk test src/PluginVizContext/PluginVizContext.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing hook tests**

Replace `packages/web/plugin-sdk/src/AvandarContext/AvandarContext.test.tsx` with:

```tsx
import {
  AvandarProvider,
  useAvandar,
  useT,
} from "@plugin-sdk/AvandarContext/AvandarContext";
import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { PluginVizProvider } from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

const API = {
  i18n: {
    t: (key: string) => {
      return `t:${key}`;
    },
  },
} as unknown as AvandarApi;

function _translateForChart(key: string): string {
  return `chart:${key}`;
}

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return <AvandarProvider api={API}>{children}</AvandarProvider>;
}

function _chartWrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <PluginVizProvider vizId="epicurve" t={_translateForChart}>
      {children}
    </PluginVizProvider>
  );
}

function _chartInPluginUiWrapper({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <AvandarProvider api={API}>
      <PluginVizProvider vizId="epicurve" t={_translateForChart}>
        {children}
      </PluginVizProvider>
    </AvandarProvider>
  );
}

describe("useAvandar", () => {
  it("returns the API inside an AvandarProvider", () => {
    const { result } = renderHook(useAvandar, { wrapper: _wrapper });
    expect(result.current).toBe(API);
  });

  describe("outside an AvandarProvider", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws a PluginError", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(PluginError);
    });

    it("throws with the CommandFailed code", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(expect.objectContaining({ code: "CommandFailed" }));
    });

    it("throws a message that says where the hook can be used", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(/inside plugin UI/);
    });
  });

  describe("inside a plugin chart", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws with the CommandFailed code", () => {
      expect(() => {
        return renderHook(useAvandar, { wrapper: _chartWrapper });
      }).toThrow(expect.objectContaining({ code: "CommandFailed" }));
    });

    it("throws a message that names the chart type", () => {
      expect(() => {
        return renderHook(useAvandar, { wrapper: _chartWrapper });
      }).toThrow(
        'useAvandar() is not available inside the "epicurve" chart. Use useT() for strings.',
      );
    });
  });

  it("exposes the plugin translator through useT", () => {
    const { result } = renderHook(useT, { wrapper: _wrapper });
    expect(result.current("hello")).toBe("t:hello");
  });
});

describe("useT", () => {
  it("returns the chart translator inside a PluginVizProvider", () => {
    const { result } = renderHook(useT, { wrapper: _chartWrapper });
    expect(result.current("hello")).toBe("chart:hello");
  });

  it("returns the plugin UI translator for a chart inside plugin UI", () => {
    const { result } = renderHook(useT, { wrapper: _chartInPluginUiWrapper });
    expect(result.current("hello")).toBe("t:hello");
  });

  describe("outside both providers", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws a PluginError", () => {
      expect(() => {
        return renderHook(useT);
      }).toThrow(PluginError);
    });
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm --filter @avandar/plugin-sdk test src/AvandarContext/AvandarContext.test.tsx`
Expected: FAIL, 2 tests: "throws a message that names the chart type" (the message is still `useAvandar() must be called inside plugin UI opened through avandar.ui`) and "returns the chart translator inside a PluginVizProvider" (`useT` throws). The other 8 pass.

- [ ] **Step 7: Rewrite `AvandarContext.tsx`**

Replace `packages/web/plugin-sdk/src/AvandarContext/AvandarContext.tsx` with:

```tsx
import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { usePluginVizContext } from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { createContext, useContext } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

type Props = {
  api: AvandarApi;
  children: ReactNode;
};

const OUTSIDE_PLUGIN_UI_MESSAGE =
  "useAvandar() must be called inside plugin UI opened through avandar.ui";

const AvandarApiContext = createContext<AvandarApi | undefined>(undefined);

/**
 * Gives plugin UI access to its scoped `avandar` API. The host renders it
 * around the content of every modal or drawer a plugin opens.
 */
export function AvandarProvider({ api, children }: Readonly<Props>): ReactNode {
  return (
    <AvandarApiContext.Provider value={api}>
      {children}
    </AvandarApiContext.Provider>
  );
}

/**
 * The scoped `avandar` API, for components inside plugin UI. Throws a
 * `PluginError` when called outside an `AvandarProvider`. Inside a plugin
 * chart the error names the chart type, because charts get only `useT`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAvandar(): AvandarApi {
  const api = useContext(AvandarApiContext);
  const chart = usePluginVizContext();
  if (api !== undefined) {
    return api;
  }
  if (chart !== undefined) {
    throw new PluginError(
      "CommandFailed",
      `useAvandar() is not available inside the "${chart.vizId}" chart. Use useT() for strings.`,
    );
  }
  throw new PluginError("CommandFailed", OUTSIDE_PLUGIN_UI_MESSAGE);
}

/**
 * The plugin's translator, for components inside plugin UI or a plugin
 * chart. Throws a `PluginError` outside both an `AvandarProvider` and a
 * `PluginVizProvider`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useT(): AvandarApi["i18n"]["t"] {
  const api = useContext(AvandarApiContext);
  const chart = usePluginVizContext();
  if (api !== undefined) {
    return api.i18n.t;
  }
  if (chart !== undefined) {
    return chart.t;
  }
  throw new PluginError("CommandFailed", OUTSIDE_PLUGIN_UI_MESSAGE);
}
```

- [ ] **Step 8: Run it and confirm it passes**

Run: `pnpm --filter @avandar/plugin-sdk test src/AvandarContext/AvandarContext.test.tsx`
Expected: PASS (10 tests).

- [ ] **Step 9: Export `PluginVizProvider` and update the docs**

In `packages/web/plugin-sdk/src/index.ts`, insert after line 11 (`export { PluginError } from "@plugin-sdk/PluginError/PluginError";`):

```ts
export { PluginVizProvider } from "@plugin-sdk/PluginVizContext/PluginVizContext";
```

In `packages/web/plugin-sdk/README.md`, replace lines 16-18:

```md
| `AvandarProvider` | Component | Gives plugin UI access to its scoped `avandar` API. The host renders it around content a plugin opens |
| `useAvandar` | Hook | Gets the scoped `avandar` API inside plugin UI. Throws a `PluginError` outside an `AvandarProvider` |
| `useT` | Hook | Gets the plugin's translator inside plugin UI |
```

with:

```md
| `AvandarProvider` | Component | Gives plugin UI access to its scoped `avandar` API. The host renders it around content a plugin opens |
| `PluginVizProvider` | Component | Marks plugin chart content, so `useT` returns the chart's translator. The host renders it around every plugin chart component |
| `useAvandar` | Hook | Gets the scoped `avandar` API inside plugin UI. Throws a `PluginError` outside an `AvandarProvider`, and inside a plugin chart the error names the chart type |
| `useT` | Hook | Gets the plugin's translator inside plugin UI or a plugin chart |
```

In `docs/avandar-packages.md`, replace lines 205-210:

```md
The API Avandar plugins are written against. Exports `definePlugin` and
`isPluginDefinition`, the `avandar` API types (`AvandarApi`, the invocation
context, `QueryHandle`, `fetchRows` options and result), `PluginError`,
`makePluginTranslator` (ICU messages with locale fallback), and the React
`AvandarProvider`, `useAvandar`, and `useT` for plugin UI. Every call is async
or fire-and-forget and passes serializable data.
```

with:

```md
The API Avandar plugins are written against. Exports `definePlugin` and
`isPluginDefinition`, the `avandar` API types (`AvandarApi`, the invocation
context, `QueryHandle`, `fetchRows` options and result), the chart type types
(`PluginVizDefinition`, `PluginChartSpec`, and the input and props a chart
receives), `PluginError`, `makePluginTranslator` (ICU messages with locale
fallback), and the React `AvandarProvider`, `PluginVizProvider`, `useAvandar`,
and `useT` for plugin UI and plugin charts. Every call is async or
fire-and-forget and passes serializable data.
```

- [ ] **Step 10: Run the SDK suite, format, type-check, and lint**

Run: `pnpm --filter @avandar/plugin-sdk test`
Expected: PASS (5 files, 47 tests).

Run: `pnpm format:oxfmt packages/web/plugin-sdk/src packages/web/plugin-sdk/README.md docs/avandar-packages.md`
Expected: exit 0.

Run: `pnpm --filter @avandar/plugin-sdk type-check`
Expected: exit 0.

Run: `pnpm type-check`
Expected: exit 0.

Run: `pnpm exec eslint packages/web/plugin-sdk`
Expected: exit 0 (the two `react-refresh/only-export-components` disables mirror the existing ones).

- [ ] **Step 11: Commit**

```bash
git add packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.tsx \
  packages/web/plugin-sdk/src/PluginVizContext/PluginVizContext.test.tsx \
  packages/web/plugin-sdk/src/AvandarContext/AvandarContext.tsx \
  packages/web/plugin-sdk/src/AvandarContext/AvandarContext.test.tsx \
  packages/web/plugin-sdk/src/index.ts \
  packages/web/plugin-sdk/README.md \
  docs/avandar-packages.md
git commit -m "$(cat <<'EOF'
feat(plugins): give plugin chart components a translator

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 5: `@avandar/plugin-ui/charts`: `charts.ts`, `useChartTheme`, package config, tsup, ESLint allowlist, `verify:packages`

**Files:**
- Create: `packages/web/plugin-ui/src/charts.ts`
- Create: `packages/web/plugin-ui/src/useChartTheme/useChartTheme.ts`
- Create: `packages/web/plugin-ui/src/useChartTheme/useChartTheme.test.tsx`
- Create: `packages/web/plugin-ui/vitest.config.ts`
- Modify: `packages/web/plugin-ui/package.json` (whole file)
- Modify: `packages/web/plugin-ui/tsup.config.ts` (whole file)
- Modify: `packages/web/plugin-ui/README.md` (Exports table, after line 10)
- Modify: `pnpm-lock.yaml` (regenerated by `pnpm install`, `packages/web/plugin-ui` importer only)
- Modify: `eslint/plugin-restrictions.js` (docstring and allowlist lines 13-25, message line 128)
- Modify: `docs/avandar-packages.md` (the `@avandar/plugin-ui` section, lines 221-228)
- Test: `packages/web/plugin-ui/src/useChartTheme/useChartTheme.test.tsx`
- Test: `eslint/plugin-restrictions.test.js`

**Context:** Implements contract C3. `useChartTheme` mirrors the built-in charts: they cycle `CHART_COLORS` (`blue.6`, `teal.6`, `yellow.6`, `orange.6`, `red.6`, `grape.6`, `indigo.6`, `cyan.6`, `green.6`, `pink.6` in `src/lib/ui/viz/ChartConstants.ts`) resolved through the Mantine theme, and Mantine charts draw text in `gray.7` (light) or `dark.1` (dark) and grid lines in `gray.5` or `dark.3` at 0.6 alpha (`--chart-text-color` and `--chart-grid-color` in `@mantine/charts/styles.css`). A package cannot import app code, so the palette names are repeated in the hook. plugin-ui had no test runner: this task adds the same `vitest.config.ts`, `test` script, and dev dependencies `plugin-sdk` uses (one small config file; its `tsconfig.json` already includes `tests/vitest.setup.ts`), so the hook gets a real unit test and CI's `pnpm --filter "./packages/**" test` runs it. `recharts` becomes a peer and a dev dependency at the root app's range (`^3.8.1`); `react-dom` joins the dev dependencies so pnpm resolves `recharts` to the same store instance as the root app, which keeps a plugin's charts from bundling a second copy. `verify:packages` packs every package, so `./charts` needs a `publishConfig.exports` twin and a tsup entry that emits `dist/charts.js` and `dist/charts.d.ts`. No earlier task is required.

- [ ] **Step 1: Rewrite `packages/web/plugin-ui/package.json`**

Replace the whole file with (the `./charts` target is created in Step 9):

```json
{
  "name": "@avandar/plugin-ui",
  "version": "0.1.0",
  "private": true,
  "description": "The components Avandar plugin UI and plugin charts may render.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/AvandarLabs/avandar.git",
    "directory": "packages/web/plugin-ui"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./charts": "./src/charts.ts"
  },
  "sideEffects": false,
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "@mantine/core": "^9.2.0",
    "react": "^19.0.0",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@mantine/core": "catalog:",
    "@testing-library/react": "^16.3.0",
    "jsdom": "^26.1.0",
    "react": "catalog:",
    "react-dom": "catalog:",
    "recharts": "^3.8.1",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "./charts": {
        "types": "./dist/charts.d.ts",
        "default": "./dist/charts.js"
      }
    }
  }
}
```

- [ ] **Step 2: Add the test runner config**

`packages/web/plugin-ui/vitest.config.ts`:

```ts
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared", "web"],
    }),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(repoRootDir, "tests/vitest.setup.ts")],
  },
});
```

- [ ] **Step 3: Install and confirm `recharts` resolves to the app's copy**

Run: `pnpm install`
Expected: exit 0. `git diff --stat` lists `pnpm-lock.yaml`, and its diff touches only the `packages/web/plugin-ui:` importer block (new `@testing-library/react`, `jsdom`, `react-dom`, `recharts`, `vitest` entries). Every version reuses one already in the lockfile.

Run: `grep -n -A 40 "^  packages/web/plugin-ui:" pnpm-lock.yaml | grep -A 1 "recharts:"`
Expected: `version: 3.8.1(@types/react@19.2.14)(react-dom@19.2.5(react@19.2.5))(react-is@18.3.1)(react@19.2.5)(redux@5.0.1)`, the same string as the root importer's `recharts` entry.

Run: `node -p "require('fs').realpathSync('packages/web/plugin-ui/node_modules/recharts') === require('fs').realpathSync('node_modules/recharts')"`
Expected: `true`. If it prints `false`, run `pnpm dedupe` and repeat both checks before going on.

- [ ] **Step 4: Write the failing `useChartTheme` test**

`packages/web/plugin-ui/src/useChartTheme/useChartTheme.test.tsx`:

```tsx
import { createTheme, MantineProvider } from "@mantine/core";
import { useChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MantineColorsTuple } from "@mantine/core";
import type { ReactNode } from "react";

const CUSTOM_BLUE: MantineColorsTuple = [
  "#e7f0ff",
  "#cfe0ff",
  "#a0c1ff",
  "#6d9fff",
  "#4282ff",
  "#2770ff",
  "#1466ff",
  "#0055e4",
  "#004bcc",
  "#0040b4",
];

const CUSTOM_THEME = createTheme({ colors: { blue: CUSTOM_BLUE } });

function _lightWrapper({ children }: { children: ReactNode }): ReactNode {
  return <MantineProvider forceColorScheme="light">{children}</MantineProvider>;
}

function _darkWrapper({ children }: { children: ReactNode }): ReactNode {
  return <MantineProvider forceColorScheme="dark">{children}</MantineProvider>;
}

function _customThemeWrapper({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <MantineProvider theme={CUSTOM_THEME} forceColorScheme="light">
      {children}
    </MantineProvider>
  );
}

describe("useChartTheme", () => {
  it("lists the built-in chart series colors in order under the default theme", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.colors).toEqual([
      "#228be6",
      "#12b886",
      "#fab005",
      "#fd7e14",
      "#fa5252",
      "#be4bdb",
      "#4c6ef5",
      "#15aabf",
      "#40c057",
      "#e64980",
    ]);
  });

  it("takes the series colors from the theme it renders in", () => {
    const { result } = renderHook(useChartTheme, {
      wrapper: _customThemeWrapper,
    });
    expect(result.current.colors[0]).toBe("#1466ff");
  });

  it("returns the Mantine charts text color for light mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.textColor).toBe("#495057");
  });

  it("returns the Mantine charts text color for dark mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _darkWrapper });
    expect(result.current.textColor).toBe("#b8b8b8");
  });

  it("returns the Mantine charts grid color for light mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.gridColor).toBe("rgba(173, 181, 189, 0.6)");
  });

  it("returns the Mantine charts grid color for dark mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _darkWrapper });
    expect(result.current.gridColor).toBe("rgba(105, 105, 105, 0.6)");
  });
});
```

- [ ] **Step 5: Run it and confirm it fails**

Run: `pnpm --filter @avandar/plugin-ui test src/useChartTheme/useChartTheme.test.tsx`
Expected: FAIL, `Failed to resolve import "@plugin-ui/useChartTheme/useChartTheme"`.

- [ ] **Step 6: Implement `useChartTheme`**

`packages/web/plugin-ui/src/useChartTheme/useChartTheme.ts`:

```ts
import { rgba, useComputedColorScheme, useMantineTheme } from "@mantine/core";
import { useMemo } from "react";

/**
 * The colors a plugin chart component draws with, so its marks, labels, and
 * grid lines match Avandar's built-in charts in the current color scheme.
 */
export type ChartTheme = Readonly<{
  /** Series colors, in the order built-in charts assign them. */
  colors: readonly string[];
  /** The color of axis ticks, axis labels, and legend text. */
  textColor: string;
  /** The color of grid lines. */
  gridColor: string;
}>;

// The Mantine palettes Avandar's built-in charts cycle through, in order,
// each at the shade those charts use.
const SERIES_COLOR_NAMES = [
  "blue",
  "teal",
  "yellow",
  "orange",
  "red",
  "grape",
  "indigo",
  "cyan",
  "green",
  "pink",
] as const;
const SERIES_COLOR_SHADE = 6;
const GRID_COLOR_ALPHA = 0.6;

/**
 * Gets Avandar's chart colors from the Mantine theme for the computed color
 * scheme, for example to color the `Scatter` and `ErrorBar` marks and the
 * axes of a plugin's `ComposedChart`. Text and grid colors follow light and
 * dark mode the way built-in charts do.
 */
export function useChartTheme(): ChartTheme {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light");
  return useMemo(() => {
    const isDark = colorScheme === "dark";
    return {
      colors: SERIES_COLOR_NAMES.map((colorName) => {
        return theme.colors[colorName][SERIES_COLOR_SHADE];
      }),
      textColor: isDark ? theme.colors.dark[1] : theme.colors.gray[7],
      gridColor: rgba(
        isDark ? theme.colors.dark[3] : theme.colors.gray[5],
        GRID_COLOR_ALPHA,
      ),
    };
  }, [theme, colorScheme]);
}
```

- [ ] **Step 7: Run it and confirm it passes**

Run: `pnpm --filter @avandar/plugin-ui test src/useChartTheme/useChartTheme.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 8: Add the charts entry and its build**

`packages/web/plugin-ui/src/charts.ts`:

```ts
/**
 * The chart building blocks a plugin chart component may render: a curated
 * set of Recharts components, plus `useChartTheme` for Avandar's chart
 * colors. Plugins import chart code only from this module, so the host
 * controls which chart components plugins can render.
 */
export {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  ReferenceLine,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export { useChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
export type { ChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
```

Replace `packages/web/plugin-ui/tsup.config.ts` with:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per declared `exports` subpath.
  entry: { index: "src/index.ts", charts: "src/charts.ts" },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "@mantine/core", "recharts"],
});
```

Run: `pnpm --filter @avandar/plugin-ui type-check`
Expected: exit 0.

Run: `pnpm --filter @avandar/plugin-ui build && ls packages/web/plugin-ui/dist`
Expected: exit 0, and the listing includes `charts.js`, `charts.d.ts`, `index.js`, and `index.d.ts`.

- [ ] **Step 9: Write the failing allowlist tests**

Line numbers in this step refer to the file before any of its edits. In `eslint/plugin-restrictions.test.js`, replace lines 17-40:

```js
const RELATIVE_PATTERN = "\\.{1,2}/";
const JSX_RUNTIME_PATTERN = "react/jsx-runtime$";

/** Mirrors how ESLint compiles a `no-restricted-imports` `regex` option. */
const unapprovedImportRegex = new RegExp(UNAPPROVED_PLUGIN_IMPORT_REGEX, "u");

function isImportRestricted(specifier) {
  return unapprovedImportRegex.test(specifier);
}

/**
 * Package names the ESLint allowlist admits, with the regex anchors and the
 * `date-fns` subpath group removed. Relative files and the JSX runtime are
 * not npm dependencies, so they are left out.
 */
function getPackageNamesFromAllowlist() {
  return APPROVED_PLUGIN_IMPORT_PATTERNS.filter((pattern) => {
    return pattern !== RELATIVE_PATTERN && pattern !== JSX_RUNTIME_PATTERN;
  })
```

with:

```js
const RELATIVE_PATTERN = "\\.{1,2}/";
const JSX_RUNTIME_PATTERN = "react/jsx-runtime$";
const CHARTS_SUBPATH_PATTERN = "@avandar/plugin-ui/charts$";
const NON_PACKAGE_PATTERNS = [
  RELATIVE_PATTERN,
  JSX_RUNTIME_PATTERN,
  CHARTS_SUBPATH_PATTERN,
];

/** Mirrors how ESLint compiles a `no-restricted-imports` `regex` option. */
const unapprovedImportRegex = new RegExp(UNAPPROVED_PLUGIN_IMPORT_REGEX, "u");

function isImportRestricted(specifier) {
  return unapprovedImportRegex.test(specifier);
}

/**
 * Package names the ESLint allowlist admits, with the regex anchors and the
 * `date-fns` subpath group removed. Relative files, the JSX runtime, and the
 * `@avandar/plugin-ui/charts` subpath are not npm dependencies of their own,
 * so they are left out.
 */
function getPackageNamesFromAllowlist() {
  return APPROVED_PLUGIN_IMPORT_PATTERNS.filter((pattern) => {
    return !NON_PACKAGE_PATTERNS.includes(pattern);
  })
```

Replace lines 56-61:

```js
  it.each([
    "./helpers",
    "../shared/helpers",
    "react/jsx-runtime",
    "date-fns/format",
  ])("lets a plugin import %s", (specifier) => {
```

with:

```js
  it.each([
    "./helpers",
    "../shared/helpers",
    "react/jsx-runtime",
    "date-fns/format",
    "@avandar/plugin-ui/charts",
  ])("lets a plugin import %s", (specifier) => {
```

Replace lines 68-70:

```js
    "@avandar/utils",
    "@avandar/plugin-sdk/internal",
    "@mantine/core",
```

with:

```js
    "@avandar/utils",
    "@avandar/plugin-sdk/internal",
    "@avandar/plugin-ui/internal",
    "@mantine/core",
```

Replace lines 145-147 (in "plugin path restrictions"):

```js
    "@avandar/plugin-sdk",
    "@avandar/plugin-ui",
    "react",
```

with:

```js
    "@avandar/plugin-sdk",
    "@avandar/plugin-ui",
    "@avandar/plugin-ui/charts",
    "react",
```

- [ ] **Step 10: Run them and confirm they fail**

Run: `pnpm vitest run eslint/plugin-restrictions.test.js`
Expected: FAIL, 1 test: "lets a plugin import @avandar/plugin-ui/charts" in "plugin import allowlist" (`isImportRestricted` returns `true`). The other 37 pass, including the lint-level "lets a plugin import @avandar/plugin-ui/charts", because Step 8 made the subpath resolve inside `packages/web/plugin-ui`.

- [ ] **Step 11: Allow the charts subpath**

In `eslint/plugin-restrictions.js`, replace lines 13-20:

```js
 * Every entry other than relative files, `react/jsx-runtime` (the automatic
 * JSX runtime), and the `date-fns` subpaths must be an exact package name.
 */
export const APPROVED_PLUGIN_IMPORT_PATTERNS = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
  "react$",
```

with:

```js
 * Every entry other than relative files, `react/jsx-runtime` (the automatic
 * JSX runtime), `@avandar/plugin-ui/charts` (the chart building blocks), and
 * the `date-fns` subpaths must be an exact package name.
 */
export const APPROVED_PLUGIN_IMPORT_PATTERNS = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
  "@avandar/plugin-ui/charts$",
  "react$",
```

Replace the message that was line 128 before the edit above:

```js
                "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).",
```

with:

```js
                "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, @avandar/plugin-ui/charts, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).",
```

- [ ] **Step 12: Run them and confirm they pass**

Run: `pnpm vitest run eslint/plugin-restrictions.test.js`
Expected: PASS (38 tests). "stops a plugin from importing @avandar/plugin-sdk/internal" still passes.

- [ ] **Step 13: Document the charts entry**

In `packages/web/plugin-ui/README.md`, insert after line 10 (the Mantine components row):

```md
| `CartesianGrid`, `ComposedChart`, `ErrorBar`, `Legend`, `ReferenceLine`, `Scatter`, `Tooltip`, `XAxis`, `YAxis` (from `@avandar/plugin-ui/charts`) | Components | Re-exported from Recharts for plugin chart components |
| `useChartTheme` (from `@avandar/plugin-ui/charts`) | Hook | Gets Avandar's series colors, text color, and grid color for the current color scheme |
| `ChartTheme` (from `@avandar/plugin-ui/charts`) | Type | What `useChartTheme` returns |
```

In `docs/avandar-packages.md`, replace lines 221-228:

```md
The components plugin UI may render. Re-exports a small set of Mantine
components (`Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`,
`NumberInput`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`,
`Title`). Plugins import UI only from this package, which keeps their code
independent of the host's component library.

Private (`"private": true`): not published to npm. It has
`@mantine/core` and `react` as peers.
```

with:

```md
The components plugin UI may render. Re-exports a small set of Mantine
components (`Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`,
`NumberInput`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`,
`Title`). Its `@avandar/plugin-ui/charts` entry re-exports a curated set of
Recharts components plus `useChartTheme`, for plugin chart components.
Plugins import UI only from this package, which keeps their code independent
of the host's component library.

Private (`"private": true`): not published to npm. It has
`@mantine/core`, `react`, and `recharts` as peers.
```

- [ ] **Step 14: Run the package checks, format, type-check, and lint**

Run: `pnpm --filter @avandar/plugin-ui test`
Expected: PASS (1 file, 6 tests).

Run: `pnpm format:oxfmt packages/web/plugin-ui eslint/plugin-restrictions.js eslint/plugin-restrictions.test.js docs/avandar-packages.md`
Expected: exit 0.

Run: `pnpm type-check`
Expected: exit 0.

Run: `pnpm exec eslint packages/web/plugin-ui eslint/plugin-restrictions.js eslint/plugin-restrictions.test.js`
Expected: exit 0.

Run: `pnpm verify:packages`
Expected: exit 0. The publint section prints `@avandar/plugin-ui         ok`, the arethetypeswrong section prints `avandar-plugin-ui-0.1.0.tgz ok`, and the run ends with `All packages verified.`

- [ ] **Step 15: Commit**

```bash
git add packages/web/plugin-ui/src/charts.ts \
  packages/web/plugin-ui/src/useChartTheme/useChartTheme.ts \
  packages/web/plugin-ui/src/useChartTheme/useChartTheme.test.tsx \
  packages/web/plugin-ui/vitest.config.ts \
  packages/web/plugin-ui/package.json \
  packages/web/plugin-ui/tsup.config.ts \
  packages/web/plugin-ui/README.md \
  pnpm-lock.yaml \
  eslint/plugin-restrictions.js \
  eslint/plugin-restrictions.test.js \
  docs/avandar-packages.md
git commit -m "$(cat <<'EOF'
feat(plugins): add @avandar/plugin-ui/charts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 6: Extract `BuiltInVizContainer` and `UiVizConfigRenderer` from `VisualizationContainer`

**Files:**
- Create: `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx`
- Create: `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx`
- Move: `src/components/VisualizationContainer/VisualizationContainer.module.css` to `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.module.css` (only the header comment changes)
- Modify: `src/components/VisualizationContainer/VisualizationContainer.tsx` (whole file: the body moves out, the public `Props` stay)
- Test: `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx`
- Test (unchanged, must stay green): `src/components/VisualizationContainer/__tests__/VisualizationContainer.test.tsx`

**Context:** A no-behavior-change split that implements refinement 3 against today's union, before any plugin type exists. `UiVizConfigRenderer` takes a name-keyed `UiVizConfig` plus rows and column metadata (the props fixed in refinement 3) and holds the row limit, the zod slot checks, and the per-type chart dispatch, so Task 14 can draw plugin transform output with it. `BuiltInVizContainer` keeps `VisualizationContainer`'s props, converts IDs to names with `AvaVizConfigs.toUiVizConfig`, and renders `UiVizConfigRenderer`. `VisualizationContainer` becomes a thin wrapper (Task 8 adds the plugin branch). Task 7 retypes the renderer to `BuiltInUiVizConfig` and the container to `AvaVizConfig.BuiltIn`. The old `match` ended in an `.otherwise` arm that no typed config reaches; with all nine arms listed, `.exhaustive()` compiles, so that arm goes (Task 8 routes plugin configs away before they reach the renderer). Each arm moves into a private `_render*` helper so no function passes 45 lines; the arm bodies are unchanged, except that one moved comment loses an em dash. `t` from `useLingui()` is a macro, so the bar arm's `` t`bar chart` `` stays in the component and reaches the helper as `chartName`.

- [ ] **Step 1: Write the failing test**

Create `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { VIZ_RENDER_LIMITS } from "$/config/GlobalVizConfig";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import { render, screen } from "@/test-utils";
import type { UnknownDataFrame } from "@avandar/utils";

vi.mock("@/utils/notifications/notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/utils/notifications/notify")>();
  return { ...actual, notifyWarning: vi.fn() };
});

vi.mock("@/lib/ui/viz/DataGrid", () => {
  return {
    DataGrid: (props: { columnNames: readonly string[] }) => {
      return <div data-testid="data-grid">{props.columnNames.join(",")}</div>;
    },
  };
});

vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
  return {
    BarChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
      data: UnknownDataFrame;
    }) => {
      return (
        <div
          data-testid="bar-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
          data-row-count={props.data.length}
        />
      );
    },
  };
});

const DATA: UnknownDataFrame = [
  { week: "2024-01-07", cases: 3 },
  { week: "2024-01-14", cases: 5 },
];

const NO_DATE_COLUMNS: ReadonlySet<string> = new Set();

describe("UiVizConfigRenderer", () => {
  it("draws the bar chart from the config's column names", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: "week",
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    const bar = screen.getByTestId("bar-chart");
    expect(bar).toHaveAttribute("data-x", "week");
    expect(bar).toHaveAttribute("data-y", "cases");
  });

  it("lists the given column names in the table view", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{ vizType: "table" }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["cases", "week"]}
      />,
    );
    expect(screen.getByTestId("data-grid")).toHaveTextContent("cases,week");
  });

  it("shows the missing X axis message instead of a bar chart with no X axis", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: undefined,
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(
      screen.getByText("You haven't chosen an X axis"),
    ).toBeInTheDocument();
  });

  it("passes at most the bar render limit of rows to the bar chart", () => {
    const barMax = VIZ_RENDER_LIMITS.bar.max;
    const overLimitData: UnknownDataFrame = Array.from(
      { length: barMax + 10 },
      (_, index) => {
        return { week: `week-${index}`, cases: index };
      },
    );
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: "week",
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "group",
          withLegend: false,
        }}
        data={overLimitData}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    expect(screen.getByTestId("bar-chart")).toHaveAttribute(
      "data-row-count",
      String(barMax),
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer"`.

- [ ] **Step 3: Move the CSS module**

Run: `git mv src/components/VisualizationContainer/VisualizationContainer.module.css src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.module.css`

Then replace the file's contents with:

```css
/*
 * Static layout styles for the chart renderer. Extracted from the inline
 * `style`/size props repeated on every chart wrapper so the markup stays
 * declarative and the values live in one place.
 */

/* Wrapper around each chart. Fills its parent and clips overflow so the
 * chart never spills outside its allotted area. */
.chartWrapper {
  height: 100%;
  overflow: hidden;
  width: 100%;
}
```

- [ ] **Step 4: Create `UiVizConfigRenderer`**

Create `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx`. `useVizConfigSchemas` moves here verbatim from `VisualizationContainer.tsx` (lines 46-122 today), with its docstring renamed and the em dash in the scatter comment replaced by a period:

```tsx
import { DangerText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { array, looseObject, object, prettifyError, string } from "zod";
import css from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.module.css";
import { useVizDataLimit } from "@/components/VisualizationContainer/useVizDataLimit/useVizDataLimit";
import { VisualizationRenderError } from "@/components/VisualizationContainer/VisualizationRenderError";
import { AreaChart } from "@/lib/ui/viz/AreaChart";
import { BarChart } from "@/lib/ui/viz/BarChart/BarChart";
import { BubbleChart } from "@/lib/ui/viz/BubbleChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { FunnelChart } from "@/lib/ui/viz/FunnelChart";
import { LineChart } from "@/lib/ui/viz/LineChart/LineChart";
import { PieChart } from "@/lib/ui/viz/PieChart";
import { RadarChart } from "@/lib/ui/viz/RadarChart/RadarChart";
import { ScatterChart } from "@/lib/ui/viz/ScatterChart/ScatterChart";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = Readonly<{
  uiVizConfig: UiVizConfig;
  data: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
  /** Column names the table view lists, in order. */
  columnNames: readonly string[];
}>;

/**
 * Builds the Zod schemas `UiVizConfigRenderer` uses to check each chart
 * type's `UiVizConfig` before rendering it, so a missing axis, series, or
 * name column shows as an error message instead of a broken chart. The
 * schemas are rebuilt when the Lingui locale changes, so their messages stay
 * translated.
 */
function useVizConfigSchemas() {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  return useMemo(() => {
    const XAxisKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen an X axis`
          : t`Invalid X axis selected`;
      },
    });
    const NameKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen a name column`
          : t`Invalid name column selected`;
      },
    });
    const ValueKeySchema = string({
      error: (issue) => {
        return issue.input === undefined
          ? t`You haven't chosen a value column`
          : t`Invalid value column selected`;
      },
    });
    const SeriesArraySchema = array(looseObject({ key: string() })).min(1, {
      error: t`You haven't added any series`,
    });

    return {
      XYSeriesConfigSchema: object({
        xAxisKey: XAxisKeySchema,
        series: SeriesArraySchema,
      }),
      ScatterPlotConfigSchema: object({
        // `looseObject` (not `object`) so per-series `label` / `color` survive
        // the parse. `object` strips unknown keys, dropping them before the
        // renderer sees them. Matches SeriesArraySchema used by XY / radar.
        series: array(
          looseObject({ key: string().min(1), xKey: string().min(1) }),
        ).min(1, { error: t`Add at least one X / Y series` }),
      }),
      PieChartConfigSchema: object({
        nameKey: NameKeySchema,
        valueKey: ValueKeySchema,
      }),
      FunnelChartConfigSchema: object({
        nameKey: NameKeySchema,
        valueKey: ValueKeySchema,
      }),
      RadarChartConfigSchema: object({
        nameKey: NameKeySchema,
        series: SeriesArraySchema,
      }),
      BubbleChartConfigSchema: object({
        // `looseObject` so per-series `label` / `color` survive the parse; see
        // ScatterPlotConfigSchema above.
        series: array(
          looseObject({
            key: string().min(1),
            xKey: string().min(1),
            sizeKey: string().min(1),
          }),
        ).min(1, { error: t`Add at least one X / Y / Size series` }),
      }),
    };
  }, [t]);
}

/** What each chart branch reads: its own config plus the shared inputs. */
type ChartRenderOptions<VType extends UiVizConfig["vizType"]> = Readonly<{
  config: Extract<UiVizConfig, { vizType: VType }>;
  schemas: ReturnType<typeof useVizConfigSchemas>;
  limitedData: UnknownDataFrame;
  dateColumns: ReadonlySet<string>;
}>;

function _renderDataGrid(
  options: Readonly<{
    columnNames: readonly string[];
    limitedData: UnknownDataFrame;
    dateColumns: ReadonlySet<string>;
  }>,
): JSX.Element {
  return (
    <Box h="100%" w="100%" mih={0}>
      <DataGrid
        columnNames={options.columnNames}
        data={options.limitedData}
        dateColumns={options.dateColumns}
        dateFormat="YYYY-MM-DD HH:mm:ss Z"
        height="100%"
      />
    </Box>
  );
}

function _renderBarChart(
  options: ChartRenderOptions<"bar"> & Readonly<{ chartName: string }>,
): JSX.Element {
  const { config, schemas, limitedData, dateColumns, chartName } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <BarChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          layout={config.layout}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <VisualizationRenderError chartName={chartName} error={error} />;
}

function _renderLineChart(options: ChartRenderOptions<"line">): JSX.Element {
  const { config, schemas, limitedData, dateColumns } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <LineChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderAreaChart(options: ChartRenderOptions<"area">): JSX.Element {
  const { config, schemas, limitedData, dateColumns } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.XYSeriesConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <AreaChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          layout={config.layout}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderScatterChart(
  options: ChartRenderOptions<"scatter">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.ScatterPlotConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <ScatterChart
          data={limitedData}
          height="100%"
          series={validConfig.series}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderPieChart(options: ChartRenderOptions<"pie">): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.PieChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <PieChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          valueKey={validConfig.valueKey}
          isDonut={config.isDonut}
          withLabels={config.withLabels}
          labelsType={config.labelsType}
          seriesColors={config.seriesColors}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderFunnelChart(
  options: ChartRenderOptions<"funnel">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.FunnelChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <FunnelChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          valueKey={validConfig.valueKey}
          seriesColors={config.seriesColors}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderRadarChart(options: ChartRenderOptions<"radar">): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.RadarChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <RadarChart
          data={limitedData}
          nameKey={validConfig.nameKey}
          series={config.series}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

function _renderBubbleChart(
  options: ChartRenderOptions<"bubble">,
): JSX.Element {
  const { config, schemas, limitedData } = options;
  const {
    success,
    data: validConfig,
    error,
  } = schemas.BubbleChartConfigSchema.safeParse(config);
  if (success) {
    return (
      <Box className={css.chartWrapper}>
        <BubbleChart
          data={limitedData}
          height="100%"
          series={validConfig.series}
          chartStyle={config.chartStyle}
        />
      </Box>
    );
  }
  return <DangerText>{prettifyError(error)}</DangerText>;
}

/**
 * Draws a chart or table from a `UiVizConfig`, a config whose columns are
 * already `QueryResult` column names. It caps the rows at the chart type's
 * render limit and checks the config's required slots before drawing, so a
 * missing axis or series shows as an error message.
 *
 * Use it wherever the column names are known without column IDs, for
 * example a chart built from rows a plugin transform produced.
 */
export function UiVizConfigRenderer({
  uiVizConfig,
  data,
  dateColumns,
  columnNames,
}: Props): JSX.Element {
  // Hook-bound `t` intentionally shadows the module-level macro `t` so this
  // React-render path stays subscribed to locale changes via `useLingui()`.

  const { t } = useLingui();
  const schemas = useVizConfigSchemas();
  const limitedData = useVizDataLimit(uiVizConfig.vizType, data);
  const shared = { schemas, limitedData, dateColumns };
  return match(uiVizConfig)
    .with({ vizType: "table" }, () => {
      return _renderDataGrid({ columnNames, limitedData, dateColumns });
    })
    .with({ vizType: "bar" }, (config) => {
      return _renderBarChart({ ...shared, config, chartName: t`bar chart` });
    })
    .with({ vizType: "line" }, (config) => {
      return _renderLineChart({ ...shared, config });
    })
    .with({ vizType: "area" }, (config) => {
      return _renderAreaChart({ ...shared, config });
    })
    .with({ vizType: "scatter" }, (config) => {
      return _renderScatterChart({ ...shared, config });
    })
    .with({ vizType: "pie" }, (config) => {
      return _renderPieChart({ ...shared, config });
    })
    .with({ vizType: "funnel" }, (config) => {
      return _renderFunnelChart({ ...shared, config });
    })
    .with({ vizType: "radar" }, (config) => {
      return _renderRadarChart({ ...shared, config });
    })
    .with({ vizType: "bubble" }, (config) => {
      return _renderBubbleChart({ ...shared, config });
    })
    .exhaustive();
}
```

- [ ] **Step 5: Create `BuiltInVizContainer`**

Create `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx`:

```tsx
import { prop } from "@avandar/utils";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  /**
   * Every `QueryResult` column the query returned, including any that could
   * not be given a column ID. The table view lists these, so it shows every
   * column even when `columns` leaves some out. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];

  /** The names of the query result columns that are dates. */
  dateColumns: ReadonlySet<string>;
  data: UnknownDataFrame;

  /** The built-in chart or table config that drives what is rendered. */
  vizConfig: AvaVizConfig.T;
};

/**
 * Renders a built-in chart or table from an `AvaVizConfig`: it replaces each
 * column ID with that column's current `QueryResult` column name, then draws
 * the result with `UiVizConfigRenderer`.
 */
export function BuiltInVizContainer({
  columns,
  rawColumns = columns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  const uiVizConfigConversion = AvaVizConfigs.toUiVizConfig({
    config: vizConfig,
    columns: columns,
  });
  return (
    <UiVizConfigRenderer
      uiVizConfig={uiVizConfigConversion.config}
      data={data}
      dateColumns={dateColumns}
      columnNames={rawColumns.map(prop("name"))}
    />
  );
}
```

- [ ] **Step 6: Make `VisualizationContainer` a wrapper**

Replace the whole of `src/components/VisualizationContainer/VisualizationContainer.tsx` with:

```tsx
import { BuiltInVizContainer } from "@/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  /**
   * Every `QueryResult` column the query returned, including any that could
   * not be given a column ID. The table view lists these, so it shows every
   * column even when `columns` leaves some out. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];

  /**
   * The names of the query result columns that are dates.
   *
   * This is not a great way to handle date columns and we should find a
   * better way to handle this.
   */
  dateColumns: ReadonlySet<string>;
  data: UnknownDataFrame;

  /** The visualization config that drives what is rendered. */
  vizConfig: AvaVizConfig;
};

/**
 * Renders a visualization (chart or table) for a given query result and
 * `AvaVizConfig`. Pure and prop-driven: holds no state of its own and has no
 * coupling to any app-specific store, so it can be reused anywhere a query
 * result needs to be visualized.
 */
export function VisualizationContainer({
  columns,
  rawColumns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  return (
    <BuiltInVizContainer
      columns={columns}
      rawColumns={rawColumns}
      data={data}
      dateColumns={dateColumns}
      vizConfig={vizConfig}
    />
  );
}
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer`
Expected: PASS, 11 files. `UiVizConfigRenderer.test.tsx` (4 tests) and `__tests__/VisualizationContainer.test.tsx` (13 tests, unchanged) both pass.

- [ ] **Step 8: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/components/VisualizationContainer && pnpm exec stylelint "src/components/VisualizationContainer/**/*.css"`
Expected: exit 0.

- [ ] **Step 9: Commit**

The `git mv` in Step 3 already staged the removal of the old CSS path.

```bash
git add src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx \
  src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx \
  src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.module.css \
  src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx \
  src/components/VisualizationContainer/VisualizationContainer.tsx
git commit -m "$(cat <<'EOF'
refactor(viz): split VisualizationContainer into BuiltInVizContainer and UiVizConfigRenderer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 7: Plugin viz config types, schemas, `BuiltInVizType` narrowing, and `PluginVizPlaceholder`

**Files:**
- Create: `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts`
- Create: `shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts`
- Create: `src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.tsx`
- Modify: `shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts` (adds `BuiltInAvaVizConfig`, `BuiltInVizType`; util registry keyed by `BuiltInVizType`)
- Modify: `shared/models/vizs/AvaVizConfig/AvaVizConfig.ts` (namespace gains `BuiltIn`, `BuiltInType`, `Plugin`)
- Modify: `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts` (adds `BuiltInUiVizConfig`)
- Modify: `shared/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts` (lines 5, 10, 72)
- Modify: the nine modules `shared/models/vizs/Ava{Table,BarChart,LineChart,AreaChart,ScatterPlot,PieChart,FunnelChart,RadarChart,BubbleChart}VizConfig/*VizConfigs.ts` (three lines each, table below)
- Modify: `shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts` (import, `VizTypes`, `_getVizTypeModule`, `getDescriptors`, `makeEmptyConfig`, `convertVizConfig` signatures)
- Modify: `shared/config/GlobalVizConfig.ts` (lines 1, 29)
- Modify: `shared/copy/vizTypeLabel.ts` (lines 3, 13)
- Modify: `shared/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType.ts` (lines 40, 43)
- Modify: `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts` (fixture tables over `BuiltInVizType`)
- Modify: `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx` (typed over `BuiltInUiVizConfig`)
- Modify: `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx` (`vizConfig: AvaVizConfig.BuiltIn`)
- Test: `shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.test.ts`
- Test: `src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.test.tsx`

**Context:** Implements the C4 types and schemas, the built-in half of refinement 1, and the C5 `PluginVizPlaceholder`, without yet adding the plugin member to the unions. `BuiltInAvaVizConfig` and `BuiltInUiVizConfig` are introduced as today's nine-member unions, and `AvaVizConfig`/`UiVizConfig` are set equal to them, so every narrowing site below compiles unchanged and the repo stays green. Task 8 then widens the two unions and handles the plugin member at every site the type-checker reports; tasks 7 and 8 together are the "widen the unions" work, split so each commit compiles (the plugin branches in the converters are compile sites of the widening, so they cannot land after it). This task handles the probe sites from `ref-viz-model.md` section 9 that only need `BuiltInVizType`: #1 (`VIZ_RENDER_LIMITS`), #2 (`vizTypeLabel`), #3-#11 (the nine matrices), #12-#14 (registry, `VizTypes`, `_getVizTypeModule`), #20-#21 (`getAxisRolesFromVizType`), #22-#23 (`FIXTURES`, `OPTIONAL_KEYS`), and #25-#26 (the old container body, now `UiVizConfigRenderer` from Task 6, typed over `BuiltInUiVizConfig`). Callers of the narrowed helpers all pass built-in literals or `VizTypes` items (`useVizDataLimit`, `VizTypeSelect`, `useDataVizPBlockConfig`, the five `use*ChartStyleProps` hooks); the one that passes a full type, `useGadgetSummaries`, is narrowed in Task 8. The schemas use `brandedStringType<QueryColumn.Id>()` from `$/lib/zodHelpers.ts` because saved column IDs are not always UUIDs in tests and fixtures. The placeholder resolves its sentences through `i18n._(msg...)` in a helper, the pattern `ShareGeneralAccess.tsx` uses, because a `t` passed into a helper is invisible to the Lingui extractor. Its tests live beside it; `AvaPluginVizConfigs` tests (Task 9) go in `AvaPluginVizConfig/__tests__/` so this directory keeps one flat test file. New strings are extracted in Task 26.

- [ ] **Step 1: Write the failing tests**

Create `shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AvaPluginVizConfigSchema,
  UiPluginVizConfigSchema,
} from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts";

const UI_CONFIG = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset_date", stack: undefined },
  settings: { interval: "epiWeek", maxSeries: 8, showOther: true },
};

describe("UiPluginVizConfigSchema", () => {
  it("accepts string, number, and boolean settings with an unset column", () => {
    expect(UiPluginVizConfigSchema.safeParse(UI_CONFIG).success).toBe(true);
  });

  it("rejects an empty plugin id", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      pluginId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty chart type id", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      pluginVizId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a setting value that is an object", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      settings: { interval: { value: "epiWeek" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a column setting that is a number", () => {
    const result = UiPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      columnSettings: { date: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe("AvaPluginVizConfigSchema", () => {
  it("accepts a config whose column settings hold column IDs", () => {
    const result = AvaPluginVizConfigSchema.safeParse({
      ...UI_CONFIG,
      columnSettings: { date: "0b6f3a52-9a3e-4f43-a2a4-1c1fbd0f6d1e" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a built-in chart config", () => {
    const result = AvaPluginVizConfigSchema.safeParse({ vizType: "table" });
    expect(result.success).toBe(false);
  });
});
```

Create `src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { fireEvent, render, screen } from "@/test-utils";

describe("PluginVizPlaceholder", () => {
  it("names the plugin a missing plugin chart needs", () => {
    render(
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId="avandar.epidemiology"
      />,
    );
    expect(screen.getByText("Plugin not available")).toBeInTheDocument();
    expect(screen.getByText(/avandar\.epidemiology/)).toBeInTheDocument();
  });

  it("titles invalid settings as invalid chart settings", () => {
    render(
      <PluginVizPlaceholder
        reason="invalidSettings"
        pluginId="avandar.epidemiology"
      />,
    );
    expect(screen.getByText("Invalid chart settings")).toBeInTheDocument();
  });

  it("puts the chart title in the render failure heading", () => {
    render(
      <PluginVizPlaceholder
        reason="renderFailed"
        pluginId="avandar.epidemiology"
        title="Epicurve"
      />,
    );
    expect(screen.getByText("Epicurve couldn't render")).toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked after a failed load", () => {
    const onRetry = vi.fn();
    render(
      <PluginVizPlaceholder
        reason="loadFailed"
        pluginId="avandar.epidemiology"
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no Retry button for a missing plugin", () => {
    render(
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId="avandar.epidemiology"
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run shared/models/vizs/AvaPluginVizConfig src/lib/plugins/vizs/PluginVizPlaceholder`
Expected: FAIL, both files report `Failed to resolve import` for `PluginVizConfigSchemas.ts` and `PluginVizPlaceholder`.

- [ ] **Step 3: Create the plugin config types**

Create `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts`:

```ts
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

/** A value a plugin chart setting holds, other than a column. */
export type PluginVizSettingValue = string | number | boolean;

/** The column data types a plugin chart's column picker can ask for. */
export type PluginVizColumnPickerDataType =
  | "numeric"
  | "any"
  | "temporal"
  | "text";

/**
 * The `AvaVizConfig` of a chart drawn by a plugin's chart type, keyed by
 * column ID. Column settings sit in their own record, so ID-to-name
 * conversion and provisional ID remapping work without loading the plugin's
 * manifest.
 *
 * Use it wherever a plugin chart is edited or saved, for example a plugin
 * chart on a dashboard. Renderers take the `UiPluginVizConfig` form.
 */
export type AvaPluginVizConfig = Readonly<{
  vizType: "plugin";

  /** The plugin's manifest id, for example `avandar.epidemiology`. */
  pluginId: string;

  /** The chart type's id within the plugin, for example `epicurve`. */
  pluginVizId: string;

  /** Column ID per column picker setting key. Unset settings are undefined. */
  columnSettings: Readonly<Record<string, QueryColumn.Id | undefined>>;

  /** Value per non-column setting key. Unset settings are undefined. */
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
}>;

/**
 * An `AvaPluginVizConfig` with each column ID replaced by its `QueryResult`
 * column name, the form a renderer and an Explorer URL hold.
 */
export type UiPluginVizConfig = Readonly<{
  vizType: "plugin";
  pluginId: string;
  pluginVizId: string;

  /** `QueryResult` column name per column picker setting key. */
  columnSettings: Readonly<Record<string, string | undefined>>;
  settings: Readonly<Record<string, PluginVizSettingValue | undefined>>;
}>;

/**
 * The parts of a manifest setting the viz model reads. Structural, so
 * `shared/` never imports the manifest package.
 */
export type PluginVizSettingShape = Readonly<{
  key: string;
  required: boolean;
  default?: PluginVizSettingValue;
  control: Readonly<{ kind: string; dataType?: PluginVizColumnPickerDataType }>;
}>;
```

- [ ] **Step 4: Create the schemas**

Create `shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts`:

```ts
import { z } from "zod";
import { brandedStringType } from "$/lib/zodHelpers.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  AvaPluginVizConfig,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const PluginVizSettingsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]).optional(),
);

/**
 * Checks a plugin chart config keyed by column ID, for example one read back
 * from a saved dashboard, before anything renders it.
 */
export const AvaPluginVizConfigSchema: z.ZodType<AvaPluginVizConfig> = z.object(
  {
    vizType: z.literal("plugin"),
    pluginId: z.string().min(1),
    pluginVizId: z.string().min(1),
    columnSettings: z.record(
      z.string(),
      brandedStringType<QueryColumn.Id>().optional(),
    ),
    settings: PluginVizSettingsSchema,
  },
);

/**
 * Checks a plugin chart config keyed by `QueryResult` column name, for
 * example one read from an Explorer URL, before it is used.
 */
export const UiPluginVizConfigSchema: z.ZodType<UiPluginVizConfig> = z.object({
  vizType: z.literal("plugin"),
  pluginId: z.string().min(1),
  pluginVizId: z.string().min(1),
  columnSettings: z.record(z.string(), z.string().optional()),
  settings: PluginVizSettingsSchema,
});
```

- [ ] **Step 5: Create `PluginVizPlaceholder`**

Create `src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.tsx`. It centers a `Callout.Error` in the chart area, the same callout `VisualizationRenderError` uses for an invalid chart config, without that component's `mt="-20rem"` offset:

```tsx
import { Callout } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Flex } from "@mantine/core";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

/** Why a plugin chart shows a placeholder instead of the chart. */
export type PluginVizPlaceholderReason =
  | "missingPlugin"
  | "invalidSettings"
  | "renderFailed"
  | "loadFailed";

type Props = Readonly<{
  reason: PluginVizPlaceholderReason;

  /** The id of the plugin the chart comes from, named in the message. */
  pluginId: string;

  /** The chart type's localized title, when its manifest has loaded. */
  title?: string;

  /** Called by the Retry button, which shows only for `loadFailed`. */
  onRetry?: () => void;
}>;

type PlaceholderCopy = Readonly<{ heading: string; message: string }>;

/**
 * Resolves `msg` descriptors through `i18n` rather than taking the `t` from
 * `useLingui()`, so the extractor can still find every sentence.
 */
function _getPlaceholderCopy(
  options: Readonly<{
    reason: PluginVizPlaceholderReason;
    pluginId: string;
    title: string | undefined;
    i18n: I18n;
  }>,
): PlaceholderCopy {
  const { reason, pluginId, title, i18n } = options;
  return matchLiteral(reason, {
    missingPlugin: () => {
      return {
        heading: i18n._(msg`Plugin not available`),
        message: i18n._(
          msg`This chart needs the ${pluginId} plugin, which is not available.`,
        ),
      };
    },
    invalidSettings: () => {
      return {
        heading: i18n._(msg`Invalid chart settings`),
        message: i18n._(
          msg`This chart's saved settings are not valid, so it cannot be displayed.`,
        ),
      };
    },
    renderFailed: () => {
      return {
        heading:
          title === undefined
            ? i18n._(msg`This chart couldn't render`)
            : i18n._(msg`${title} couldn't render`),
        message: i18n._(
          msg`The ${pluginId} plugin ran into an error while drawing this chart.`,
        ),
      };
    },
    loadFailed: () => {
      return {
        heading: i18n._(msg`This chart couldn't load`),
        message: i18n._(msg`The ${pluginId} plugin's chart code didn't load.`),
      };
    },
  });
}

/**
 * Fills a plugin chart's area with the reason the chart cannot be drawn: the
 * plugin is missing, the saved settings are invalid, the chart failed to
 * render, or its code failed to load. The `loadFailed` reason adds a Retry
 * button.
 *
 * Use it in place of a plugin chart wherever one is rendered, for example in
 * the Data Explorer or on a dashboard tile.
 */
export function PluginVizPlaceholder({
  reason,
  pluginId,
  title,
  onRetry,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const { heading, message } = _getPlaceholderCopy({
    reason,
    pluginId,
    title,
    i18n,
  });
  return (
    <Flex h="100%" w="100%" justify="center" align="center">
      <Callout.Error title={heading} message={message} w="fit-content">
        {reason === "loadFailed" && onRetry !== undefined ? (
          <Button variant="default" w="fit-content" onClick={onRetry}>
            <Trans>Retry</Trans>
          </Button>
        ) : null}
      </Callout.Error>
    </Flex>
  );
}
```

- [ ] **Step 6: Run the new tests and confirm they pass**

Run: `pnpm vitest run shared/models/vizs/AvaPluginVizConfig src/lib/plugins/vizs/PluginVizPlaceholder`
Expected: PASS (12 tests: 7 schema, 5 placeholder).

- [ ] **Step 7: Add the built-in aliases**

Replace the whole of `shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts` with:

```ts
import type { AvaAreaChartVizConfig } from "$/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfig.types.ts";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types.ts";
import type { AvaFunnelChartVizConfig } from "$/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfig.types.ts";
import type { AvaLineChartVizConfig } from "$/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfig.types.ts";
import type { AvaPieChartVizConfig } from "$/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfig.types.ts";
import type { AvaRadarChartVizConfig } from "$/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfig.types.ts";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types.ts";
import type { AvaTableVizConfig } from "$/models/vizs/AvaTableVizConfig/AvaTableVizConfig.types.ts";
import type { IAvaVizConfigModule } from "$/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts";
import type { ObjectRegistry } from "@avandar/utils";

/** The configs of the chart and table types Avandar draws itself. */
export type BuiltInAvaVizConfig =
  | AvaTableVizConfig
  | AvaBarChartVizConfig
  | AvaLineChartVizConfig
  | AvaAreaChartVizConfig
  | AvaScatterPlotVizConfig
  | AvaPieChartVizConfig
  | AvaFunnelChartVizConfig
  | AvaRadarChartVizConfig
  | AvaBubbleChartVizConfig;

export type AvaVizConfig = BuiltInAvaVizConfig;

/** The viz types of the charts and table Avandar draws itself. */
export type BuiltInVizType = BuiltInAvaVizConfig["vizType"];
export type VizType = AvaVizConfig["vizType"];
export type AvaVizConfigRegistry = ObjectRegistry<AvaVizConfig, "vizType">;
export type AvaVizConfigType<K extends VizType> = AvaVizConfigRegistry[K];

export type AvaVizConfigUtilRegistry = {
  [K in BuiltInVizType]: IAvaVizConfigModule<K, AvaVizConfigType<K>>;
};
```

Replace the whole of `shared/models/vizs/AvaVizConfig/AvaVizConfig.ts` with:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type { AvaPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
import type {
  AvaVizConfig as AvaVizConfigRead,
  AvaVizConfigRegistry,
  AvaVizConfigType,
  AvaVizConfigUtilRegistry,
  BuiltInAvaVizConfig,
  BuiltInVizType,
  VizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";

/**
 * A chart's settings, one config type per viz type, with every column
 * referenced by its column ID so the chart keeps its columns through
 * renames and SQL edits.
 *
 * Use it wherever a chart is edited or saved, for example a chart on a
 * dashboard or in the Data Explorer. Renderers take the `UiVizConfig` form.
 */
export namespace AvaVizConfig {
  export type T = AvaVizConfigRead;
  export type Type = VizType;
  /** A config of a chart or table type Avandar draws itself. */
  export type BuiltIn = BuiltInAvaVizConfig;
  /** The viz type of a chart or table Avandar draws itself. */
  export type BuiltInType = BuiltInVizType;
  /** A config of a chart drawn by a plugin's chart type. */
  export type Plugin = AvaPluginVizConfig;
  export type Registry = AvaVizConfigRegistry;
  export type For<TypeName extends Type> = AvaVizConfigType<TypeName>;
  export type UtilRegistry = AvaVizConfigUtilRegistry;
}
```

In `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts`, rename today's union and re-declare `UiVizConfig` after it. Replace lines 84-113 (the `UiVizConfig` docstring and union) with:

```ts
/** The `UiVizConfig` of a chart or table type Avandar draws itself. */
export type BuiltInUiVizConfig =
  | { vizType: "table" }
  | UiVizConfigBar
  | UiVizConfigLine
  | UiVizConfigArea
  | {
      vizType: "scatter";
      series: ScatterSeries[];
      chartStyle?: ChartStyle;
    }
  | {
      vizType: "bubble";
      series: BubbleSeries[];
      chartStyle?: ChartStyle;
    }
  | UiVizConfigRadar
  | UiVizConfigPie
  | UiVizConfigFunnel;

/**
 * The conventional chart config a renderer takes, with no business logic: an
 * `AvaVizConfig.T` with each column ID replaced by its `QueryResult` column
 * name, the key each result row is read by. `makeUiVizConfigFromAvaVizConfig`
 * builds one. Chart renderers consume it. It also holds charts where there
 * are no column IDs yet, for example in Explorer URLs and in dashboards saved
 * before column IDs, until they bind.
 *
 * A `QueryResult` column name is not always the source column's name. An
 * aggregate is emitted as `sum(revenue)` rather than `revenue`, and an
 * explicit alias replaces the name entirely.
 */
export type UiVizConfig = BuiltInUiVizConfig;
```

- [ ] **Step 8: Narrow the module contract and the nine conversion matrices**

In `shared/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts`:

| Line | Old | New |
| --- | --- | --- |
| 5 | `  VizType,` | `  BuiltInVizType,` |
| 10 | `  VType extends VizType,` | `  VType extends BuiltInVizType,` |
| 72 | `  convertVizConfig<K extends VizType>(` | `  convertVizConfig<K extends BuiltInVizType>(` |

In each of the nine modules, make the same three edits: the `VizType` member of the `AvaVizConfig.types.ts` type import, the `convertVizConfig` generic, and the `match` call. No module gains a plugin branch.

- Import line, old `  VizType,` new `  BuiltInVizType,`
- Generic line, old `  convertVizConfig: <K extends VizType = VizType>(` new `  convertVizConfig: <K extends BuiltInVizType = BuiltInVizType>(`
- Match line, old `    return match<VizType>(newVizType)` new `    return match<BuiltInVizType>(newVizType)`

| File | Import line | Generic line | Match line |
| --- | --- | --- | --- |
| `shared/models/vizs/AvaTableVizConfig/AvaTableVizConfigs.ts` | 15 | 39 | 43 |
| `shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts` | 22 | 129 | 136 |
| `shared/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfigs.ts` | 21 | 131 | 138 |
| `shared/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfigs.ts` | 22 | 154 | 161 |
| `shared/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfigs.ts` | 20 | 89 | 108 |
| `shared/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfigs.ts` | 18 | 56 | 74 |
| `shared/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfigs.ts` | 18 | 49 | 67 |
| `shared/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfigs.ts` | 18 | 104 | 125 |
| `shared/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfigs.ts` | 20 | 89 | 108 |

For example, the bar module's three lines read afterwards:

```ts
import type {
  AvaVizConfigType,
  BuiltInVizType,
} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";
// ...
  convertVizConfig: <K extends BuiltInVizType = BuiltInVizType>(
    vizConfig: AvaBarChartVizConfig,
    newVizType: K,
  ): AvaVizConfigType<K> => {
    const { xAxisKey, series, layout, withLegend, chartStyle } = vizConfig;
    const firstSeries = series[0];
    const pieAxes = { nameKey: xAxisKey, valueKey: firstSeries?.key };
    return match<BuiltInVizType>(newVizType)
```

- [ ] **Step 9: Narrow the registry and the facade signatures**

In `shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts` (the `hydrateFromQuery` and `hydrateFromQueryResult` signatures keep `VizType`; Task 8 gives them plugin handling):

| Line | Old | New |
| --- | --- | --- |
| 14-15 | `  AvaVizConfigUtilRegistry,` / `  VizType,` | `  AvaVizConfigUtilRegistry,` / `  BuiltInVizType,` / `  VizType,` |
| 36 | `export const VizTypes = registry<VizType>().keys(` | `export const VizTypes = registry<BuiltInVizType>().keys(` |
| 52 | `function _getVizTypeModule<VType extends VizType>(` | `function _getVizTypeModule<VType extends BuiltInVizType>(` |
| 68 | `  getDescriptors: <VType extends VizType>(` | `  getDescriptors: <VType extends BuiltInVizType>(` |
| 74 | `  makeEmptyConfig: <VType extends VizType>(` | `  makeEmptyConfig: <VType extends BuiltInVizType>(` |
| 88 | `  convertVizConfig: <NewVType extends VizType>(` | `  convertVizConfig: <NewVType extends BuiltInVizType>(` |

- [ ] **Step 10: Narrow the render limits, labels, and axis roles**

`shared/config/GlobalVizConfig.ts`:

| Line | Old | New |
| --- | --- | --- |
| 1 | `import type { VizType } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` | `import type { BuiltInVizType } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` |
| 29 | `} as const satisfies Record<VizType, VizRenderLimit \| undefined>;` | `} as const satisfies Record<BuiltInVizType, VizRenderLimit \| undefined>;` |

`shared/copy/vizTypeLabel.ts`:

| Line | Old | New |
| --- | --- | --- |
| 3 | `import type { VizType } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` | `import type { BuiltInVizType } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` |
| 13 | `export function vizTypeLabel(vizType: VizType): string {` | `export function vizTypeLabel(vizType: BuiltInVizType): string {` |

`shared/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType.ts`, lines 40-45 become:

```ts
} as const satisfies Record<AvaVizConfig.BuiltInType, AxisRoles>;

/** Returns the X and Y axis roles for a visualization type. */
export function getAxisRolesFromVizType(
  vizType: AvaVizConfig.BuiltInType,
): AxisRoles {
  return { ...AXIS_ROLES_BY_VIZ_TYPE[vizType] };
}
```

- [ ] **Step 11: Type the conversion test matrices over built-in types**

In `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts`:

| Line | Old | New |
| --- | --- | --- |
| 8-12 | `import type {` / `  AvaVizConfig,` / `  AvaVizConfigType,` / `  VizType,` / `} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` | `import type {` / `  AvaVizConfigType,` / `  BuiltInAvaVizConfig,` / `  BuiltInVizType,` / `} from "$/models/vizs/AvaVizConfig/AvaVizConfig.types.ts";` |
| 35 | `const FIXTURES: { [K in VizType]: AvaVizConfigType<K> } = {` | `const FIXTURES: { [K in BuiltInVizType]: AvaVizConfigType<K> } = {` |
| 161 | `  [K in VizType]: ReadonlyArray<keyof AvaVizConfigType<K>>;` | `  [K in BuiltInVizType]: ReadonlyArray<keyof AvaVizConfigType<K>>;` |
| 175 | `function _getFixtureFromVizType(vizType: VizType): AvaVizConfig {` | `function _getFixtureFromVizType(vizType: BuiltInVizType): BuiltInAvaVizConfig {` |
| 217 | `  vizType: VizType;` | `  vizType: BuiltInVizType;` |
| 232 | `} as const satisfies Record<string, readonly VizType[]>;` | `} as const satisfies Record<string, readonly BuiltInVizType[]>;` |
| 313 | `    return !(WITH_LEGEND_TYPES as readonly VizType[]).includes(vizType);` | `    return !(WITH_LEGEND_TYPES as readonly BuiltInVizType[]).includes(vizType);` |

- [ ] **Step 12: Type the renderer and the built-in container over built-in configs**

In `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx`, change the `UiVizConfig` import to `import type { BuiltInUiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";`, the prop to `uiVizConfig: BuiltInUiVizConfig;`, and the options type to:

```tsx
/** What each chart branch reads: its own config plus the shared inputs. */
type ChartRenderOptions<VType extends BuiltInUiVizConfig["vizType"]> =
  Readonly<{
    config: Extract<BuiltInUiVizConfig, { vizType: VType }>;
    schemas: ReturnType<typeof useVizConfigSchemas>;
    limitedData: UnknownDataFrame;
    dateColumns: ReadonlySet<string>;
  }>;
```

In `src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx`, change `  vizConfig: AvaVizConfig.T;` to `  vizConfig: AvaVizConfig.BuiltIn;`.

- [ ] **Step 13: Run the viz tests**

Run: `pnpm vitest run shared/models/vizs shared/copy src/components/VisualizationContainer src/lib/plugins/vizs`
Expected: PASS. Every existing test is unchanged in behavior.

- [ ] **Step 14: Type-check**

Run: `pnpm type-check`
Expected: exit 0 (`tsc -b`, the video producer projects, and `deno check shared supabase/functions packages/shared`).

- [ ] **Step 15: Commit**

```bash
git add shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts \
  shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.ts \
  shared/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas.test.ts \
  src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.tsx \
  src/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder.test.tsx \
  shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts \
  shared/models/vizs/AvaVizConfig/AvaVizConfig.ts \
  shared/models/vizs/UiVizConfig/UiVizConfig.types.ts \
  shared/models/vizs/AvaVizConfig/IAvaVizConfigModule.ts \
  shared/models/vizs/AvaTableVizConfig/AvaTableVizConfigs.ts \
  shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts \
  shared/models/vizs/AvaLineChartVizConfig/AvaLineChartVizConfigs.ts \
  shared/models/vizs/AvaAreaChartVizConfig/AvaAreaChartVizConfigs.ts \
  shared/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfigs.ts \
  shared/models/vizs/AvaPieChartVizConfig/AvaPieChartVizConfigs.ts \
  shared/models/vizs/AvaFunnelChartVizConfig/AvaFunnelChartVizConfigs.ts \
  shared/models/vizs/AvaRadarChartVizConfig/AvaRadarChartVizConfigs.ts \
  shared/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfigs.ts \
  shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts \
  shared/config/GlobalVizConfig.ts \
  shared/copy/vizTypeLabel.ts \
  shared/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType.ts \
  shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts \
  src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx \
  src/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): add plugin viz config types and narrow built-in viz sites

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 8: Widen the viz config unions with the plugin member

**Files:**
- Modify: `shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts` (`AvaVizConfig` gains `AvaPluginVizConfig`)
- Modify: `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts` (`UiVizConfig` gains `UiPluginVizConfig`)
- Modify: `shared/models/vizs/AvaVizConfig/makeColumnSlotsFromAvaVizConfig.ts` (plugin slots from `columnSettings`)
- Modify: `shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.ts` (plugin branch, built-in overload)
- Modify: `shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.ts` (plugin branch)
- Modify: `shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.ts` (plugin branch)
- Modify: `shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts` (`convertVizConfig`, `hydrateFromQuery`, `hydrateFromQueryResult` plugin handling)
- Modify: `src/components/VisualizationContainer/VisualizationContainer.tsx` (plugin configs render `PluginVizPlaceholder`)
- Modify: `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx` (plugin branch renders `null`)
- Modify: `src/clients/dashboards/findDashboardTile/findDashboardTile.ts` (summary `vizType` is built-in)
- Modify: `src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts` (line 65)
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx` (lines 77-80)
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.ts` (new helper after line 34; lines 82, 89)
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/synchronizeUiVizType.ts` (line 26)
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx` (lines 171, 216)
- Modify: `src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV5/AvaPageDataMigrationV5.test.ts` (typing only)
- Test: `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.pluginConfigs.test.ts` (new)
- Test: `shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.test.ts`
- Test: `shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.test.ts`
- Test: `shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.test.ts`
- Test: `src/components/VisualizationContainer/__tests__/VisualizationContainer.test.tsx`

**Context:** Completes the union widening that Task 7 prepared: `AvaVizConfig = BuiltInAvaVizConfig | AvaPluginVizConfig` and `UiVizConfig = BuiltInUiVizConfig | UiPluginVizConfig` (C4), with refinement 2's facade behavior and the four free functions' plugin branches mapping over `columnSettings` under the slot target `columnSettings.<key>`. `makeUiVizConfigFromAvaVizConfig` gains an overload so a built-in config converts to a `BuiltInUiVizConfig`, which is how `BuiltInVizContainer` (Task 6) narrows its conversion. `VisualizationContainer` routes plugin configs to `PluginVizPlaceholder reason="missingPlugin"` (Task 14 swaps in `PluginVizRenderer`), and `VizSettingsFormBody`'s plugin branch returns `null` (Task 15 replaces it, so this task adds no test that pins the `null`). The Ava plugin member is assignable to the Ui member (`QueryColumn.Id` is a branded `string`), so the four "not mutually assignable" errors in `ref-viz-model.md` section 9 never appear; the real type-check after this task confirms it. Narrowing the facade to `BuiltInVizType` (Task 7) makes seven call sites in five files that pass a possibly-plugin `vizType` fail to compile; each gets the smallest guard that keeps today's behavior, and Tasks 17, 19, and 20 later replace those guards with real plugin behavior. Run `pnpm type-check` (not a grep) to confirm the list: it covers `tsc -b`, the video producer, and the Deno check of `shared`.

- [ ] **Step 1: Write the failing tests**

Create `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.pluginConfigs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";
import {
  AvaVizConfigs,
  VizTypes,
} from "$/models/vizs/AvaVizConfig/AvaVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";

const PLUGIN_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset-date" as QueryColumn.Id, stack: undefined },
  settings: { interval: "epiWeek" },
};

describe("AvaVizConfigs with a plugin config", () => {
  VizTypes.forEach((targetType) => {
    it(`converts a plugin chart to the empty ${targetType} config`, () => {
      expect(AvaVizConfigs.convertVizConfig(PLUGIN_CONFIG, targetType)).toEqual(
        AvaVizConfigs.makeEmptyConfig(targetType),
      );
    });
  });

  it("returns a plugin config unchanged from hydrateFromQuery", () => {
    expect(
      AvaVizConfigs.hydrateFromQuery(
        PLUGIN_CONFIG,
        StructuredQuery.makeEmpty(),
      ),
    ).toBe(PLUGIN_CONFIG);
  });

  it("returns a plugin config unchanged from hydrateFromQueryResult", () => {
    expect(
      AvaVizConfigs.hydrateFromQueryResult(PLUGIN_CONFIG, [
        { id: "cases" as QueryColumn.Id, name: "cases", dataType: "bigint" },
      ]),
    ).toBe(PLUGIN_CONFIG);
  });
});
```

In `shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.test.ts`:

1. Line 1 becomes `import { objectValues, propNotEq } from "@avandar/utils";`.
2. In `_readValues`, add a plugin arm between the `pie`/`funnel` arm and `.exhaustive()` (lines 75-78 become):

```ts
    .with({ vizType: P.union("pie", "funnel") }, (chart) => {
      return [row[chart.nameKey!], row[chart.valueKey!]];
    })
    .with({ vizType: "plugin" }, (chart) => {
      return objectValues(chart.columnSettings).map((name) => {
        return row[name!];
      });
    })
    .exhaustive();
```

3. Append a plugin config to `CONFIGS` and name it, so the end of the `CONFIGS` array (the `{ vizType: "table" },` entry and the closing `];`) becomes:

```ts
  { vizType: "table" },
  {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { date: CATEGORY_ID, count: REVENUE_ID },
    settings: { interval: "epiWeek" },
  },
];

const PLUGIN_CONFIG = CONFIGS[9] as AvaVizConfig.Plugin;
```

The existing `it.each(CONFIGS)` case then covers the plugin chart: its column settings read `["Q1", 7]` from the renamed columns.

4. Add two tests at the end of the `describe` block, after the "clears missing $vizType category bindings without a replacement" test:

```ts
  it("leaves a plugin column setting unset when its column is missing", () => {
    const result = makeUiVizConfigFromAvaVizConfig({
      config: PLUGIN_CONFIG,
      columns: COLUMNS.filter(propNotEq("id", CATEGORY_ID)),
    });
    expect(result.config).toEqual({
      ...PLUGIN_CONFIG,
      columnSettings: { date: undefined, count: "amount" },
    });
  });

  it("reports a missing plugin column setting by its setting key", () => {
    const result = makeUiVizConfigFromAvaVizConfig({
      config: PLUGIN_CONFIG,
      columns: COLUMNS.filter(propNotEq("id", CATEGORY_ID)),
    });
    expect(result.issues).toEqual([
      { target: "columnSettings.date", reason: "missing" },
    ]);
  });
```

In `shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.test.ts`:

1. Append a plugin config to `CONFIGS` (after `{ vizType: "table" },` on line 66), so the existing round-trip `it.each` covers it:

```ts
  { vizType: "table" },
  {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { date: "quarter", count: "revenue" },
    settings: { interval: "epiWeek" },
  },
];
```

2. Add two tests directly before `it("accepts a unique case-insensitive QueryResult column name", () => {`:

```ts
  it("binds a plugin chart's column settings to column IDs", () => {
    const result = makeAvaVizConfigFromUiVizConfig({
      config: CONFIGS[9]!,
      columns: COLUMNS,
    });
    expect(result.config).toMatchObject({
      columnSettings: { date: CATEGORY_ID, count: REVENUE_ID },
    });
  });

  it("leaves an ambiguous plugin column setting unset and reports it", () => {
    const result = makeAvaVizConfigFromUiVizConfig({
      config: {
        vizType: "plugin",
        pluginId: "avandar.epidemiology",
        pluginVizId: "epicurve",
        columnSettings: { count: "revenue" },
        settings: {},
      },
      columns: [
        ...COLUMNS,
        {
          id: uuid<QueryColumn.Id>(),
          name: "revenue",
          dataType: "double" as const,
        },
      ],
    });
    expect(result).toEqual({
      config: {
        vizType: "plugin",
        pluginId: "avandar.epidemiology",
        pluginVizId: "epicurve",
        columnSettings: { count: undefined },
        settings: {},
      },
      issues: [{ target: "columnSettings.count", reason: "ambiguous" }],
    });
  });
```

Replace the whole of `shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.test.ts` with this version, which lifts the two registries to module scope so both tests share them:

```ts
import { expect, it } from "vitest";
import { remapProvisionalColumnIdsInAvaVizConfig } from "$/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types.ts";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.ts";

const OLD_ID = "sql-id" as QueryColumn.Id;
const NEW_ID = "structured-id" as QueryColumn.Id;
const PREVIOUS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "explorer",
  sqlKey: "select revenue from sales",
  columns: [
    {
      id: OLD_ID,
      name: "revenue",
      dataType: "double",
      expressionKey: "physical",
      sqlExpressionKey: "physical",
    },
  ],
};
const CURRENT: QueryResultColumnBindingRegistry = {
  ...PREVIOUS,
  columns: [
    {
      ...PREVIOUS.columns[0]!,
      id: NEW_ID,
      expressionKey: "model",
      name: "amount",
    },
  ],
};

it("rebinds matching physical expressions and preserves unrelated selections", () => {
  const config = {
    vizType: "scatter" as const,
    series: [{ xKey: OLD_ID, key: OLD_ID, color: "#123456" }],
  };
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: CURRENT,
    }),
  ).toMatchObject({
    series: [{ xKey: NEW_ID, key: NEW_ID, color: "#123456" }],
  });
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: {
        ...CURRENT,
        columns: [{ ...CURRENT.columns[0]!, sqlExpressionKey: "unrelated" }],
      },
    }),
  ).toEqual(config);
});

it("rebinds a plugin chart's provisional column settings", () => {
  const config: AvaVizConfig.Plugin = {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { date: OLD_ID, stack: undefined },
    settings: { interval: "epiWeek" },
  };
  expect(
    remapProvisionalColumnIdsInAvaVizConfig({
      config: config,
      previous: PREVIOUS,
      current: CURRENT,
    }),
  ).toEqual({ ...config, columnSettings: { date: NEW_ID, stack: undefined } });
});
```

In `src/components/VisualizationContainer/__tests__/VisualizationContainer.test.tsx`, add this test inside `describe("VisualizationContainer")`, directly before `it("passes truncated data to bar charts over the render limit", () => {`. It uses `findByText` so it keeps passing once Task 14 routes through an async plugin lookup (the test plugin index is empty, so that lookup ends in the same placeholder):

```tsx
  it("shows the missing plugin placeholder for a plugin chart", async () => {
    renderViz({
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings: {},
      settings: {},
    });
    expect(await screen.findByText("Plugin not available")).toBeInTheDocument();
    expect(screen.getByText(/avandar\.epidemiology/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run shared/models/vizs/AvaVizConfig src/components/VisualizationContainer/__tests__`
Expected: FAIL, 19 tests. The facade tests fail with `TypeError: Cannot read properties of undefined (reading 'convertVizConfig')` (and `'hydrateFromQuery'`, `'hydrateFromQueryResult'`), because `_getVizTypeModule("plugin")` finds no module. The converter, remap, and container tests fail with `Error: Pattern matching error: no pattern matches value {"vizType":"plugin",...}` from the exhaustive `match` calls. The editor flags the plugin literals as type errors until Step 3 widens the unions; Vitest does not type-check, so the run still reaches these assertions.

- [ ] **Step 3: Widen the unions**

In `shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts`, add the import after the line-chart import (line 5):

```ts
import type { AvaPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
```

and replace `export type AvaVizConfig = BuiltInAvaVizConfig;` with:

```ts
/** Every chart config: a chart or table Avandar draws, or a plugin chart. */
export type AvaVizConfig = BuiltInAvaVizConfig | AvaPluginVizConfig;
```

In `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts`, add the import above line 1:

```ts
import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";
```

and replace `export type UiVizConfig = BuiltInUiVizConfig;` with `export type UiVizConfig = BuiltInUiVizConfig | UiPluginVizConfig;`.

- [ ] **Step 4: List plugin column settings as slots**

Replace the whole of `shared/models/vizs/AvaVizConfig/makeColumnSlotsFromAvaVizConfig.ts` with this version. It adds the `objectEntries` import, a `plugin` member to `SlotConfig`, a docstring mention of plugin column settings, and a `plugin` arm before `.exhaustive()`:

```ts
import { objectEntries } from "@avandar/utils";
import { match } from "ts-pattern";

/**
 * An authored visualization field and its position within the configuration.
 */
export type VizColumnSlot<Key extends string> = {
  key: Key | undefined;
  target: string;
};
type SlotSeries<Key extends string> = { key: Key; xKey?: Key; sizeKey?: Key };
type SlotConfig<Key extends string> =
  | { vizType: "table" }
  | {
      vizType: "bar" | "line" | "area";
      xAxisKey?: Key;
      series: ReadonlyArray<SlotSeries<Key>>;
    }
  | { vizType: "radar"; nameKey?: Key; series: ReadonlyArray<SlotSeries<Key>> }
  | { vizType: "scatter" | "bubble"; series: ReadonlyArray<SlotSeries<Key>> }
  | { vizType: "pie" | "funnel"; nameKey?: Key; valueKey?: Key }
  | {
      vizType: "plugin";
      columnSettings: Readonly<Record<string, Key | undefined>>;
    };

function _makeSeriesSlots<Key extends string>({
  series,
  keys,
}: {
  series: ReadonlyArray<SlotSeries<Key>>;
  keys: ReadonlyArray<keyof SlotSeries<Key>>;
}): Array<VizColumnSlot<Key>> {
  return series.flatMap((item, index) => {
    return keys.map((key) => {
      return {
        key: item[key],
        target: `series.${index}.${key}`,
      };
    });
  });
}

/**
 * Lists every column slot in a chart config, such as the X axis, a series'
 * size column, or a plugin chart's column setting, with its key and its
 * `target` path (for example `series.0.xKey` or `columnSettings.date`),
 * including slots with no column set. Works on configs keyed by column ID or
 * by `QueryResult` column name.
 *
 * Use it to visit each column a chart reads in one pass, for example to
 * convert every key or to report which slot failed to resolve.
 */
export function makeColumnSlotsFromAvaVizConfig<Key extends string>(
  config: Readonly<SlotConfig<Key>>,
): Array<VizColumnSlot<Key>> {
  return match(config)
    .with({ vizType: "table" }, () => {
      return [];
    })
    .with(
      { vizType: "bar" },
      { vizType: "line" },
      { vizType: "area" },
      (chart) => {
        return [
          { key: chart.xAxisKey, target: "xAxisKey" },
          ..._makeSeriesSlots({ series: chart.series, keys: ["key"] }),
        ];
      },
    )
    .with({ vizType: "radar" }, (chart) => {
      return [
        { key: chart.nameKey, target: "nameKey" },
        ..._makeSeriesSlots({ series: chart.series, keys: ["key"] }),
      ];
    })
    .with({ vizType: "scatter" }, (chart) => {
      return _makeSeriesSlots({ series: chart.series, keys: ["key", "xKey"] });
    })
    .with({ vizType: "bubble" }, (chart) => {
      return _makeSeriesSlots({
        series: chart.series,
        keys: ["key", "xKey", "sizeKey"],
      });
    })
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return [
        { key: chart.nameKey, target: "nameKey" },
        { key: chart.valueKey, target: "valueKey" },
      ];
    })
    .with({ vizType: "plugin" }, (chart) => {
      return objectEntries(chart.columnSettings).map(([settingKey, key]) => {
        return { key, target: `columnSettings.${settingKey}` };
      });
    })
    .exhaustive();
}
```

- [ ] **Step 5: Map plugin column IDs to names, with a built-in overload**

In `shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.ts`:

1. Add `objectValuesMap,` to the `@avandar/utils` import, between `makeIdLookupMap,` and `prop,`.
2. Add `import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";` directly above the `AvaVizConfig` type import.
3. Replace the `UiVizConfig` type import (the last import) with these lines, which also add the two option and result types the overloads share:

```ts
import type {
  BuiltInUiVizConfig,
  UiVizConfig,
} from "$/models/vizs/UiVizConfig/UiVizConfig.types.ts";

type ConversionOptions<TConfig> = Readonly<{
  config: Readonly<TConfig>;
  columns: readonly QueryResult.ColumnWithId[];
}>;

type Conversion<TConfig> = {
  config: TConfig;
  issues: QueryResultColumnBindingIssue[];
};
```

4. Add this helper directly above `function _mapConfig(`:

```ts
function _mapPluginConfig(
  options: Readonly<{
    config: AvaVizConfig.Plugin;
    getSlotQueryResultColumnName: GetSlotQueryResultColumnName;
  }>,
): UiPluginVizConfig {
  const { config, getSlotQueryResultColumnName } = options;
  return {
    ...config,
    columnSettings: objectValuesMap(
      config.columnSettings,
      (key, settingKey) => {
        return getSlotQueryResultColumnName({
          key,
          target: `columnSettings.${settingKey}`,
        });
      },
    ),
  };
}
```

5. At the end of `_mapConfig`, add the plugin arm after the `pie`/`funnel` arm, so the chain ends:

```ts
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({
        config: chart,
        getSlotQueryResultColumnName,
      });
    })
    .with({ vizType: "plugin" }, (chart) => {
      return _mapPluginConfig({ config: chart, getSlotQueryResultColumnName });
    })
    .exhaustive();
```

6. Replace the exported function's docstring and signature with the overloads. The body, from `const columnsById = makeIdLookupMap(columns);` on, is unchanged:

```ts
/**
 * Replaces each column ID in a chart config with that column's current
 * `QueryResult` column name, the row key the renderer reads. An ID that no
 * column has is returned in `issues` as missing, and its axis or column
 * setting is left unset or its series dropped. Leaves the saved config
 * unchanged. A built-in config always converts to a built-in config.
 *
 * Use it wherever a chart config must be read by name, for example to render
 * a chart or to write it into a URL.
 */
export function makeUiVizConfigFromAvaVizConfig(
  options: ConversionOptions<AvaVizConfig.BuiltIn>,
): Conversion<BuiltInUiVizConfig>;
export function makeUiVizConfigFromAvaVizConfig(
  options: ConversionOptions<AvaVizConfig.T>,
): Conversion<UiVizConfig>;
export function makeUiVizConfigFromAvaVizConfig({
  config,
  columns,
}: ConversionOptions<AvaVizConfig.T>): Conversion<UiVizConfig> {
  const columnsById = makeIdLookupMap(columns);
```

- [ ] **Step 6: Map plugin column names to IDs**

In `shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.ts`:

1. Line 1 becomes:

```ts
import {
  identity,
  isDefined,
  objectValuesMap,
  prop,
  propEq,
} from "@avandar/utils";
```

2. Add `import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";` directly above the `AvaVizConfig` type import.
3. Add this helper directly above `function _mapConfig(`:

```ts
function _mapPluginConfig(
  options: Readonly<{
    config: UiPluginVizConfig;
    getSlotColumnId: GetSlotColumnId;
  }>,
): AvaVizConfig.Plugin {
  const { config, getSlotColumnId } = options;
  return {
    ...config,
    columnSettings: objectValuesMap(
      config.columnSettings,
      (key, settingKey) => {
        return getSlotColumnId({ key, target: `columnSettings.${settingKey}` });
      },
    ),
  };
}
```

4. At the end of `_mapConfig`, add the plugin arm after the `pie`/`funnel` arm, so the chain ends:

```ts
    .with({ vizType: "pie" }, { vizType: "funnel" }, (chart) => {
      return _mapCategoryConfig({ config: chart, getSlotColumnId });
    })
    .with({ vizType: "plugin" }, (chart) => {
      return _mapPluginConfig({ config: chart, getSlotColumnId });
    })
    .exhaustive();
```

- [ ] **Step 7: Remap provisional IDs in plugin column settings**

In `shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.ts`, line 1 becomes `import { identity, objectValuesMap, propEq } from "@avandar/utils";`, and the end of the `match` (after the `bar`/`line`/`area` arm, lines 140-142) becomes:

```ts
    )
    .with({ vizType: "plugin" }, (chart) => {
      return {
        ...chart,
        columnSettings: objectValuesMap(chart.columnSettings, (id) => {
          return mapKey(id);
        }),
      };
    })
    .exhaustive();
}
```

- [ ] **Step 8: Handle plugin configs in the facade**

In `shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts`, replace `convertVizConfig`, `hydrateFromQuery`, and `hydrateFromQueryResult` with the code below (lines 81-127 after Task 7: from the `/**` above `convertVizConfig` through the `},` that closes `hydrateFromQueryResult`):

```ts
  /**
   * Converts a viz config to another viz type, keeping as many of its columns
   * and settings as the new type can hold. Use it when a chart's type
   * changes, for example when the user picks a new type for a chart.
   *
   * A plugin config has no built-in slots to carry over, so it converts to
   * the new type's empty config. Callers hydrate the result from the current
   * query or result, as they do for a fresh selection.
   * @param currentConfig The current viz config
   * @param newVizType The viz type we are converting to
   * @returns The new viz config
   */
  convertVizConfig: <NewVType extends BuiltInVizType>(
    currentConfig: AvaVizConfig,
    newVizType: NewVType,
  ): AvaVizConfigType<NewVType> => {
    if (currentConfig.vizType === "plugin") {
      return _getVizTypeModule(newVizType).makeEmptyConfig();
    }
    const vizUtils = _getVizTypeModule(currentConfig.vizType);
    return vizUtils.convertVizConfig(currentConfig, newVizType);
  },

  /**
   * Fills a viz config's empty slots with columns picked from a structured
   * query, keeping every slot already set. Use it when the structured query
   * changes, for example when the user changes a column's aggregation.
   *
   * Returns a plugin config unchanged: it is filled from its plugin's
   * manifest when its chart type is picked.
   * @param vizConfig The viz config
   * @param query The query to hydrate values from
   * @returns The new viz config
   */
  hydrateFromQuery: <VType extends VizType>(
    vizConfig: AvaVizConfigType<VType>,
    query: PartialStructuredQuery,
  ): AvaVizConfigType<VType> => {
    const config: AvaVizConfig = vizConfig;
    if (config.vizType === "plugin") {
      return vizConfig;
    }
    const vizUtils = _getVizTypeModule(config.vizType);
    return vizUtils.hydrateFromQuery(config, query) as AvaVizConfigType<VType>;
  },

  /**
   * Fills a viz config's empty slots from a query result's columns, keeping
   * every slot already set. Use it once a result arrives, for example from
   * raw SQL, where there is no structured query to seed from.
   *
   * Returns a plugin config unchanged: it is filled from its plugin's
   * manifest when its chart type is picked.
   * @param vizConfig The viz config
   * @param columns Columns from the executed query result
   * @returns The updated viz config
   */
  hydrateFromQueryResult: <VType extends VizType>(
    vizConfig: AvaVizConfigType<VType>,
    columns: readonly QueryResult.ColumnWithId[],
  ): AvaVizConfigType<VType> => {
    const config: AvaVizConfig = vizConfig;
    if (config.vizType === "plugin") {
      return vizConfig;
    }
    const vizUtils = _getVizTypeModule(config.vizType);
    return vizUtils.hydrateFromQueryResult(
      config,
      columns,
    ) as AvaVizConfigType<VType>;
  },
```

The `const config: AvaVizConfig = vizConfig;` line exists because TypeScript does not narrow a generic `AvaVizConfigType<VType>` on `vizType`; the widened copy narrows, and the result is cast back to the caller's type. `isEqual`, `toUiVizConfig`, `makeFromUiVizConfig`, and `remapProvisionalColumnIds` need no change: they are `JSON.stringify` equality and the free functions from Steps 5-7.

- [ ] **Step 9: Route plugin configs in the container and the settings form**

In `src/components/VisualizationContainer/VisualizationContainer.tsx`, add `import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";` after the `BuiltInVizContainer` import, and replace the docstring and function with:

```tsx
/**
 * Renders a visualization (chart or table) for a given query result and
 * `AvaVizConfig`. Pure and prop-driven: holds no state of its own and has no
 * coupling to any app-specific store, so it can be reused anywhere a query
 * result needs to be visualized.
 *
 * Built-in configs render through `BuiltInVizContainer`. A plugin config
 * shows the missing-plugin placeholder.
 */
export function VisualizationContainer({
  columns,
  rawColumns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  if (vizConfig.vizType === "plugin") {
    return (
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId={vizConfig.pluginId}
      />
    );
  }
  return (
    <BuiltInVizContainer
      columns={columns}
      rawColumns={rawColumns}
      data={data}
      dateColumns={dateColumns}
      vizConfig={vizConfig}
    />
  );
}
```

In `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx`, the docstring (lines 35-37) gains a sentence:

```tsx
 * Bar, line, area, and radar share the descriptor-driven
 * `SeriesAwareVizForm`. Pie, funnel, scatter, and bubble have their own forms.
 * Table and plugin configs render no subform.
 */
```

and the `match` ends with (the plugin arm goes between the `bubble` arm and `.exhaustive()` on line 139):

```tsx
    .with({ vizType: "plugin" }, () => {
      return null;
    })
    .exhaustive();
```

- [ ] **Step 10: Narrow the callers that pass a possibly-plugin viz type**

With the unions widened, these callers pass `AvaVizConfig.Type` (now including `"plugin"`) to a built-in-only function. Each keeps today's behavior for built-in types; no UI can produce a plugin config until Tasks 17-19.

`src/clients/dashboards/findDashboardTile/findDashboardTile.ts`: `_readVizType` only finds values in `VizTypes`, which are built-in, so the summary type says so (lines 12 and 23-24):

```ts
export type DashboardTileSummary = {
  id: string;
  prompt: string | undefined;
  vizType: AvaVizConfig.BuiltInType | undefined;
};
```

```ts
/**
 * The built-in viz type a stored value names, or undefined when it names none.
 */
function _readVizType(vizType: unknown): AvaVizConfig.BuiltInType | undefined {
```

`src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts`, line 65: `  vizType: AvaVizConfig.Type | undefined,` becomes `  vizType: AvaVizConfig.BuiltInType | undefined,` (Task 20 adds the "Plugin chart" fact).

`src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx`, lines 77-80 (the fallback while column bindings resolve; Task 19 revisits it):

```tsx
      displayVizConfig={
        columnBindings.runtime?.runtimeConfig ??
        // A plugin chart's config needs its manifest, so an empty table
        // stands in for it until the bindings resolve.
        AvaVizConfigs.makeEmptyConfig(
          props.vizType === "plugin" ? "table" : props.vizType,
        )
      }
```

`src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.ts` (edit bottom-up so the line numbers hold):

1. Line 89, `  if (changed.vizType && nextProps.vizConfig.vizType !== nextProps.vizType) {`, becomes:

```ts
  // Converting needs a built-in target. A plugin chart's config is built from
  // its manifest, so a bare "plugin" type leaves the config as it is.
  if (
    changed.vizType &&
    nextProps.vizType !== "plugin" &&
    nextProps.vizConfig.vizType !== nextProps.vizType
  ) {
```

2. Line 82, `      AvaVizConfigs.makeEmptyConfig(columnIdProps.vizType ?? DEFAULT_VIZ_TYPE),`, becomes:

```ts
      AvaVizConfigs.makeEmptyConfig(
        _getEmptyConfigVizType(columnIdProps.vizType),
      ),
```

3. Add this helper after the `DEFAULT_NL_QUERY` constant (after line 34):

```ts
/**
 * The built-in viz type to build an empty config for. A plugin chart's config
 * needs its manifest, so it falls back to the default like an unset type.
 */
function _getEmptyConfigVizType(
  vizType: AvaVizConfig.Type | undefined,
): AvaVizConfig.BuiltInType {
  return vizType === undefined || vizType === "plugin"
    ? DEFAULT_VIZ_TYPE
    : vizType;
}
```

`src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/synchronizeUiVizType.ts`, line 26, `  if (changed.vizType && vizConfig.vizType !== vizType) {`, becomes:

```ts
  // Version 0 blocks predate plugin charts, so only a built-in type converts.
  if (
    changed.vizType &&
    vizType !== "plugin" &&
    vizConfig.vizType !== vizType
  ) {
```

`src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx` (Task 17 replaces the `setActiveVizType` signature with a plugin target; edit bottom-up):

1. Line 216 in `restoreVizConfigFromUrl`, `        vizConfig: AvaVizConfigs.makeEmptyConfig(urlVizConfig.vizType),`, becomes the lines below. A plugin chart restored from the URL shows with its column settings unset until `syncVizFromQueryResult` binds the URL's column names through the plugin branch from Step 6:

```tsx
        vizConfig:
          urlVizConfig.vizType === "plugin"
            ? { ...urlVizConfig, columnSettings: {} }
            : AvaVizConfigs.makeEmptyConfig(urlVizConfig.vizType),
```

2. Line 171 in `setActiveVizType`, `      if (vizConfig.vizType === newVizType) {`, becomes:

```ts
      // A bare "plugin" type names no plugin chart type, so there is nothing
      // to activate.
      if (vizConfig.vizType === newVizType || newVizType === "plugin") {
```

`src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV5/AvaPageDataMigrationV5.test.ts` (probe site #28): `upgradeAvaPageData` returns the current document type, whose DataViz `vizType` now allows `"plugin"`, while `downgrade` takes the version 5 type that keeps the frozen version 4 list. First wrap the four `downgrade` arguments (line numbers as the file stands before this edit):

| Line | Old | New |
| --- | --- | --- |
| 98 | `  expect(AvaPageDataMigrationV5.downgrade(upgraded)).toEqual(legacy);` | `  expect(AvaPageDataMigrationV5.downgrade(_asV5Data(upgraded))).toEqual(legacy);` |
| 125 | `    return AvaPageDataMigrationV5.downgrade(bound as typeof upgraded);` | `    return AvaPageDataMigrationV5.downgrade(` / `      _asV5Data(bound as typeof upgraded),` / `    );` |
| 190 | `  const downgraded = AvaPageDataMigrationV5.downgrade(bound);` | `  const downgraded = AvaPageDataMigrationV5.downgrade(_asV5Data(bound));` |
| 263 | `      return AvaPageDataMigrationV5.downgrade(document);` | `      return AvaPageDataMigrationV5.downgrade(_asV5Data(document));` |

Then add the imports and the helper after line 2 (the `upgradeAvaPageData` import):

```ts
import type { V5_AvaPageData } from "./AvaPageDataMigrationV5.types";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

/**
 * Narrows an upgraded document to the version 5 shape `downgrade` takes. The
 * current DataViz `vizType` also allows `"plugin"`, which version 5 keeps out
 * of its frozen version 4 list. These documents hold only built-in charts.
 */
function _asV5Data(data: AvaPageData): V5_AvaPageData {
  return data as V5_AvaPageData;
}
```

- [ ] **Step 11: Run the tests and confirm they pass**

Run: `pnpm vitest run shared/models/vizs shared/copy src/components/VisualizationContainer src/lib/plugins src/clients/dashboards src/components/RichText src/views/DashboardApp src/views/DataExplorerApp`
Expected: PASS. The new and changed files: `AvaVizConfigs.pluginConfigs.test.ts` (11 tests), `makeUiVizConfigFromAvaVizConfig.test.ts` (32), `makeAvaVizConfigFromUiVizConfig.test.ts` (16), `remapProvisionalColumnIdsInAvaVizConfig.test.ts` (2), `VisualizationContainer.test.tsx` (14).

- [ ] **Step 12: Type-check every project**

Run: `pnpm type-check`
Expected: exit 0. Every site from the `ref-viz-model.md` section 9 probe is accounted for:

| Probe site | Where it is handled |
| --- | --- |
| #1 `GlobalVizConfig.ts:29`, #2 `vizTypeLabel.ts:14` | Task 7, typed over `BuiltInVizType` |
| #3-#11 the nine `.exhaustive(` calls | Task 7, `match<BuiltInVizType>` |
| #12-#14 `AvaVizConfigs.ts:34, 37, 55` | Task 7 (registry, `VizTypes`, `_getVizTypeModule`) and Step 8 (plugin dispatch) |
| #15-#16 `makeUiVizConfigFromAvaVizConfig.ts:198, 221` | Steps 4 and 5 |
| #17-#18 `makeAvaVizConfigFromUiVizConfig.ts:152, 204` | Steps 4 and 6 |
| #19 `remapProvisionalColumnIdsInAvaVizConfig.ts:141` | Step 7 |
| #20-#21 `getAxisRolesFromVizType.ts:40, 44` | Task 7 |
| #22-#23 conversion test `FIXTURES`, `OPTIONAL_KEYS` | Task 7 |
| #24 `makeUiVizConfigFromAvaVizConfig.test.ts:78` | Step 1 (`_readValues` plugin arm) |
| #25-#26 `VisualizationContainer.tsx:143, 343` | Task 6 moved them into `UiVizConfigRenderer` (typed `BuiltInUiVizConfig` in Task 7); Step 9 routes plugin configs before it |
| #27 `VizSettingsFormBody.tsx:139` | Step 9 |
| #28 `AvaPageDataMigrationV5.test.ts:98, 125, 190, 263` | Step 10 |
| Extra four (`synchronizeUiVizType.ts:31`, `DataVizPBlock.test.tsx:394`, `makeDataVizPBlockStateFromProps.test.ts:228, 249`) | Do not occur: `AvaPluginVizConfig` is assignable to `UiPluginVizConfig` |
| New with the narrowed facade: `useGadgetSummaries.ts:69`, `DataVizPBlock.tsx:79`, `makeDataVizPBlockStateFromProps.ts:82, 100`, `synchronizeUiVizType.ts:35`, `DataExplorerStateManager.tsx:178, 216`, `BuiltInVizContainer.tsx:43` | Steps 5 and 10 |
| `hydrate*` callers (`DataExplorerStateManager.tsx`, `DataExplorerSourceActions.ts`, `makeRuntimeColumnBindingsFromDataVizProps.ts`, `DataExplorerStateManager.test.ts`) | Step 8 keeps `hydrate*` generic over every `VizType` |

Then run: `pnpm exec eslint shared/models/vizs src/components/VisualizationContainer src/lib/plugins/vizs src/clients/dashboards src/components/RichText/Gadget/useGadgetSummaries src/views/DashboardApp/AvaPage src/views/DataExplorerApp/DataExplorerStateManager`
Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add shared/models/vizs/AvaVizConfig/AvaVizConfig.types.ts \
  shared/models/vizs/UiVizConfig/UiVizConfig.types.ts \
  shared/models/vizs/AvaVizConfig/makeColumnSlotsFromAvaVizConfig.ts \
  shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.ts \
  shared/models/vizs/AvaVizConfig/makeUiVizConfigFromAvaVizConfig/makeUiVizConfigFromAvaVizConfig.test.ts \
  shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.ts \
  shared/models/vizs/AvaVizConfig/makeAvaVizConfigFromUiVizConfig/makeAvaVizConfigFromUiVizConfig.test.ts \
  shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.ts \
  shared/models/vizs/AvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig/remapProvisionalColumnIdsInAvaVizConfig.test.ts \
  shared/models/vizs/AvaVizConfig/AvaVizConfigs.ts \
  shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.pluginConfigs.test.ts \
  src/components/VisualizationContainer/VisualizationContainer.tsx \
  src/components/VisualizationContainer/__tests__/VisualizationContainer.test.tsx \
  src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx \
  src/clients/dashboards/findDashboardTile/findDashboardTile.ts \
  src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.ts \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/synchronizeUiVizType.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx \
  src/views/DashboardApp/AvaPage/migrations/AvaPageDataMigrationV5/AvaPageDataMigrationV5.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): add the plugin member to the viz config unions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 9: `AvaPluginVizConfigs` and the shared column picker data type check

**Files:**
- Create: `shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts`
- Create: `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts`
- Modify: `src/components/VisualizationContainer/VizSettingsForm/Control/ColumnPickerControl.tsx` (lines 1-5 imports, lines 38-49 filter)
- Test: `shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.test.ts`
- Test: `shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.makeConfig.test.ts`
- Test: `shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.getMissingRequiredKeys.test.ts`
- Test (existing, must stay green): `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx` (its "picks an X axis column" tests pick through `ColumnPickerControl` with `dataType: "any"`) and the rest of `src/components/VisualizationContainer/VizSettingsForm`

**Context:** Implements C4's `AvaPluginVizConfigs` (`makeConfig`, `getMissingRequiredKeys`) and `doesDataTypeMatchColumnPicker`, using the types from Task 7 (`AvaPluginVizConfig`, `UiPluginVizConfig`, `PluginVizSettingShape`, `PluginVizColumnPickerDataType`). The data type rule is lifted out of `ColumnPickerControl` (`ref-viz-ui-explorer.md` section 2.4): `any` or no data type accepts every column, `numeric` is `bigint`/`double`, `temporal` is `date`/`time`/`timestamp`, and `text` is `varchar` (`boolean` only matches `any`). `ColumnPickerControl` then calls the helper, so the settings form (Task 15) and `makeConfig` agree on which columns a picker accepts. `makeConfig` auto-fills only required column pickers (an optional picker starts unset, so one column is never bound to several roles); `getMissingRequiredKeys` is what `PluginVizRenderer` (Task 14) uses to show the empty state. The `AvaPluginVizConfig/` directory already holds Task 7's flat schema test, so this module's two-file suite goes in `AvaPluginVizConfig/__tests__/`, as `AvaVizConfig/__tests__/` does for `AvaVizConfigs`.

- [ ] **Step 1: Write the failing tests**

Create `shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { doesDataTypeMatchColumnPicker } from "$/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts";
import type { PluginVizColumnPickerDataType } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

function _getMatchingDataTypes(
  pickerDataType: PluginVizColumnPickerDataType | undefined,
): AvaDataType.T[] {
  return AvaDataType.Types.filter((dataType) => {
    return doesDataTypeMatchColumnPicker({ dataType, pickerDataType });
  });
}

describe("doesDataTypeMatchColumnPicker", () => {
  it("accepts every data type for a picker that asks for any", () => {
    expect(_getMatchingDataTypes("any")).toEqual(AvaDataType.Types);
  });

  it("accepts every data type for a picker with no data type", () => {
    expect(_getMatchingDataTypes(undefined)).toEqual(AvaDataType.Types);
  });

  it("accepts only bigint and double for a numeric picker", () => {
    expect(_getMatchingDataTypes("numeric")).toEqual(["bigint", "double"]);
  });

  it("accepts only time, date, and timestamp for a temporal picker", () => {
    expect(_getMatchingDataTypes("temporal")).toEqual([
      "time",
      "date",
      "timestamp",
    ]);
  });

  it("accepts only varchar for a text picker", () => {
    expect(_getMatchingDataTypes("text")).toEqual(["varchar"]);
  });
});
```

Create `shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.makeConfig.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PluginVizSettingShape } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const REGION_ID = "region-id" as QueryColumn.Id;
const ONSET_ID = "onset-id" as QueryColumn.Id;
const REPORTED_ID = "reported-id" as QueryColumn.Id;
const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: REGION_ID, name: "region", dataType: "varchar" },
  { id: ONSET_ID, name: "onset_date", dataType: "date" },
  { id: REPORTED_ID, name: "reported_at", dataType: "timestamp" },
];

function _makeConfigFromSettings(
  settings: readonly PluginVizSettingShape[],
): ReturnType<typeof AvaPluginVizConfigs.makeConfig> {
  return AvaPluginVizConfigs.makeConfig({
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    settings,
    columns: COLUMNS,
  });
}

describe("AvaPluginVizConfigs.makeConfig", () => {
  it("names the plugin and chart type it was built for", () => {
    expect(_makeConfigFromSettings([])).toEqual({
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings: {},
      settings: {},
    });
  });

  it("fills a required column picker with the first column of its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "date",
        required: true,
        control: { kind: "columnPicker", dataType: "temporal" },
      },
    ]);
    expect(config.columnSettings).toEqual({ date: ONSET_ID });
  });

  it("fills a required column picker with no data type from the first column", () => {
    const config = _makeConfigFromSettings([
      { key: "stack", required: true, control: { kind: "columnPicker" } },
    ]);
    expect(config.columnSettings).toEqual({ stack: REGION_ID });
  });

  it("leaves a required column picker unset when no column has its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "count",
        required: true,
        control: { kind: "columnPicker", dataType: "numeric" },
      },
    ]);
    expect(config.columnSettings.count).toBeUndefined();
  });

  it("leaves an optional column picker unset when a column has its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "lower",
        required: false,
        control: { kind: "columnPicker", dataType: "temporal" },
      },
    ]);
    expect(config.columnSettings.lower).toBeUndefined();
  });

  it("starts each non-column setting at its default", () => {
    const config = _makeConfigFromSettings([
      {
        key: "interval",
        required: true,
        default: "epiWeek",
        control: { kind: "segmented" },
      },
      {
        key: "maxSeries",
        required: false,
        default: 8,
        control: { kind: "number" },
      },
    ]);
    expect(config.settings).toEqual({ interval: "epiWeek", maxSeries: 8 });
  });

  it("leaves a non-column setting with no default unset", () => {
    const config = _makeConfigFromSettings([
      { key: "title", required: false, control: { kind: "text" } },
    ]);
    expect(config.settings.title).toBeUndefined();
  });
});
```

Create `shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.getMissingRequiredKeys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  PluginVizSettingShape,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const SETTINGS: readonly PluginVizSettingShape[] = [
  {
    key: "date",
    required: true,
    control: { kind: "columnPicker", dataType: "temporal" },
  },
  {
    key: "stack",
    required: false,
    control: { kind: "columnPicker", dataType: "text" },
  },
  { key: "interval", required: true, control: { kind: "segmented" } },
  { key: "title", required: false, control: { kind: "text" } },
];

const UI_CONFIG: UiPluginVizConfig = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset_date", stack: undefined },
  settings: { interval: "epiWeek", title: undefined },
};

describe("AvaPluginVizConfigs.getMissingRequiredKeys", () => {
  it("lists no keys when every required setting is set", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: UI_CONFIG,
        settings: SETTINGS,
        columnNames: ["onset_date", "region"],
      }),
    ).toEqual([]);
  });

  it("lists a required column setting that is unset", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: { ...UI_CONFIG, columnSettings: { date: undefined } },
        settings: SETTINGS,
        columnNames: ["onset_date"],
      }),
    ).toEqual(["date"]);
  });

  it("lists a required column setting whose column the result lacks", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: UI_CONFIG,
        settings: SETTINGS,
        columnNames: ["region"],
      }),
    ).toEqual(["date"]);
  });

  it("accepts a set column setting when no column names are given", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: {
          ...UI_CONFIG,
          columnSettings: { date: "onset-id" as QueryColumn.Id },
        },
        settings: SETTINGS,
        columnNames: undefined,
      }),
    ).toEqual([]);
  });

  it("lists a required non-column setting that is unset", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: { ...UI_CONFIG, settings: { interval: undefined } },
        settings: SETTINGS,
        columnNames: ["onset_date"],
      }),
    ).toEqual(["interval"]);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run shared/models/vizs/doesDataTypeMatchColumnPicker shared/models/vizs/AvaPluginVizConfig/__tests__`
Expected: FAIL, `Failed to resolve import` for `doesDataTypeMatchColumnPicker.ts` and `AvaPluginVizConfigs.ts` in all three files.

- [ ] **Step 3: Create `doesDataTypeMatchColumnPicker`**

Create `shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts`:

```ts
import { matchLiteral } from "@avandar/utils";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { PluginVizColumnPickerDataType } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

/**
 * Whether a column of `dataType` can fill a column picker that asks for
 * `pickerDataType`. `any`, or no data type, accepts every column.
 *
 * Use it wherever a column picker's choices are narrowed, for example to list
 * the columns a settings form offers or to auto-fill a required column.
 */
export function doesDataTypeMatchColumnPicker(
  options: Readonly<{
    dataType: AvaDataType.T;
    pickerDataType: PluginVizColumnPickerDataType | undefined;
  }>,
): boolean {
  const { dataType, pickerDataType } = options;
  if (pickerDataType === undefined) {
    return true;
  }
  return matchLiteral(pickerDataType, {
    any: true,
    numeric: () => {
      return AvaDataType.isNumeric(dataType);
    },
    temporal: () => {
      return AvaDataType.isTemporal(dataType);
    },
    text: () => {
      return AvaDataType.isText(dataType);
    },
  });
}
```

- [ ] **Step 4: Create `AvaPluginVizConfigs`**

Create `shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts`. `makeObject` from `@avandar/utils` builds each record; its `valueKey` option only accepts keys whose values are property keys, so the setting defaults (which can be booleans) go through `valueFn`:

```ts
import { makeObject, prop } from "@avandar/utils";
import { doesDataTypeMatchColumnPicker } from "$/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type {
  AvaPluginVizConfig,
  PluginVizSettingShape,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

function _isColumnSetting(setting: PluginVizSettingShape): boolean {
  return setting.control.kind === "columnPicker";
}

function _getFirstMatchingColumnId(
  options: Readonly<{
    setting: PluginVizSettingShape;
    columns: readonly QueryResult.ColumnWithId[];
  }>,
): QueryColumn.Id | undefined {
  const { setting, columns } = options;
  return columns.find((column) => {
    return doesDataTypeMatchColumnPicker({
      dataType: column.dataType,
      pickerDataType: setting.control.dataType,
    });
  })?.id;
}

function _isRequiredSettingMissing(
  options: Readonly<{
    setting: PluginVizSettingShape;
    config: AvaPluginVizConfig | UiPluginVizConfig;
    columnNames: readonly string[] | undefined;
  }>,
): boolean {
  const { setting, config, columnNames } = options;
  if (!_isColumnSetting(setting)) {
    return config.settings[setting.key] === undefined;
  }
  const column = config.columnSettings[setting.key];
  return (
    column === undefined ||
    (columnNames !== undefined && !columnNames.includes(column))
  );
}

/**
 * Builds and checks plugin chart configs from the settings a plugin's
 * manifest declares for the chart type. Use it wherever a plugin chart is
 * picked or drawn, for example when a user picks a plugin chart type.
 */
export const AvaPluginVizConfigs = {
  /**
   * Builds a plugin chart config from its manifest settings and the current
   * result columns. Each setting starts at its `default`. A required column
   * picker takes the first column whose data type it accepts. An optional
   * column picker starts unset, so one column is never bound to several
   * roles.
   */
  makeConfig: (
    options: Readonly<{
      pluginId: string;
      pluginVizId: string;
      settings: readonly PluginVizSettingShape[];
      columns: readonly QueryResult.ColumnWithId[];
    }>,
  ): AvaPluginVizConfig => {
    const { pluginId, pluginVizId, settings, columns } = options;
    return {
      vizType: "plugin",
      pluginId,
      pluginVizId,
      columnSettings: makeObject(settings.filter(_isColumnSetting), {
        key: "key",
        valueFn: (setting) => {
          return setting.required
            ? _getFirstMatchingColumnId({ setting, columns })
            : undefined;
        },
      }),
      settings: makeObject(
        settings.filter((setting) => {
          return !_isColumnSetting(setting);
        }),
        {
          key: "key",
          valueFn: (setting) => {
            return setting.default;
          },
        },
      ),
    };
  },

  /**
   * Lists the keys of required settings the config leaves unset, so a chart
   * can ask for them instead of drawing. When `columnNames` is given, a
   * required column setting whose column name is not among them is missing
   * too. Pass it with a `UiPluginVizConfig`, whose column settings hold
   * names.
   */
  getMissingRequiredKeys: (
    options: Readonly<{
      config: AvaPluginVizConfig | UiPluginVizConfig;
      settings: readonly PluginVizSettingShape[];
      columnNames: readonly string[] | undefined;
    }>,
  ): string[] => {
    const { config, settings, columnNames } = options;
    return settings
      .filter((setting) => {
        return (
          setting.required &&
          _isRequiredSettingMissing({ setting, config, columnNames })
        );
      })
      .map(prop("key"));
  },
};
```

- [ ] **Step 5: Make `ColumnPickerControl` use the shared check**

In `src/components/VisualizationContainer/VizSettingsForm/Control/ColumnPickerControl.tsx`, replace lines 1-5 with:

```tsx
import { makeSelectOptions, Select } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { doesDataTypeMatchColumnPicker } from "$/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker";
```

and replace the `filtered` memo (lines 38-49) with:

```tsx
  const filtered = useMemo(() => {
    return fields.filter((field) => {
      return doesDataTypeMatchColumnPicker({
        dataType: field.dataType,
        pickerDataType: dataType,
      });
    });
  }, [fields, dataType]);
```

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `pnpm vitest run shared/models/vizs/doesDataTypeMatchColumnPicker shared/models/vizs/AvaPluginVizConfig src/components/VisualizationContainer/VizSettingsForm`
Expected: PASS. New: `doesDataTypeMatchColumnPicker.test.ts` (5 tests), `AvaPluginVizConfigs.makeConfig.test.ts` (7), `AvaPluginVizConfigs.getMissingRequiredKeys.test.ts` (5). The settings form suites pass unchanged, including the "picks an X axis column" tests that go through `ColumnPickerControl`. No test targets `ColumnPickerControl` on its own; `doesDataTypeMatchColumnPicker.test.ts` now covers each data type branch it used to hold.

- [ ] **Step 7: Type-check and lint**

Run: `pnpm type-check && pnpm exec eslint shared/models/vizs src/components/VisualizationContainer/VizSettingsForm/Control`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts \
  shared/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.test.ts \
  shared/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts \
  shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.makeConfig.test.ts \
  shared/models/vizs/AvaPluginVizConfig/__tests__/AvaPluginVizConfigs.getMissingRequiredKeys.test.ts \
  src/components/VisualizationContainer/VizSettingsForm/Control/ColumnPickerControl.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): build plugin viz configs from manifest settings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 10: Built-in bar chart `barGap` setting

**Files:**
- Modify: `shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts` (new optional `barGap` field after `layout`)
- Modify: `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts` (`UiVizConfigBar.barGap`)
- Modify: `shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts` (`BAR_GAP_OPTIONS`, a `barGap` descriptor after `layout`)
- Modify: `shared/copy/vizSettingControlLabel/vizSettingControlLabel.ts` (catalog entries "Bar gap", "Default", "None")
- Modify: `src/lib/ui/viz/BarChart/BarChart.tsx` (`barGap` prop, `barChartProps.barCategoryGap`, passed to the composite)
- Modify: `src/lib/ui/viz/renderXYComposite.tsx` (`barGap` prop, `composedChartProps.barCategoryGap`)
- Modify: `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx` (`_renderBarChart` passes `barGap`)
- Modify: `src/lib/ui/viz/BarChart/__tests__/BarChartTestFixtures.tsx` (`renderBar` passes `barGap`)
- Test: `src/lib/ui/viz/BarChart/__tests__/BarChart.test.tsx`
- Test: `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx`
- Test: `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx`
- Test: `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts` (`FIXTURES.bar`, `OPTIONAL_KEYS.bar`, keep/drop tests)
- Test: `shared/models/vizs/descriptors/makeAxisDescriptors/makeAxisDescriptors.test.ts` (the bar descriptor order list)
- Test (existing): `shared/copy/vizSettingControlLabel/vizSettingControlLabel.test.ts` (catalog drift guard)

**Context:** Implements refinement 6: `barGap?: "default" | "none"` is a top-level field on the Ava and Ui bar configs (not inside `chartStyle`), with a segmented descriptor in the "Style" group, catalog entries for its label and option labels, and `OPTIONAL_KEYS.bar` updated so the conversion shape matrix allows it on bar configs and forbids it elsewhere. `"none"` maps to Recharts `barCategoryGap: 0` through Mantine's `barChartProps`, which Mantine spreads onto the Recharts chart after its own `margin` (`ref-viz-ui-explorer.md` section 3.0), and through `composedChartProps` when a bar chart falls back to the composite renderer. `UiVizConfigRenderer` (Task 6) passes the field through, which is what lets a plugin transform's bar spec ask for touching bars (Task 12 maps `PluginChartSpec.barGap` onto it). The ID-to-name converters spread the bar config, so `barGap` crosses them unchanged, and the bar-to-bar conversion returns the config as is; the other conversion targets drop it. Two existing tests change with the registry: the bar key-order list in `makeAxisDescriptors.test.ts`, and `SeriesAwareVizForm.descriptors.test.tsx`, which generates one more case on its own (`changes the "Bar gap" setting via its segmented control`). An unset `barGap` shows no selected segment, the same as an unset legend position. New strings are extracted in Task 26.

- [ ] **Step 1: Write the failing tests**

In `src/lib/ui/viz/BarChart/__tests__/BarChartTestFixtures.tsx`, `renderBar` passes the field (after line 56, `        layout={config.layout}`):

```tsx
        layout={config.layout}
        barGap={config.barGap}
```

In `src/lib/ui/viz/BarChart/__tests__/BarChart.test.tsx`, add these two tests directly before `it("renders CompositeChart when any series renderAs differs", () => {`:

```tsx
it('passes barGap "none" as barChartProps.barCategoryGap 0', () => {
  renderBar({ ...BAR_BASELINE, barGap: "none" });
  const props = lastProps<{ barChartProps: { barCategoryGap?: number } }>(
    mantineBarChartMock,
  );
  expect(props.barChartProps.barCategoryGap).toBe(0);
});

it("leaves barCategoryGap unset for the default bar gap", () => {
  renderBar({ ...BAR_BASELINE, barGap: "default" });
  const props = lastProps<{ barChartProps: { barCategoryGap?: number } }>(
    mantineBarChartMock,
  );
  expect(props.barChartProps).not.toHaveProperty("barCategoryGap");
});
```

and this test directly before `it("composite line series strokeWidth flows through lineProps", () => {`:

```tsx
it('passes barGap "none" to a composite chart as composedChartProps.barCategoryGap 0', () => {
  renderBar({
    ...BAR_BASELINE,
    barGap: "none",
    series: [
      { renderAs: "bar", key: "v" },
      { renderAs: "line", key: "w" },
    ],
  });
  const props = lastProps<{
    composedChartProps: { barCategoryGap?: number };
  }>(mantineCompositeChartMock);
  expect(props.composedChartProps.barCategoryGap).toBe(0);
});
```

In `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx`, replace the `@/lib/ui/viz/BarChart/BarChart` mock with this version, which records `barGap`:

```tsx
vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
  return {
    BarChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
      data: UnknownDataFrame;
      barGap?: string;
    }) => {
      return (
        <div
          data-testid="bar-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
          data-row-count={props.data.length}
          data-bar-gap={props.barGap}
        />
      );
    },
  };
});
```

and add this test directly before `it("lists the given column names in the table view", () => {`:

```tsx
  it("passes the config's bar gap to the bar chart", () => {
    render(
      <UiVizConfigRenderer
        uiVizConfig={{
          vizType: "bar",
          xAxisKey: "week",
          series: [{ renderAs: "bar", key: "cases" }],
          layout: "stack",
          barGap: "none",
          withLegend: false,
        }}
        data={DATA}
        dateColumns={NO_DATE_COLUMNS}
        columnNames={["week", "cases"]}
      />,
    );
    expect(screen.getByTestId("bar-chart")).toHaveAttribute(
      "data-bar-gap",
      "none",
    );
  });
```

In `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx`, add this test at the end of `describe("VizSettingsFormBody: bar chart smoke test")`, after "renders the bar layout segmented control":

```tsx
  it("sets barGap to none when the None bar gap option is picked", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });
    fireEvent.click(screen.getByRole("radio", { name: "None" }));
    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      barGap: "none",
    });
  });
```

In `shared/models/vizs/descriptors/makeAxisDescriptors/makeAxisDescriptors.test.ts`, the bar order test (lines 94-97) becomes:

```ts
  it("bar leads with layout, bar gap, legend, then the axes and grid", () => {
    expect(_keysOf(AvaVizConfigs.getDescriptors("bar").chart)).toEqual([
      "layout",
      "barGap",
      "withLegend",
```

In `shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts`:

1. `FIXTURES.bar` sets the field to its non-default value (after `    layout: "stack",` on line 51): add `    barGap: "none",`.
2. In `OPTIONAL_KEYS`, `  bar: ["chartStyle"],` becomes `  bar: ["barGap", "chartStyle"],`.
3. Add this block directly before `const WITH_LEGEND_TYPES = DECLARED_BY.withLegend;`:

```ts
describe("AvaVizConfigs.convertVizConfig bar gap", () => {
  it("keeps barGap when a bar chart stays a bar chart", () => {
    const result = AvaVizConfigs.convertVizConfig(FIXTURES.bar, "bar");
    expect(result.barGap).toBe("none");
  });

  it("drops barGap when a bar chart becomes a line chart", () => {
    const result = AvaVizConfigs.convertVizConfig(FIXTURES.bar, "line");
    expect(result).not.toHaveProperty("barGap");
  });
});
```

- [ ] **Step 2: Run them and confirm the new behavior tests fail**

Run: `pnpm vitest run src/lib/ui/viz/BarChart src/components/VisualizationContainer/UiVizConfigRenderer src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody shared/models/vizs/descriptors shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts`
Expected: FAIL, 5 tests: the bar key-order test (no `barGap` key), "passes the config's bar gap to the bar chart" (no `data-bar-gap`), the two `barCategoryGap 0` tests (`undefined`), and "sets barGap to none when the None bar gap option is picked" (`Unable to find an accessible element with the role "radio" and name "None"`). "leaves barCategoryGap unset for the default bar gap" and the two conversion tests already pass: they pin behavior that must not change (no gap prop for `"default"`, and no `barGap` on a line chart). The `barGap` literals are type errors until Step 3 adds the field; Vitest runs regardless.

- [ ] **Step 3: Add the field and the descriptor**

In `shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts`, add after the `layout` field (after line 34):

```ts

  /**
   * Space between bar categories. `"none"` draws neighboring bars touching,
   * as an epicurve or a histogram needs. Unset draws the renderer's default
   * gap.
   */
  barGap?: "default" | "none";
```

In `shared/models/vizs/UiVizConfig/UiVizConfig.types.ts`, `UiVizConfigBar` gains `  barGap?: "default" | "none";` after its `layout` line:

```ts
type UiVizConfigBar = {
  vizType: "bar";
  xAxisKey: string | undefined;
  series: XYSeries[];
  layout: "group" | "stack" | "percent";
  barGap?: "default" | "none";
  withLegend: boolean;
  chartStyle?: ChartStyle;
};
```

In `shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts`, add the options after `BAR_LAYOUT_OPTIONS` (after line 36):

```ts

const BAR_GAP_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "none", label: "None" },
] as const;
```

and add the descriptor to `descriptors.chart` directly after the `layout` descriptor (the object whose control is `{ kind: "segmented", options: BAR_LAYOUT_OPTIONS }`):

```ts
    {
      key: "barGap",
      label: "Bar gap",
      group: "Style",
      control: { kind: "segmented", options: BAR_GAP_OPTIONS },
    },
```

- [ ] **Step 4: Run the label catalog guard and confirm it fails**

Run: `pnpm vitest run shared/copy/vizSettingControlLabel/vizSettingControlLabel.test.ts`
Expected: FAIL, "covers every label the descriptor registries render": `expected [ 'Bar gap', 'Default', 'None' ] to deeply equal []`.

- [ ] **Step 5: Add the catalog entries**

In `shared/copy/vizSettingControlLabel/vizSettingControlLabel.ts`, keep the map alphabetical: add `"Bar gap"` before `"Bar layout"`, `Default` after `Curve`, and `None` after `Natural`. The two edited regions read:

```ts
    "Area layout": t`Area layout`,
    "Bar gap": t`Bar gap`,
    "Bar layout": t`Bar layout`,
    Bottom: t`Bottom`,
    Color: t`Color`,
    Curve: t`Curve`,
    Default: t`Default`,
    "Fill opacity": t`Fill opacity`,
```

```ts
    Natural: t`Natural`,
    None: t`None`,
    Overlapping: t`Overlapping`,
```

- [ ] **Step 6: Map the gap in the bar and composite renderers**

In `src/lib/ui/viz/BarChart/BarChart.tsx`:

1. `Props` (lines 14-20) becomes:

```tsx
type Props = XYChartProps & {
  /**
   * Bar layout when every series renders as bars. Composite renders
   * (mixed `renderAs`) ignore this prop and always group.
   */
  layout?: "group" | "stack" | "percent";

  /**
   * Space between bar categories. `"none"` draws neighboring bars touching.
   * Unset or `"default"` keeps Recharts' default gap.
   */
  barGap?: "default" | "none";
};
```

2. Destructure it after `layout = "group",` in the parameter list: add `  barGap,`.
3. Pass it to the composite renderer: in the `renderXYComposite({ ... })` call, add `      barGap,` after its last argument, `      chartStyle,`.
4. The `barChartProps` prop on `MantineBarChart` becomes:

```tsx
      barChartProps={{
        margin: {
          bottom: hasXLabel ? 30 : undefined,
          left: hasYLabel ? 10 : undefined,
          right: hasYLabel ? 5 : undefined,
        },
        ...(barGap === "none" ? { barCategoryGap: 0 } : {}),
      }}
```

In `src/lib/ui/viz/renderXYComposite.tsx`:

1. `Props` gains the field after `chartStyle?: ChartStyle;`:

```tsx
  chartStyle?: ChartStyle;

  /** `"none"` draws neighboring bar categories touching. */
  barGap?: "default" | "none";
};
```

2. Destructure it after `chartStyle,` in the parameter list: add `  barGap,`.
3. The `composedChartProps` prop on `MantineCompositeChart` becomes:

```tsx
      composedChartProps={{
        margin: {
          bottom: hasXLabel ? 30 : undefined,
          left: hasYLabel ? 10 : undefined,
          right: hasYLabel ? 5 : undefined,
        },
        ...(barGap === "none" ? { barCategoryGap: 0 } : {}),
      }}
```

In `src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx`, `_renderBarChart` passes the field after `layout={config.layout}`:

```tsx
        <BarChart
          data={limitedData}
          height="100%"
          dateColumns={dateColumns}
          xAxisKey={validConfig.xAxisKey}
          series={config.series}
          layout={config.layout}
          barGap={config.barGap}
          withLegend={config.withLegend}
          chartStyle={config.chartStyle}
        />
```

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `pnpm vitest run shared/copy shared/models/vizs src/lib/ui/viz src/components/VisualizationContainer`
Expected: PASS. `BarChart.test.tsx` has 28 tests (3 new), `UiVizConfigRenderer.test.tsx` 5, `VizSettingsFormBody.test.tsx` 16, `AvaVizConfigs.convertVizConfig.test.ts` 166 (2 new), and `SeriesAwareVizForm.descriptors.test.tsx` 75 (its generated "Bar gap" case is new).

- [ ] **Step 8: Type-check and lint**

Run: `pnpm type-check && pnpm exec eslint shared/models/vizs shared/copy src/lib/ui/viz src/components/VisualizationContainer`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types.ts \
  shared/models/vizs/UiVizConfig/UiVizConfig.types.ts \
  shared/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfigs.ts \
  shared/copy/vizSettingControlLabel/vizSettingControlLabel.ts \
  src/lib/ui/viz/BarChart/BarChart.tsx \
  src/lib/ui/viz/renderXYComposite.tsx \
  src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.tsx \
  src/lib/ui/viz/BarChart/__tests__/BarChartTestFixtures.tsx \
  src/lib/ui/viz/BarChart/__tests__/BarChart.test.tsx \
  src/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer.test.tsx \
  src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx \
  shared/models/vizs/AvaVizConfig/__tests__/AvaVizConfigs.convertVizConfig.test.ts \
  shared/models/vizs/descriptors/makeAxisDescriptors/makeAxisDescriptors.test.ts
git commit -m "$(cat <<'EOF'
feat(viz): add a bar gap setting to the bar chart

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 11: Plugin chart type lookup, picker options, and labels

**Files:**
- Create: `src/lib/plugins/vizs/pluginVizOptionHelpers.ts`
- Test: `src/lib/plugins/vizs/pluginVizOptionHelpers.test.ts`
- Create: `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.ts`
- Test: `src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts`
- Create: `src/lib/plugins/vizs/usePluginVizType/usePluginVizType.ts`
- Test: `src/lib/plugins/vizs/usePluginVizType/usePluginVizType.test.tsx`
- Create: `src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.ts`
- Test: `src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.test.tsx`
- Create: `src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.ts`
- Test: `src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.test.tsx`

**Context:** This task implements the lookup half of contract C5: encoding plugin chart types as picker values, finding a chart type in a manifest, loading a bundled plugin's manifest without `PluginHost` (so public dashboard links work), listing the active plugins' chart types for pickers, and naming a chart's type. It relies on Task 1 (`contributes.vizTypes`, the `PluginVizType` type exported from `@avandar/plugin-manifest/runtime`) Task 7 (`AvaVizConfig.Plugin`, and `vizTypeLabel` takes `BuiltInVizType`), and Task 8 (`AvaVizConfig.T` and `UiVizConfig` include the `plugin` member). `PluginModuleCache` lives for the whole test session and caches by plugin id, so every test that needs a fresh load registers a new plugin id. `virtual:ava-plugin-index` is stubbed empty under Vitest, so these tests mock `@/lib/plugins/pluginIndexHelpers`. `useQuery` from `@avandar/query-hooks` needs a `QueryClientProvider`, which hook tests add through the `renderHook` wrapper.

- [ ] **Step 1: Write the failing test for the option helpers**

```ts
// src/lib/plugins/vizs/pluginVizOptionHelpers.test.ts
import { describe, expect, it } from "vitest";
import {
  getPluginVizSelectionFromOptionValue,
  makePluginVizMemoryKey,
  makePluginVizOptionValue,
} from "@/lib/plugins/vizs/pluginVizOptionHelpers";

const EPICURVE = { pluginId: "avandar.epidemiology", pluginVizId: "epicurve" };

describe("makePluginVizOptionValue", () => {
  it("encodes a plugin chart type as plugin:<pluginId>/<pluginVizId>", () => {
    expect(makePluginVizOptionValue(EPICURVE)).toBe(
      "plugin:avandar.epidemiology/epicurve",
    );
  });
});

describe("getPluginVizSelectionFromOptionValue", () => {
  it("decodes the plugin chart type an option value names", () => {
    expect(
      getPluginVizSelectionFromOptionValue(
        "plugin:avandar.epidemiology/epicurve",
      ),
    ).toEqual(EPICURVE);
  });

  it("decodes a chart type id that contains dots", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epi/rate.plot"),
    ).toEqual({ pluginId: "avandar.epi", pluginVizId: "rate.plot" });
  });

  it("returns undefined for a built-in viz type value", () => {
    expect(getPluginVizSelectionFromOptionValue("bar")).toBeUndefined();
  });

  it("returns undefined for a plugin value with no chart type id", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epidemiology/"),
    ).toBeUndefined();
  });

  it("returns undefined for a plugin value with no slash", () => {
    expect(
      getPluginVizSelectionFromOptionValue("plugin:avandar.epidemiology"),
    ).toBeUndefined();
  });

  it("returns undefined for a plugin value with an extra path segment", () => {
    expect(
      getPluginVizSelectionFromOptionValue(
        "plugin:avandar.epidemiology/epicurve/extra",
      ),
    ).toBeUndefined();
  });
});

describe("makePluginVizMemoryKey", () => {
  it("keys a plugin chart type as <pluginId>/<pluginVizId>", () => {
    expect(makePluginVizMemoryKey(EPICURVE)).toBe(
      "avandar.epidemiology/epicurve",
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/pluginVizOptionHelpers.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/pluginVizOptionHelpers"`.

- [ ] **Step 3: Implement the option helpers**

```ts
// src/lib/plugins/vizs/pluginVizOptionHelpers.ts
/**
 * Which plugin chart type a chart uses: the plugin that bundles it and the
 * chart type's id in that plugin's manifest. Pickers and chart state use it to
 * name a plugin chart type without holding its manifest.
 */
export type PluginVizSelection = Readonly<{
  pluginId: string;
  pluginVizId: string;
}>;

const OPTION_VALUE_PREFIX = "plugin:";

/**
 * Makes the key that names a plugin chart type in plugin-keyed records, such
 * as a memory of each plugin chart's last settings. The key is
 * `<pluginId>/<pluginVizId>`.
 */
export function makePluginVizMemoryKey(selection: PluginVizSelection): string {
  return `${selection.pluginId}/${selection.pluginVizId}`;
}

/**
 * Makes the value a chart type picker stores for a plugin chart type, such as
 * `plugin:avandar.epidemiology/epicurve`, so plugin options can sit next to
 * the built-in viz types in one select.
 */
export function makePluginVizOptionValue(
  selection: PluginVizSelection,
): string {
  return `${OPTION_VALUE_PREFIX}${makePluginVizMemoryKey(selection)}`;
}

/**
 * Gets the plugin chart type a picker value names. Returns undefined for a
 * built-in viz type value, such as `bar`, and for a malformed plugin value.
 * Plugin ids and chart type ids never contain a slash, so a value with more
 * than one is malformed.
 */
export function getPluginVizSelectionFromOptionValue(
  value: string,
): PluginVizSelection | undefined {
  if (!value.startsWith(OPTION_VALUE_PREFIX)) {
    return undefined;
  }
  const parts = value.slice(OPTION_VALUE_PREFIX.length).split("/");
  const [pluginId = "", pluginVizId = ""] = parts;
  if (parts.length !== 2 || pluginId === "" || pluginVizId === "") {
    return undefined;
  }
  return { pluginId, pluginVizId };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/pluginVizOptionHelpers.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Write the failing test for the manifest lookup**

```ts
// src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts
import { describe, expect, it } from "vitest";
import { getPluginVizTypeFromManifest } from "@/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest";
import type {
  PluginManifest,
  PluginVizType,
} from "@avandar/plugin-manifest/runtime";

const EPICURVE: PluginVizType = {
  id: "epicurve",
  title: "%viz.epicurve.title%",
  icon: "chart-histogram",
  render: "transform",
  settings: [
    {
      key: "dateColumn",
      label: "%viz.epicurve.dateColumn%",
      control: { kind: "columnPicker", dataType: "temporal" },
      required: true,
    },
  ],
};

const MANIFEST: PluginManifest = {
  id: "avandar.epidemiology",
  name: "%name%",
  description: "%description%",
  version: "1.0.0",
  license: "MIT",
  engines: { avandar: ">=1.0.0" },
  entry: "src/index.tsx",
  icon: "virus",
  permissions: [],
  contributes: { commands: [], menus: {}, vizTypes: [EPICURVE] },
};

describe("getPluginVizTypeFromManifest", () => {
  it("finds the chart type the manifest declares under the id", () => {
    expect(
      getPluginVizTypeFromManifest({
        manifest: MANIFEST,
        pluginVizId: "epicurve",
      }),
    ).toBe(EPICURVE);
  });

  it("returns undefined for an id the manifest does not declare", () => {
    expect(
      getPluginVizTypeFromManifest({
        manifest: MANIFEST,
        pluginVizId: "rate-plot",
      }),
    ).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest"`.

- [ ] **Step 7: Implement the manifest lookup**

```ts
// src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.ts
import type {
  PluginManifest,
  PluginVizType,
} from "@avandar/plugin-manifest/runtime";

/**
 * Gets the chart type a plugin's manifest declares under `pluginVizId`, for
 * example to read its title and settings before drawing a stored plugin
 * chart. Returns undefined when the manifest declares no chart type with that
 * id.
 */
export function getPluginVizTypeFromManifest(options: {
  manifest: PluginManifest;
  pluginVizId: string;
}): PluginVizType | undefined {
  const { manifest, pluginVizId } = options;
  return manifest.contributes.vizTypes.find((vizType) => {
    return vizType.id === pluginVizId;
  });
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Write the failing test for `usePluginVizType`**

```tsx
// src/lib/plugins/vizs/usePluginVizType/usePluginVizType.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import { renderHook, waitFor } from "@/test-utils";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const EPICURVE: PluginVizType = {
  id: "epicurve",
  title: "%viz.epicurve.title%",
  icon: "chart-histogram",
  render: "transform",
  settings: [],
};

type RenderedLookup = Readonly<{
  result: { current: PluginVizTypeLookup };
  unmount: () => void;
}>;

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: { id: pluginId, contributes: { vizTypes: [EPICURVE] } },
    strings: {},
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  loadManifest: (pluginId: string) => Promise<PluginManifestModule> = (
    pluginId,
  ) => {
    return Promise.resolve(_makeManifestModule(pluginId));
  },
): string {
  nextPluginNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `avandar.epidemiology-${nextPluginNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return loadManifest(id);
    },
  });
  return id;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderLookup(
  selection: PluginVizSelection | undefined,
): RenderedLookup {
  return renderHook(
    () => {
      return usePluginVizType(selection);
    },
    { wrapper: QueryWrapper },
  );
}

describe("usePluginVizType", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
  });

  it("reports the chart type the bundled manifest declares", async () => {
    const pluginId = _addBundledPlugin();

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "ready",
        vizType: EPICURVE,
      });
    });
  });

  it("reports missing when this deployment does not bundle the plugin", async () => {
    const { result } = _renderLookup({
      pluginId: "avandar.removed",
      pluginVizId: "epicurve",
    });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("reports missing when the manifest declares no chart type with that id", async () => {
    const pluginId = _addBundledPlugin();

    const { result } = _renderLookup({ pluginId, pluginVizId: "rate-plot" });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("reports loading while the manifest chunk downloads", async () => {
    const loadManifest = vi.fn(() => {
      return new Promise<PluginManifestModule>(() => {});
    });
    const pluginId = _addBundledPlugin(loadManifest);

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(loadManifest).toHaveBeenCalled();
    });

    expect(result.current.status).toBe("loading");
  });

  it("reports missing when the manifest fails to load", async () => {
    const pluginId = _addBundledPlugin(() => {
      return Promise.reject(new Error("chunk failed"));
    });

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current.status).toBe("missing");
    });
  });

  it("loads a failed manifest again the next time the lookup is used", async () => {
    let numLoads = 0;
    const pluginId = _addBundledPlugin((id) => {
      numLoads += 1;
      return numLoads === 1
        ? Promise.reject(new Error("chunk failed"))
        : Promise.resolve(_makeManifestModule(id));
    });
    const firstLookup = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(firstLookup.result.current.status).toBe("missing");
    });
    firstLookup.unmount();

    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
  });

  it("reports missing when there is nothing to look up", () => {
    const { result } = _renderLookup(undefined);

    expect(result.current.status).toBe("missing");
  });

  it("keeps the loaded manifest out of the persisted query cache", async () => {
    const pluginId = _addBundledPlugin();
    const { result } = _renderLookup({ pluginId, pluginVizId: "epicurve" });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    const queries = queryClient.getQueryCache().getAll();

    expect(queries[0]?.meta).toEqual({ persist: false });
  });
});
```

- [ ] **Step 10: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/usePluginVizType/usePluginVizType.test.tsx`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/usePluginVizType/usePluginVizType"`.

- [ ] **Step 11: Implement `usePluginVizType`**

```ts
// src/lib/plugins/vizs/usePluginVizType/usePluginVizType.ts
import { useQuery } from "@avandar/query-hooks";
import { useMemo } from "react";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import { getPluginVizTypeFromManifest } from "@/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest";
import { Logger } from "@/utils/Logger";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";

/**
 * Where the lookup of a plugin chart type stands, for a chart renderer or a
 * settings form to branch on.
 *
 * - `loading`: the plugin's manifest chunk is downloading.
 * - `missing`: there is nothing to look up, this deployment does not bundle
 *   the plugin, its manifest declares no such chart type, or its manifest
 *   failed to load.
 * - `ready`: carries the plugin's index entry, its manifest, and the chart
 *   type.
 */
export type PluginVizTypeLookup =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "missing" }>
  | Readonly<{
      status: "ready";
      entry: PluginIndexEntry;
      manifestModule: PluginManifestModule;
      vizType: PluginVizType;
    }>;

/**
 * A bundled plugin's entry and manifest. The entry is undefined when this
 * deployment does not bundle the plugin, and the manifest is undefined when
 * there is no entry or the manifest failed to load.
 */
type LoadedPluginManifest = Readonly<{
  entry: PluginIndexEntry | undefined;
  manifestModule: PluginManifestModule | undefined;
}>;

const LOADING: PluginVizTypeLookup = { status: "loading" };
const MISSING: PluginVizTypeLookup = { status: "missing" };

async function _loadPluginManifest(
  pluginId: string | undefined,
): Promise<LoadedPluginManifest> {
  const entry =
    pluginId === undefined ? undefined : getPluginIndexEntry(pluginId);
  if (entry === undefined) {
    return { entry, manifestModule: undefined };
  }
  try {
    return {
      entry,
      manifestModule: await PluginModuleCache.loadManifest(entry),
    };
  } catch (error) {
    Logger.error("Plugin manifest failed to load", { pluginId, error });
    return { entry, manifestModule: undefined };
  }
}

function _hasFailedToLoad(loaded: LoadedPluginManifest | undefined): boolean {
  return loaded?.entry !== undefined && loaded.manifestModule === undefined;
}

function _getLookupFromLoadedManifest(options: {
  loaded: LoadedPluginManifest | undefined;
  pluginVizId: string;
}): PluginVizTypeLookup {
  const { loaded, pluginVizId } = options;
  if (loaded === undefined) {
    return LOADING;
  }
  const { entry, manifestModule } = loaded;
  if (entry === undefined || manifestModule === undefined) {
    return MISSING;
  }
  const vizType = getPluginVizTypeFromManifest({
    manifest: manifestModule.manifest,
    pluginVizId,
  });
  return vizType === undefined
    ? MISSING
    : { status: "ready", entry, manifestModule, vizType };
}

/**
 * Looks up a plugin chart type in the plugins this deployment bundles,
 * loading the plugin's manifest at most once per session. It reads neither
 * the workspace's installs nor the plugin host, so a stored plugin chart can
 * be looked up anywhere, for example on a public dashboard link. A manifest
 * that failed to load is loaded again the next time the lookup is used. Pass
 * undefined to look up nothing.
 */
export function usePluginVizType(
  selection: PluginVizSelection | undefined,
): PluginVizTypeLookup {
  const pluginId = selection?.pluginId;
  const pluginVizId = selection?.pluginVizId;
  const [loaded] = useQuery({
    queryKey: ["plugins", "vizManifest", pluginId],
    queryFn: () => {
      return _loadPluginManifest(pluginId);
    },
    enabled: pluginId !== undefined,
    // Never written to disk. A manifest module carries React icon
    // components, and JSON persistence turns each one into `{}`.
    meta: { persist: false },
    staleTime: (query) => {
      return _hasFailedToLoad(query.state.data) ? 0 : Infinity;
    },
  });
  return useMemo(() => {
    return pluginVizId === undefined
      ? MISSING
      : _getLookupFromLoadedManifest({ loaded, pluginVizId });
  }, [loaded, pluginVizId]);
}
```

- [ ] **Step 12: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/usePluginVizType/usePluginVizType.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 13: Write the failing test for `usePluginVizOptions`**

```tsx
// src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.test.tsx
import { describe, expect, it } from "vitest";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { usePluginVizOptions } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import { renderHook, TestProviders } from "@/test-utils";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginVizOption } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { ReactNode } from "react";

const EPIDEMIOLOGY_ID = "avandar.epidemiology";
const REGRESSION_ID = "avandar.regression";
const EPICURVE = { id: "epicurve", title: "%viz.epicurve.title%" };
const RATE_PLOT = { id: "rate-plot", title: "%viz.ratePlot.title%" };
const TREND_LINE = { id: "trend-line", title: "%viz.trendLine.title%" };

function _makeActivePlugin(options: {
  pluginId: string;
  vizTypes: ReadonlyArray<{ id: string; title: string }>;
}): ActivePlugin {
  return {
    entry: { id: options.pluginId },
    manifestModule: {
      manifest: {
        id: options.pluginId,
        contributes: { vizTypes: options.vizTypes },
      },
      strings: {
        en: {
          "viz.epicurve.title": "Epicurve",
          "viz.ratePlot.title": "Rate plot",
          "viz.trendLine.title": "Trend line",
        },
      },
      icons: {},
    },
  } as unknown as ActivePlugin;
}

function _renderOptions(
  activePlugins: readonly ActivePlugin[] | undefined,
): PluginVizOption[] {
  return renderHook(
    () => {
      return usePluginVizOptions();
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <TestProviders>
            {activePlugins === undefined ? (
              children
            ) : (
              <ActivePluginsContext.Provider value={activePlugins}>
                {children}
              </ActivePluginsContext.Provider>
            )}
          </TestProviders>
        );
      },
    },
  ).result.current;
}

describe("usePluginVizOptions", () => {
  it("labels each chart type of an active plugin with its localized title", () => {
    const options = _renderOptions([
      _makeActivePlugin({
        pluginId: EPIDEMIOLOGY_ID,
        vizTypes: [EPICURVE, RATE_PLOT],
      }),
    ]);

    expect(
      options.map(({ label }) => {
        return label;
      }),
    ).toEqual(["Epicurve", "Rate plot"]);
  });

  it("encodes each option value as plugin:<pluginId>/<pluginVizId>", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
    ]);

    expect(options[0]?.value).toBe("plugin:avandar.epidemiology/epicurve");
  });

  it("carries the selection and manifest chart type of each option", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
    ]);

    expect(options[0]).toMatchObject({
      selection: { pluginId: EPIDEMIOLOGY_ID, pluginVizId: "epicurve" },
      vizType: EPICURVE,
    });
  });

  it("lists the chart types of every active plugin in plugin order", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [EPICURVE] }),
      _makeActivePlugin({ pluginId: REGRESSION_ID, vizTypes: [TREND_LINE] }),
    ]);

    expect(
      options.map(({ value }) => {
        return value;
      }),
    ).toEqual([
      "plugin:avandar.epidemiology/epicurve",
      "plugin:avandar.regression/trend-line",
    ]);
  });

  it("lists no options for an active plugin without chart types", () => {
    const options = _renderOptions([
      _makeActivePlugin({ pluginId: EPIDEMIOLOGY_ID, vizTypes: [] }),
    ]);

    expect(options).toEqual([]);
  });

  it("lists no options outside a plugin host", () => {
    expect(_renderOptions(undefined)).toEqual([]);
  });
});
```

- [ ] **Step 14: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.test.tsx`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions"`.

- [ ] **Step 15: Implement `usePluginVizOptions`**

```ts
// src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.ts
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { useContext, useMemo } from "react";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { makePluginVizOptionValue } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginVizSelection } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";

/**
 * One plugin chart type a chart type picker can offer, with its title already
 * localized. `value` is the encoded picker value, and `selection` and
 * `vizType` give the picker what it needs to build the chart's config once
 * the option is picked.
 */
export type PluginVizOption = Readonly<{
  value: string;
  label: string;
  selection: PluginVizSelection;
  vizType: PluginVizType;
}>;

function _getOptionsFromPlugin(options: {
  plugin: ActivePlugin;
  locale: string;
}): PluginVizOption[] {
  const { plugin, locale } = options;
  const { manifest, strings } = plugin.manifestModule;
  return manifest.contributes.vizTypes.map((vizType) => {
    const selection = { pluginId: manifest.id, pluginVizId: vizType.id };
    return {
      value: makePluginVizOptionValue(selection),
      label: getLocalizedTextFromManifestStrings({
        strings,
        locale,
        value: vizType.title,
      }),
      selection,
      vizType,
    };
  });
}

/**
 * Gets the chart types of the plugins that are live in the current
 * workspace (installed, enabled, and with their permissions approved),
 * localized to the current language. Lets a chart type picker list plugin
 * charts next to the built-in ones, for example in the Data Explorer.
 * Outside a plugin host it returns no options.
 */
export function usePluginVizOptions(): PluginVizOption[] {
  const activePlugins = useContext(ActivePluginsContext);
  const { i18n } = useLingui();
  return useMemo(() => {
    return activePlugins.flatMap((plugin) => {
      return _getOptionsFromPlugin({ plugin, locale: i18n.locale });
    });
  }, [activePlugins, i18n.locale]);
}
```

- [ ] **Step 16: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 17: Write the failing test for `useVizTypeLabel`**

```tsx
// src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVizTypeLabel } from "@/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      contributes: {
        vizTypes: [{ id: "epicurve", title: "%viz.epicurve.title%" }],
      },
    },
    strings: { en: { "viz.epicurve.title": "Epicurve" } },
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  loadManifest: (pluginId: string) => Promise<PluginManifestModule> = (
    pluginId,
  ) => {
    return Promise.resolve(_makeManifestModule(pluginId));
  },
): string {
  nextPluginNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `avandar.epidemiology-${nextPluginNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return loadManifest(id);
    },
  });
  return id;
}

function _makePluginConfig(pluginId: string): AvaVizConfig.T {
  return {
    vizType: "plugin",
    pluginId,
    pluginVizId: "epicurve",
    columnSettings: {},
    settings: {},
  };
}

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
}

function _renderLabel(config: AvaVizConfig.T): { current: string } {
  return renderHook(
    () => {
      return useVizTypeLabel(config);
    },
    { wrapper: Wrapper },
  ).result;
}

describe("useVizTypeLabel", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
  });

  it("returns the built-in label for a built-in chart", () => {
    const label = _renderLabel({
      vizType: "bar",
      xAxisKey: undefined,
      series: [],
      layout: "group",
      withLegend: true,
    });

    expect(label.current).toBe("Bar Chart");
  });

  it("returns the plugin chart type's localized title once its manifest loads", async () => {
    const label = _renderLabel(_makePluginConfig(_addBundledPlugin()));

    await waitFor(() => {
      expect(label.current).toBe("Epicurve");
    });
  });

  it("returns Plugin chart while the plugin's manifest loads", () => {
    const pluginId = _addBundledPlugin(() => {
      return new Promise<PluginManifestModule>(() => {});
    });

    const label = _renderLabel(_makePluginConfig(pluginId));

    expect(label.current).toBe("Plugin chart");
  });

  it("returns Plugin chart when the plugin is not bundled", async () => {
    const label = _renderLabel(_makePluginConfig("avandar.removed"));
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });

    expect(label.current).toBe("Plugin chart");
  });
});
```

- [ ] **Step 18: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.test.tsx`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel"`.

- [ ] **Step 19: Implement `useVizTypeLabel`**

```ts
// src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.ts
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";

/**
 * Gets the display name of a chart's type in the current language, such as
 * "Bar Chart", or for a plugin chart the title its plugin's manifest gives
 * it. Lets a chart header or summary name plugin charts the way their plugin
 * titles them. A plugin chart reads "Plugin chart" until its manifest loads,
 * and when its plugin is not bundled.
 */
export function useVizTypeLabel(config: AvaVizConfig.T | UiVizConfig): string {
  const { t, i18n } = useLingui();
  const lookup = usePluginVizType(
    config.vizType === "plugin" ? config : undefined,
  );
  if (config.vizType !== "plugin") {
    return vizTypeLabel(config.vizType);
  }
  if (lookup.status !== "ready") {
    return t`Plugin chart`;
  }
  return getLocalizedTextFromManifestStrings({
    strings: lookup.manifestModule.strings,
    locale: i18n.locale,
    value: lookup.vizType.title,
  });
}
```

- [ ] **Step 20: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 21: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/lib/plugins/vizs`
Expected: exit 0, no ESLint errors.

- [ ] **Step 22: Commit**

```bash
git add src/lib/plugins/vizs/pluginVizOptionHelpers.ts \
  src/lib/plugins/vizs/pluginVizOptionHelpers.test.ts \
  src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.ts \
  src/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest.test.ts \
  src/lib/plugins/vizs/usePluginVizType/usePluginVizType.ts \
  src/lib/plugins/vizs/usePluginVizType/usePluginVizType.test.tsx \
  src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.ts \
  src/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions.test.tsx \
  src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.ts \
  src/lib/plugins/vizs/useVizTypeLabel/useVizTypeLabel.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): look up plugin chart types from the bundled index

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 12: Plugin chart spec schema and its built-in config

**Files:**
- Create: `src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.ts`
- Test: `src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.test.ts`
- Create: `src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.ts`
- Test: `src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.test.ts`

**Context:** This task implements the `PluginChartSpecSchema` and `makeUiVizConfigFromPluginChartSpec` entries of contract C5. A transform chart returns a `PluginChartSpec` (Task 3, imported type-only from `@avandar/plugin-sdk` so no SDK runtime reaches this module), and the host turns it into a `BuiltInUiVizConfig` (Task 7) that `UiVizConfigRenderer` (Task 6) draws. Required Ui fields get neutral defaults: grouped bars with the default gap, the default area layout, and a legend only when there is more than one series. The bar config's `barGap` field comes from Task 10. Both modules are imported only by `PluginVizRuntime` (Task 13), so they ship in the lazily loaded runtime chunk.

- [ ] **Step 1: Write the failing schema test**

```ts
// src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.test.ts
import { describe, expect, it } from "vitest";
import { PluginChartSpecSchema } from "@/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema";

const EPICURVE_SPEC = {
  kind: "bar",
  xColumn: "bucket",
  xColumnType: "date",
  series: [
    { column: "vaccinated", label: "Vaccinated" },
    { column: "unvaccinated", label: "Unvaccinated" },
  ],
  layout: "stack",
  barGap: "none",
};

describe("PluginChartSpecSchema", () => {
  it("accepts a stacked bar spec with a date x column", () => {
    expect(PluginChartSpecSchema.safeParse(EPICURVE_SPEC).success).toBe(true);
  });

  it("rejects a chart kind other than bar, line, or area", () => {
    expect(
      PluginChartSpecSchema.safeParse({ ...EPICURVE_SPEC, kind: "pie" })
        .success,
    ).toBe(false);
  });

  it("rejects a spec with no series", () => {
    expect(
      PluginChartSpecSchema.safeParse({ ...EPICURVE_SPEC, series: [] }).success,
    ).toBe(false);
  });

  it("rejects a series with an empty column name", () => {
    expect(
      PluginChartSpecSchema.safeParse({
        ...EPICURVE_SPEC,
        series: [{ column: "" }],
      }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema"`.

- [ ] **Step 3: Implement the schema**

```ts
// src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.ts
import { z } from "zod";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

/**
 * Checks the chart spec a plugin chart's transform returns before Avandar
 * draws it with a built-in chart, so a malformed spec shows the chart's
 * render-failed state instead of a broken chart. Typed as the SDK's
 * `PluginChartSpec`, so a parsed spec is one.
 */
export const PluginChartSpecSchema: z.ZodType<PluginChartSpec> = z.object({
  kind: z.enum(["bar", "line", "area"]),
  xColumn: z.string().min(1),
  xColumnType: z.enum(["category", "date"]).optional(),
  series: z
    .array(
      z.object({
        column: z.string().min(1),
        label: z.string().optional(),
      }),
    )
    .min(1),
  layout: z.enum(["group", "stack"]).optional(),
  barGap: z.enum(["default", "none"]).optional(),
});
```

- [ ] **Step 4: Run the schema tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing conversion test**

```ts
// src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.test.ts
import { describe, expect, it } from "vitest";
import { makeUiVizConfigFromPluginChartSpec } from "@/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

const ROWS = [{ week: "2026-01-04", vaccinated: 3, unvaccinated: 5 }];

const STACKED_BARS: PluginChartSpec = {
  kind: "bar",
  xColumn: "week",
  xColumnType: "date",
  series: [
    { column: "vaccinated", label: "Vaccinated" },
    { column: "unvaccinated", label: "Unvaccinated" },
  ],
  layout: "stack",
  barGap: "none",
};

const SINGLE_SERIES: PluginChartSpec = {
  kind: "line",
  xColumn: "week",
  series: [{ column: "vaccinated" }],
};

function _convert(
  chart: PluginChartSpec,
): ReturnType<typeof makeUiVizConfigFromPluginChartSpec> {
  return makeUiVizConfigFromPluginChartSpec({ chart, rows: ROWS });
}

describe("makeUiVizConfigFromPluginChartSpec", () => {
  it("builds a bar config with the spec's layout and bar gap", () => {
    expect(_convert(STACKED_BARS).uiVizConfig).toEqual({
      vizType: "bar",
      xAxisKey: "week",
      series: [
        { renderAs: "bar", key: "vaccinated", label: "Vaccinated" },
        { renderAs: "bar", key: "unvaccinated", label: "Unvaccinated" },
      ],
      layout: "stack",
      withLegend: true,
      barGap: "none",
    });
  });

  it("defaults a bar config to grouped bars with the default gap", () => {
    expect(
      _convert({ ...SINGLE_SERIES, kind: "bar" }).uiVizConfig,
    ).toMatchObject({ layout: "group", barGap: "default" });
  });

  it("builds a line config with one line series per spec series", () => {
    expect(_convert(SINGLE_SERIES).uiVizConfig).toEqual({
      vizType: "line",
      xAxisKey: "week",
      series: [{ renderAs: "line", key: "vaccinated" }],
      withLegend: false,
    });
  });

  it("maps a stacked area spec to the stacked area layout", () => {
    expect(
      _convert({ ...STACKED_BARS, kind: "area" }).uiVizConfig,
    ).toMatchObject({ vizType: "area", layout: "stacked" });
  });

  it("maps a grouped area spec to the default area layout", () => {
    expect(
      _convert({ ...STACKED_BARS, kind: "area", layout: "group" }).uiVizConfig,
    ).toMatchObject({ vizType: "area", layout: "default" });
  });

  it("turns the legend on when the spec has more than one series", () => {
    expect(_convert(STACKED_BARS).uiVizConfig).toMatchObject({
      withLegend: true,
    });
  });

  it("turns the legend off for a single series", () => {
    expect(_convert(SINGLE_SERIES).uiVizConfig).toMatchObject({
      withLegend: false,
    });
  });

  it("lists the x column first, then each series column, as the column names", () => {
    expect(_convert(STACKED_BARS).columnNames).toEqual([
      "week",
      "vaccinated",
      "unvaccinated",
    ]);
  });

  it("marks the x column as a date column when the spec says it holds dates", () => {
    expect(_convert(STACKED_BARS).dateColumns).toEqual(new Set(["week"]));
  });

  it("marks no date columns for a category x column", () => {
    expect(_convert(SINGLE_SERIES).dateColumns).toEqual(new Set());
  });

  it("throws an error naming an x column the rows lack", () => {
    expect(() => {
      _convert({ ...SINGLE_SERIES, xColumn: "month" });
    }).toThrow('"month"');
  });

  it("throws an error naming a series column the rows lack", () => {
    expect(() => {
      _convert({ ...SINGLE_SERIES, series: [{ column: "boosted" }] });
    }).toThrow('"boosted"');
  });

  it("accepts any column names when there are no rows", () => {
    expect(
      makeUiVizConfigFromPluginChartSpec({
        chart: { ...SINGLE_SERIES, xColumn: "month" },
        rows: [],
      }).columnNames,
    ).toEqual(["month", "vaccinated"]);
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec"`.

- [ ] **Step 7: Implement the conversion**

```ts
// src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.ts
import { matchLiteral } from "@avandar/utils";
import type { BuiltInUiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginChartSpec } from "@avandar/plugin-sdk";

type BarConfig = Extract<BuiltInUiVizConfig, { vizType: "bar" }>;
type LineConfig = Extract<BuiltInUiVizConfig, { vizType: "line" }>;
type AreaConfig = Extract<BuiltInUiVizConfig, { vizType: "area" }>;

/**
 * A built-in chart config that draws a plugin chart's transform output, with
 * the column metadata `UiVizConfigRenderer` reads alongside it.
 */
export type PluginChartUiVizConfig = {
  uiVizConfig: BuiltInUiVizConfig;

  /** The x column, then each series column. */
  columnNames: string[];

  /** Holds the x column when the spec marks it as dates. */
  dateColumns: Set<string>;
};

function _buildSeriesFields(
  chart: PluginChartSpec,
): Array<{ key: string; label?: string }> {
  return chart.series.map((series) => {
    return series.label === undefined
      ? { key: series.column }
      : { key: series.column, label: series.label };
  });
}

function _buildBarConfig(chart: PluginChartSpec): BarConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "bar" as const };
  });
  return {
    vizType: "bar",
    xAxisKey: chart.xColumn,
    series,
    layout: chart.layout ?? "group",
    withLegend: series.length > 1,
    barGap: chart.barGap ?? "default",
  };
}

function _buildLineConfig(chart: PluginChartSpec): LineConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "line" as const };
  });
  return {
    vizType: "line",
    xAxisKey: chart.xColumn,
    series,
    withLegend: series.length > 1,
  };
}

function _buildAreaConfig(chart: PluginChartSpec): AreaConfig {
  const series = _buildSeriesFields(chart).map((field) => {
    return { ...field, renderAs: "area" as const };
  });
  return {
    vizType: "area",
    xAxisKey: chart.xColumn,
    series,
    layout: chart.layout === "stack" ? "stacked" : "default",
    withLegend: series.length > 1,
  };
}

function _getColumnNamesFromChart(chart: PluginChartSpec): string[] {
  const seriesColumns = chart.series.map((series) => {
    return series.column;
  });
  return [...new Set([chart.xColumn, ...seriesColumns])];
}

function _assertColumnsInRows(options: {
  chart: PluginChartSpec;
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): void {
  const { chart, rows } = options;
  const firstRow = rows[0];
  if (firstRow === undefined) {
    return;
  }
  const missingColumn = _getColumnNamesFromChart(chart).find((column) => {
    return !Object.hasOwn(firstRow, column);
  });
  if (missingColumn !== undefined) {
    throw new Error(
      `The chart spec names the column "${missingColumn}", but the transform's rows have no such column.`,
    );
  }
}

/**
 * Makes the built-in chart config that draws a plugin chart transform's
 * output, plus the column names and date columns `UiVizConfigRenderer`
 * reads. Bar, line, and area specs map to the built-in chart of the same
 * kind, with a legend when there is more than one series.
 *
 * Throws an `Error` naming the column when the spec's x column or a series
 * column is missing from the first of `rows`, so a transform that mislabels
 * its output fails visibly instead of drawing an empty chart. Empty `rows`
 * pass the check.
 */
export function makeUiVizConfigFromPluginChartSpec(options: {
  chart: PluginChartSpec;
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
}): PluginChartUiVizConfig {
  const { chart, rows } = options;
  _assertColumnsInRows({ chart, rows });
  return {
    uiVizConfig: matchLiteral(chart.kind, {
      bar: () => {
        return _buildBarConfig(chart);
      },
      line: () => {
        return _buildLineConfig(chart);
      },
      area: () => {
        return _buildAreaConfig(chart);
      },
    }),
    columnNames: _getColumnNamesFromChart(chart),
    dateColumns: new Set(chart.xColumnType === "date" ? [chart.xColumn] : []),
  };
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginChartSpecSchema src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec`
Expected: PASS (17 tests: 4 schema, 13 conversion).

- [ ] **Step 9: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/lib/plugins/vizs/PluginChartSpecSchema src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec`
Expected: exit 0, no ESLint errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.ts \
  src/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema.test.ts \
  src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.ts \
  src/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): turn plugin chart specs into built-in chart configs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 13: Lazily loaded plugin chart runtime

**Files:**
- Modify: `src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx` (optional `fallback` prop; whole file shown)
- Create: `src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx`
- Test: `src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.test.tsx`
- Create: `src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.ts`
- Test: `src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.test.ts`

**Context:** This task implements refinements 4 and 5 and the runtime entries of contract C5. `PluginVizRuntime.tsx` is the one module that runs plugin chart code. It exports a single module object, `PluginVizRuntime`, with `runPluginVizTransform` (never throws), `getPluginVizDefinitionFromCodeModule` (checks the code module with `isPluginDefinition` and reads `definition.vizTypes[vizId]`), and `PluginVizComponentView`, which lives in its own file in the same folder (one component per file) and is imported only by `PluginVizRuntime.tsx`. Everything here pulls in the SDK runtime (`makePluginTranslator`, `PluginVizProvider`, `isPluginDefinition`, all from Tasks 3 and 4), so app code reaches it only through `loadPluginVizRuntime()`, a memoized dynamic `import()` that forgets a failed load, mirroring `loadRunPluginCommand`. `PluginErrorBoundary` gains an optional `fallback` so a crashing chart shows the chart's own render-failed state instead of the overlay message ("Close this panel"). The test environment's `ResizeObserver` never fires, so the component test mocks `useElementSize` from `@mantine/hooks` and keeps the rest of the module.

- [ ] **Step 1: Write the failing runtime test**

```tsx
// src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.test.tsx
import { definePlugin, useT } from "@avandar/plugin-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PluginVizRuntime } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";
import { cleanup, render, screen } from "@/test-utils";
import type { PluginCodeModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizTransformOutcome } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";
import type {
  PluginVizComponentProps,
  PluginVizContext,
  PluginVizDefinition,
  PluginVizInput,
  PluginVizTransform,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { size: { width: 640, height: 360 } };
});

vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    // The test environment's ResizeObserver never fires, so a real
    // measurement would stay 0 by 0.
    useElementSize: () => {
      return { ref: () => {}, ...mocks.size };
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const INPUT: PluginVizInput = {
  rows: [
    { region: "North", cases: 3 },
    { region: "South", cases: 5 },
  ],
  columns: [
    { name: "region", dataType: "varchar" },
    { name: "cases", dataType: "bigint" },
  ],
  settings: { labelColumn: "region" },
  isTruncated: false,
};

const MESSAGES = {
  en: { "series.cases": "Cases", heading: "Cases by region" },
  es: { "series.cases": "Casos", heading: "Casos por región" },
};

const ERROR_FALLBACK_TEXT = "Case dots couldn't render";

function _makeCaseBarsFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  return {
    rows: input.rows.map((row) => {
      return { region: row.region, cases: row.cases, locale: context.locale };
    }),
    chart: {
      kind: "bar",
      xColumn: "region",
      series: [{ column: "cases", label: context.i18n.t("series.cases") }],
    },
  };
}

function CaseDots({ width, height, rows }: PluginVizComponentProps): ReactNode {
  const t = useT();
  return (
    <div
      data-testid="case-dots"
      data-size={`${width}x${height}`}
      data-row-count={rows.length}
    >
      {t("heading")}
    </div>
  );
}

function CrashingChart(): ReactNode {
  throw new Error("chart crashed");
}

function _runTransform(options: {
  definition: PluginVizDefinition;
  locale?: string;
}): PluginVizTransformOutcome {
  return PluginVizRuntime.runPluginVizTransform({
    definition: options.definition,
    vizId: "case-bars",
    input: INPUT,
    messages: MESSAGES,
    locale: options.locale ?? "en",
  });
}

function _runTransformFunction(
  transform: PluginVizTransform,
): PluginVizTransformOutcome {
  return _runTransform({ definition: { transform } });
}

function _getDefinition(
  codeModule: PluginCodeModule,
  vizId: string = "case-bars",
): PluginVizDefinition | undefined {
  return PluginVizRuntime.getPluginVizDefinitionFromCodeModule({
    codeModule,
    vizId,
  });
}

function _renderComponentView(options: {
  definition: PluginVizDefinition;
  locale?: string;
}): void {
  const { PluginVizComponentView } = PluginVizRuntime;
  render(
    <PluginVizComponentView
      definition={options.definition}
      vizId="case-dots"
      input={INPUT}
      messages={MESSAGES}
      locale={options.locale ?? "en"}
      pluginName="Case charts"
      errorFallback={<p>{ERROR_FALLBACK_TEXT}</p>}
    />,
  );
}

describe("PluginVizRuntime.runPluginVizTransform", () => {
  it("returns a bar config built from the transform's chart spec", () => {
    expect(_runTransformFunction(_makeCaseBarsFromRows)).toMatchObject({
      status: "ok",
      uiVizConfig: {
        vizType: "bar",
        xAxisKey: "region",
        series: [{ renderAs: "bar", key: "cases", label: "Cases" }],
      },
    });
  });

  it("returns the transform's rows to draw", () => {
    expect(_runTransformFunction(_makeCaseBarsFromRows)).toMatchObject({
      rows: [
        { region: "North", cases: 3 },
        { region: "South", cases: 5 },
      ],
    });
  });

  it("gives the transform a translator for the requested locale", () => {
    expect(
      _runTransform({
        definition: { transform: _makeCaseBarsFromRows },
        locale: "es",
      }),
    ).toMatchObject({ uiVizConfig: { series: [{ label: "Casos" }] } });
  });

  it("gives the transform the requested locale", () => {
    expect(
      _runTransform({
        definition: { transform: _makeCaseBarsFromRows },
        locale: "es",
      }),
    ).toMatchObject({ rows: [{ locale: "es" }, { locale: "es" }] });
  });

  it("reports failed with the error a transform throws", () => {
    const thrownError = new Error("boom");

    expect(
      _runTransformFunction(() => {
        throw thrownError;
      }),
    ).toEqual({ status: "failed", error: thrownError });
  });

  it("reports failed when the transform returns a spec with no series", () => {
    expect(
      _runTransformFunction((input) => {
        return {
          rows: input.rows,
          chart: { kind: "bar", xColumn: "region", series: [] },
        };
      }).status,
    ).toBe("failed");
  });

  it("reports failed when the chart spec names a column the rows lack", () => {
    expect(
      _runTransformFunction((input) => {
        return {
          rows: input.rows,
          chart: {
            kind: "bar",
            xColumn: "district",
            series: [{ column: "cases" }],
          },
        };
      }).status,
    ).toBe("failed");
  });

  it("reports failed for a chart that has no transform", () => {
    expect(_runTransform({ definition: { Component: CaseDots } }).status).toBe(
      "failed",
    );
  });
});

describe("PluginVizRuntime.getPluginVizDefinitionFromCodeModule", () => {
  const CODE_MODULE: PluginCodeModule = {
    definition: definePlugin({
      vizTypes: { "case-bars": { transform: _makeCaseBarsFromRows } },
    }),
    messages: MESSAGES,
  };

  it("returns the chart definition the code module declares for the id", () => {
    expect(_getDefinition(CODE_MODULE)).toEqual({
      transform: _makeCaseBarsFromRows,
    });
  });

  it("returns undefined for an id the code module does not declare", () => {
    expect(_getDefinition(CODE_MODULE, "case-pies")).toBeUndefined();
  });

  it("returns undefined for an id inherited from Object", () => {
    expect(_getDefinition(CODE_MODULE, "constructor")).toBeUndefined();
  });

  it("returns undefined when the module exports no plugin definition", () => {
    expect(
      _getDefinition({
        definition: { vizTypes: { "case-bars": {} } },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });

  it("returns undefined when reading the chart definitions throws", () => {
    expect(
      _getDefinition({
        definition: {
          kind: "avandar-plugin",
          commands: {},
          get vizTypes(): never {
            throw new Error("hostile getter");
          },
        },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });

  it("returns undefined for a chart entry with neither a transform nor a component", () => {
    expect(
      _getDefinition({
        definition: {
          kind: "avandar-plugin",
          commands: {},
          vizTypes: { "case-bars": { transform: "nope" } },
        },
        messages: MESSAGES,
      }),
    ).toBeUndefined();
  });
});

describe("PluginVizRuntime.PluginVizComponentView", () => {
  afterEach(() => {
    cleanup();
    mocks.size = { width: 640, height: 360 };
    vi.restoreAllMocks();
  });

  it("draws the chart component at the measured size", () => {
    _renderComponentView({ definition: { Component: CaseDots } });

    expect(screen.getByTestId("case-dots")).toHaveAttribute(
      "data-size",
      "640x360",
    );
  });

  it("draws nothing while the chart area has no size", () => {
    mocks.size = { width: 0, height: 0 };

    _renderComponentView({ definition: { Component: CaseDots } });

    expect(screen.queryByTestId("case-dots")).toBeNull();
  });

  it("gives the chart component the plugin's strings through useT", () => {
    _renderComponentView({ definition: { Component: CaseDots }, locale: "es" });

    expect(screen.getByText("Casos por región")).toBeInTheDocument();
  });

  it("shows the error fallback when the chart component throws", () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});

    _renderComponentView({ definition: { Component: CrashingChart } });

    expect(screen.getByText(ERROR_FALLBACK_TEXT)).toBeInTheDocument();
  });

  it("shows the error fallback for a chart that has no component", () => {
    _renderComponentView({
      definition: { transform: _makeCaseBarsFromRows },
    });

    expect(screen.getByText(ERROR_FALLBACK_TEXT)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.test.tsx`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime"`.

- [ ] **Step 3: Give `PluginErrorBoundary` an optional fallback**

Replace the whole of `src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx` with:

```tsx
import { Callout } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Component } from "react";
import { Logger } from "@/utils/Logger";
import type { ReactNode } from "react";

type Props = Readonly<{
  pluginName: string;

  /**
   * Shown in place of the crashed content. Defaults to a callout that names
   * the plugin and asks the user to close the panel, which suits a modal or
   * a drawer.
   */
  fallback?: ReactNode;
  children: ReactNode;
}>;
type State = Readonly<{ hasError: boolean }>;

/**
 * Contains a crash inside plugin UI to the modal, drawer, or chart that
 * renders it, so the rest of the app keeps working. `makePluginApi` wraps the
 * content of every overlay a plugin opens in it, and `PluginVizComponentView`
 * wraps every plugin chart component in it with the chart's own `fallback`.
 *
 * This is a class because React offers no hook for catching render errors:
 * `getDerivedStateFromError` and `componentDidCatch` exist only on class
 * components. It is the one place this feature uses a class.
 */
export class PluginErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    Logger.error("Plugin UI crashed", {
      pluginName: this.props.pluginName,
      error,
    });
  }

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }
    return (
      <Callout.Error title={this.props.pluginName}>
        <Trans>
          Something went wrong in this plugin. Close this panel and try again.
        </Trans>
      </Callout.Error>
    );
  }
}
```

- [ ] **Step 4: Implement `PluginVizComponentView`**

```tsx
// src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx
import { makePluginTranslator, PluginVizProvider } from "@avandar/plugin-sdk";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useMemo } from "react";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type {
  PluginMessages,
  PluginVizDefinition,
  PluginVizInput,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

type Props = {
  definition: PluginVizDefinition;
  vizId: string;
  input: PluginVizInput;
  messages: PluginMessages;
  locale: string;

  /** The plugin's display name, which the error boundary logs a crash under. */
  pluginName: string;

  /**
   * Shown in place of the chart when it has no component or its component
   * throws.
   */
  errorFallback: ReactNode;
};

/**
 * Draws a plugin chart's component at the size of the area it fills, with
 * the plugin's strings available through `useT()`. The component renders
 * only once the area has a size, and a crash inside it shows `errorFallback`
 * without affecting the rest of the page. `PluginVizRuntime` is its only
 * importer, so it loads with the plugin chart runtime.
 */
export function PluginVizComponentView({
  definition,
  vizId,
  input,
  messages,
  locale,
  pluginName,
  errorFallback,
}: Props): ReactNode {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const t = useMemo(() => {
    return makePluginTranslator({ locale, messages });
  }, [locale, messages]);
  const { Component } = definition;
  if (Component === undefined) {
    return errorFallback;
  }
  return (
    <Box ref={ref} h="100%" w="100%">
      {width > 0 && height > 0 ? (
        <PluginErrorBoundary pluginName={pluginName} fallback={errorFallback}>
          <PluginVizProvider vizId={vizId} t={t}>
            <Component {...input} width={width} height={height} />
          </PluginVizProvider>
        </PluginErrorBoundary>
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 5: Implement the runtime module**

```tsx
// src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx
import { isPluginDefinition, makePluginTranslator } from "@avandar/plugin-sdk";
import { makeUiVizConfigFromPluginChartSpec } from "@/lib/plugins/vizs/makeUiVizConfigFromPluginChartSpec/makeUiVizConfigFromPluginChartSpec";
import { PluginChartSpecSchema } from "@/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema";
import { PluginVizComponentView } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView";
import type { BuiltInUiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginCodeModule } from "@/lib/plugins/PluginIndex.types";
import type {
  PluginMessages,
  PluginVizDefinition,
  PluginVizInput,
} from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";

/**
 * What running a plugin chart's transform produced. `ok` carries the
 * built-in chart config, its column metadata, and the rows to draw.
 * `failed` carries what went wrong: the transform threw, returned an invalid
 * chart spec, or named a column its rows lack.
 */
export type PluginVizTransformOutcome =
  | Readonly<{
      status: "ok";
      uiVizConfig: BuiltInUiVizConfig;
      columnNames: readonly string[];
      dateColumns: ReadonlySet<string>;
      rows: UnknownDataFrame;
    }>
  | Readonly<{ status: "failed"; error: unknown }>;

/**
 * What the plugin chart runtime runs a chart on: the chart's definition from
 * the plugin's code, its manifest id, the input built from the query result,
 * the plugin's messages, and the locale to translate them in. The renderer
 * passes it to `runPluginVizTransform`, and spreads it into
 * `PluginVizComponentView`'s props.
 */
export type PluginVizRunOptions = {
  definition: PluginVizDefinition;
  vizId: string;
  input: PluginVizInput;
  messages: PluginMessages;
  locale: string;
};

function _isPluginVizDefinition(value: unknown): value is PluginVizDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const hasTransform =
    "transform" in value && typeof value.transform === "function";
  const hasComponent =
    "Component" in value &&
    (typeof value.Component === "function" ||
      (typeof value.Component === "object" && value.Component !== null));
  return hasTransform || hasComponent;
}

function _getPluginVizDefinitionFromCodeModule(options: {
  codeModule: PluginCodeModule;
  vizId: string;
}): PluginVizDefinition | undefined {
  const { codeModule, vizId } = options;
  const { definition } = codeModule;
  // Plugin code is untrusted, so reading its chart definitions can throw.
  try {
    if (
      !isPluginDefinition(definition) ||
      !Object.hasOwn(definition.vizTypes, vizId)
    ) {
      return undefined;
    }
    const vizDefinition: unknown = definition.vizTypes[vizId];
    return _isPluginVizDefinition(vizDefinition) ? vizDefinition : undefined;
  } catch {
    return undefined;
  }
}

function _runPluginVizTransform(
  options: Readonly<PluginVizRunOptions>,
): PluginVizTransformOutcome {
  const { definition, vizId, input, messages, locale } = options;
  if (definition.transform === undefined) {
    return {
      status: "failed",
      error: new Error(`The "${vizId}" chart has no transform.`),
    };
  }
  // Plugin code is untrusted, so the transform runs inside the try, and its
  // spec and rows are checked before anything is drawn.
  try {
    const result = definition.transform(input, {
      i18n: { t: makePluginTranslator({ locale, messages }) },
      locale,
    });
    const chart = PluginChartSpecSchema.parse(result.chart);
    return {
      status: "ok",
      ...makeUiVizConfigFromPluginChartSpec({ chart, rows: result.rows }),
      rows: [...result.rows],
    };
  } catch (error) {
    return { status: "failed", error };
  }
}

/**
 * Everything that runs plugin chart code, in one module. It pulls in the
 * plugin SDK runtime and Lingui's message compiler, so load it only through
 * `loadPluginVizRuntime` when a plugin chart draws. The plugin bundle check
 * leaves chunks only this module reaches out of the plugin host's budget.
 */
export const PluginVizRuntime = {
  /**
   * Gets the chart definition a plugin's code module declares under the
   * manifest's chart type id. Returns undefined when the module is not a
   * plugin definition, declares no such chart (inherited keys such as
   * `constructor` do not count), declares something that is neither a
   * transform nor a component, or throws while being read.
   */
  getPluginVizDefinitionFromCodeModule: _getPluginVizDefinitionFromCodeModule,

  /**
   * Runs a transform chart's transform with a translator for the plugin's
   * messages, checks the spec it returns, and converts it to a built-in
   * chart config. Never throws: every failure comes back as `failed`.
   */
  runPluginVizTransform: _runPluginVizTransform,

  /** Draws a component chart. See `PluginVizComponentView`. */
  PluginVizComponentView,
};
```

- [ ] **Step 6: Run the runtime tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.test.tsx src/lib/plugins/makePluginApi/makePluginApi.test.tsx`
Expected: PASS (19 runtime tests, and the existing `makePluginApi` tests still pass with the default fallback).

- [ ] **Step 7: Write the failing loader test**

```ts
// src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    runtime: { runPluginVizTransform: vi.fn() },
    runtimeModuleLoadCount: 0,
    isRuntimeChunkBroken: false,
  };
});

/**
 * Stands in for the runtime chunk. Vitest runs it each time the chunk is
 * imported, so it counts imports and can simulate a chunk that fails to load.
 */
function _makeRuntimeModule(): { PluginVizRuntime: typeof mocks.runtime } {
  mocks.runtimeModuleLoadCount += 1;
  if (mocks.isRuntimeChunkBroken) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return { PluginVizRuntime: mocks.runtime };
}

/**
 * Imports a fresh copy of the loader, so the runtime it cached in an earlier
 * test cannot leak into this one.
 */
async function _importFreshLoader(): Promise<
  typeof import("@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime").loadPluginVizRuntime
> {
  vi.resetModules();
  vi.doMock(
    "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime",
    _makeRuntimeModule,
  );
  const loaderModule =
    await import("@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime");
  return loaderModule.loadPluginVizRuntime;
}

describe("loadPluginVizRuntime", () => {
  beforeEach(() => {
    mocks.runtimeModuleLoadCount = 0;
    mocks.isRuntimeChunkBroken = false;
  });

  it("does not import the runtime until it is asked to load it", async () => {
    await _importFreshLoader();

    expect(mocks.runtimeModuleLoadCount).toBe(0);
  });

  it("resolves to the runtime the chunk exports", async () => {
    const loadPluginVizRuntime = await _importFreshLoader();

    await expect(loadPluginVizRuntime()).resolves.toBe(mocks.runtime);
  });

  it("reuses the first load across repeated calls", async () => {
    const loadPluginVizRuntime = await _importFreshLoader();
    const firstLoad = loadPluginVizRuntime();
    await firstLoad;

    expect(loadPluginVizRuntime()).toBe(firstLoad);
  });

  it("rejects when the runtime chunk fails to load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();

    // Vitest wraps an error a mock factory throws and keeps it as the cause.
    await expect(loadPluginVizRuntime()).rejects.toMatchObject({
      cause: { message: "Failed to fetch dynamically imported module" },
    });
  });

  it("imports the runtime chunk again after a failed load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();
    await loadPluginVizRuntime().catch(() => {});

    mocks.isRuntimeChunkBroken = false;
    await loadPluginVizRuntime();

    expect(mocks.runtimeModuleLoadCount).toBe(2);
  });

  it("resolves to the runtime on a retry after a failed load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();
    await loadPluginVizRuntime().catch(() => {});

    mocks.isRuntimeChunkBroken = false;

    await expect(loadPluginVizRuntime()).resolves.toBe(mocks.runtime);
  });
});
```

- [ ] **Step 8: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime"`.

- [ ] **Step 9: Implement the loader**

```ts
// src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.ts
import type { PluginVizRuntime } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";

/**
 * The plugin chart runtime module object that `loadPluginVizRuntime`
 * resolves to.
 */
export type PluginVizRuntimeApi = typeof PluginVizRuntime;

function _importPluginVizRuntime(): Promise<PluginVizRuntimeApi> {
  return import("@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime").then(
    (runtimeModule) => {
      return runtimeModule.PluginVizRuntime;
    },
  );
}

let pluginVizRuntimePromise: Promise<PluginVizRuntimeApi> | undefined;

/**
 * Loads the plugin chart runtime on first use and reuses it afterwards. The
 * runtime reaches the plugin SDK runtime and Lingui's message compiler, so it
 * loads when a plugin chart draws rather than with the app. A failed import
 * is forgotten, so the next call retries it.
 *
 * Keep the specifier in `import()` a literal path, so the bundler can split
 * the runtime into its own chunk.
 */
export function loadPluginVizRuntime(): Promise<PluginVizRuntimeApi> {
  pluginVizRuntimePromise ??= _importPluginVizRuntime().catch(
    (error: unknown) => {
      pluginVizRuntimePromise = undefined;
      throw error;
    },
  );
  return pluginVizRuntimePromise;
}
```

- [ ] **Step 10: Run the tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/loadPluginVizRuntime src/lib/plugins/vizs/PluginVizRuntime`
Expected: PASS (25 tests: 6 loader, 19 runtime).

- [ ] **Step 11: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/lib/plugins/PluginErrorBoundary src/lib/plugins/vizs/PluginVizRuntime src/lib/plugins/vizs/loadPluginVizRuntime`
Expected: exit 0, no ESLint errors.

- [ ] **Step 12: Commit**

```bash
git add src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx \
  src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx \
  src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx \
  src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.test.tsx \
  src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.ts \
  src/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): add the lazily loaded plugin chart runtime

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 14: `PluginVizRenderer` in the visualization router

**Files:**
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants.ts`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader.tsx`
- Create: `src/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode.ts`
- Test: `src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.test.tsx`
- Modify: `src/components/VisualizationContainer/VisualizationContainer.tsx` (placeholder import line 2, docstring lines 35-36, plugin branch lines 45-52)
- Modify: `src/components/VisualizationContainer/__tests__/VisualizationContainerTestFixtures.tsx` (import line 1, `renderViz` lines 22-36, docstring lines 39-41)

**Context:** This task implements the `PluginVizRenderer` entry of contract C5 and finishes refinement 3: `VisualizationContainer` (left by Task 8 as a router that renders `PluginVizPlaceholder reason="missingPlugin"` for plugin configs) now renders `PluginVizRenderer`. The renderer zod-checks the config with `AvaPluginVizConfigSchema` (Task 7), looks up the chart type with `usePluginVizType` (Task 11), converts column IDs to names with `AvaVizConfigs.toUiVizConfig` (Task 8; a plugin config takes the overload that returns `UiVizConfig`, so the renderer narrows it to `UiPluginVizConfig`, and a column the result lost comes back `undefined`), shows `Choose a <setting label>` lines for required settings `AvaPluginVizConfigs.getMissingRequiredKeys` (Task 9) reports, then loads the runtime and the code (`loadPluginVizRuntime` from Task 13 and `PluginModuleCache.loadCode`, through React Query) and draws either the transform output with `UiVizConfigRenderer` (Task 6) or the component with `PluginVizComponentView` (Task 13). The renderer imports the runtime only as types, so the SDK runtime stays in the lazy chunk. Truncation: neither `DataExplorerApp` nor the dashboard `DataVizContent` has a truncation signal (they pass the full result their SQL returned), so `VisualizationContainer` gains no `isTruncated` prop; `PluginVizRenderer` takes an optional `isTruncated` that defaults to false, and only a caller that knows its result was cut short passes it. A component chart receives at most `PLUGIN_VIZ_COMPONENT_ROW_LIMIT` (1,000) rows and is told when they were cut. Each renderer sub-component sits in its own file (one component per file). Tests render the real `PluginVizPlaceholder` (Task 7) and assert its copy: "Plugin not available", "Invalid chart settings", "<title> couldn't render", "This chart couldn't load" with a Retry button. Task 8's container test "shows the missing plugin placeholder for a plugin chart" keeps passing unchanged once the container fixture mounts a query client.

- [ ] **Step 1: Write the failing renderer test**

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.test.tsx
import { definePlugin, useT } from "@avandar/plugin-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { loadPluginVizRuntime } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import { PluginVizRenderer } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer";
import { PLUGIN_VIZ_COMPONENT_ROW_LIMIT } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { Logger } from "@/utils/Logger";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginCodeModule,
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type {
  PluginVizComponentProps,
  PluginVizInput,
  PluginVizTransform,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});
// Public dashboard links mount no workspace, so nothing a plugin chart
// renders may ask for one.
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      throw new Error("A plugin chart must draw without a workspace.");
    },
  };
});
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return {
    ...actual,
    // The test environment's ResizeObserver never fires, so a real
    // measurement would stay 0 by 0.
    useElementSize: () => {
      return { ref: () => {}, width: 640, height: 360 };
    },
  };
});
vi.mock("@/lib/ui/viz/BarChart/BarChart", () => {
  return {
    BarChart: (props: {
      xAxisKey?: string;
      series?: ReadonlyArray<{ key: string }>;
      data: UnknownDataFrame;
    }) => {
      return (
        <div
          data-testid="bar-chart"
          data-x={props.xAxisKey}
          data-y={props.series?.[0]?.key}
          data-row-count={props.data.length}
        />
      );
    },
  };
});
const REGION_ID = "region-id" as QueryColumn.Id;
const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: REGION_ID, name: "region", dataType: "varchar" },
  { id: "cases-id" as QueryColumn.Id, name: "cases", dataType: "bigint" },
];
const DATA: UnknownDataFrame = [
  { region: "North", cases: 3 },
  { region: "South", cases: 5 },
];
const MESSAGES = { en: { heading: "Cases by region" } };

let queryClient: QueryClient;
let nextPluginNumber = 0;

function _makeCaseBarsFromRows(
  input: PluginVizInput,
): PluginVizTransformResult {
  const labelColumn = String(input.settings.labelColumn);
  return {
    rows: input.rows.map((row) => {
      return { label: row[labelColumn], cases: row.cases };
    }),
    chart: { kind: "bar", xColumn: "label", series: [{ column: "cases" }] },
  };
}

function CaseDots({
  rows,
  width,
  isTruncated,
}: PluginVizComponentProps): ReactNode {
  const t = useT();
  return (
    <div
      data-testid="case-dots"
      data-width={width}
      data-row-count={rows.length}
      data-truncated={String(isTruncated)}
    >
      {t("heading")}
    </div>
  );
}

function CrashingChart(): ReactNode {
  throw new Error("chart crashed");
}

const CASE_CHARTS = definePlugin({
  vizTypes: {
    "case-bars": { transform: _makeCaseBarsFromRows },
    "case-dots": { Component: CaseDots },
  },
});

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      name: "%name%",
      contributes: {
        vizTypes: [
          {
            id: "case-bars",
            title: "%viz.caseBars.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "labelColumn",
                label: "%viz.labelColumn%",
                control: { kind: "columnPicker", dataType: "text" },
                required: true,
              },
            ],
          },
          {
            id: "case-dots",
            title: "%viz.caseDots.title%",
            icon: "chart-dots",
            render: "component",
            settings: [],
          },
        ],
      },
    },
    strings: {
      en: {
        name: "Case charts",
        "viz.caseBars.title": "Case bars",
        "viz.caseDots.title": "Case dots",
        "viz.labelColumn": "Label column",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  options: {
    definition?: unknown;
    loadCode?: () => Promise<PluginCodeModule>;
  } = {},
): string {
  nextPluginNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `avandar.case-charts-${nextPluginNumber}`;
  const codeModule: PluginCodeModule = {
    definition: options.definition ?? CASE_CHARTS,
    messages: MESSAGES,
  };
  mocks.entries.push({
    id,
    loadManifest: () => {
      return Promise.resolve(_makeManifestModule(id));
    },
    loadCode:
      options.loadCode ??
      (() => {
        return Promise.resolve(codeModule);
      }),
  });
  return id;
}

function _addPluginWithBars(transform: PluginVizTransform): string {
  return _addBundledPlugin({
    definition: definePlugin({ vizTypes: { "case-bars": { transform } } }),
  });
}

function _makeConfig(options: {
  pluginId: string;
  pluginVizId?: string;
  columnSettings?: AvaVizConfig.Plugin["columnSettings"];
}): AvaVizConfig.Plugin {
  return {
    vizType: "plugin",
    pluginId: options.pluginId,
    pluginVizId: options.pluginVizId ?? "case-bars",
    columnSettings: options.columnSettings ?? { labelColumn: REGION_ID },
    settings: {},
  };
}

function _makeDotsConfig(pluginId: string): AvaVizConfig.Plugin {
  return _makeConfig({
    pluginId,
    pluginVizId: "case-dots",
    columnSettings: {},
  });
}

function _makeRows(rowCount: number): UnknownDataFrame {
  return Array.from({ length: rowCount }, (_row, index) => {
    return { region: `Region ${index}`, cases: index };
  });
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderChart(options: {
  vizConfig: AvaVizConfig.Plugin;
  data?: UnknownDataFrame;
  isTruncated?: boolean;
}): void {
  render(
    <PluginVizRenderer
      columns={COLUMNS}
      data={options.data ?? DATA}
      vizConfig={options.vizConfig}
      isTruncated={options.isTruncated}
    />,
    { wrapper: QueryWrapper },
  );
}

describe("PluginVizRenderer", () => {
  beforeAll(async () => {
    // The first load of the runtime chunk compiles the plugin SDK, which can
    // outlast a findBy timeout. Later loads reuse it.
    await loadPluginVizRuntime();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
    vi.spyOn(Logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("draws a transform chart's output with the built-in bar chart", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });

    expect(await screen.findByTestId("bar-chart")).toHaveAttribute(
      "data-x",
      "label",
    );
  });

  it("passes column settings to the transform as column names", async () => {
    const transform = vi.fn(_makeCaseBarsFromRows);
    const pluginId = _addPluginWithBars(transform);

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await screen.findByTestId("bar-chart");

    expect(transform).toHaveBeenCalledWith(
      expect.objectContaining({ settings: { labelColumn: "region" } }),
      expect.anything(),
    );
  });

  it("draws a component chart at the measured size", async () => {
    _renderChart({ vizConfig: _makeDotsConfig(_addBundledPlugin()) });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-width",
      "640",
    );
  });

  it("gives a component chart the plugin's strings through useT", async () => {
    _renderChart({ vizConfig: _makeDotsConfig(_addBundledPlugin()) });

    expect(await screen.findByText("Cases by region")).toBeInTheDocument();
  });

  it("passes a component chart at most the component row limit", async () => {
    _renderChart({
      vizConfig: _makeDotsConfig(_addBundledPlugin()),
      data: _makeRows(PLUGIN_VIZ_COMPONENT_ROW_LIMIT + 200),
    });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-row-count",
      String(PLUGIN_VIZ_COMPONENT_ROW_LIMIT),
    );
  });

  it("tells a component chart that its rows were cut to the row limit", async () => {
    _renderChart({
      vizConfig: _makeDotsConfig(_addBundledPlugin()),
      data: _makeRows(PLUGIN_VIZ_COMPONENT_ROW_LIMIT + 200),
    });

    expect(await screen.findByTestId("case-dots")).toHaveAttribute(
      "data-truncated",
      "true",
    );
  });

  it("draws a stored plugin chart with no plugin host or workspace mounted", async () => {
    // This file provides no ActivePluginsContext, so no plugin is installed,
    // and useCurrentWorkspace throws, as on a public dashboard link.
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows the missing-plugin placeholder for a plugin this deployment does not bundle", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: "avandar.removed" }) });

    expect(await screen.findByText("Plugin not available")).toBeInTheDocument();
  });

  it("shows the missing-plugin placeholder for a chart type the plugin does not declare", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        pluginVizId: "case-pies",
      }),
    });

    expect(await screen.findByText("Plugin not available")).toBeInTheDocument();
  });

  it("shows the invalid-settings placeholder for a stored config that fails validation", () => {
    _renderChart({
      vizConfig: {
        ..._makeConfig({ pluginId: "avandar.case-charts" }),
        pluginId: "",
      },
    });

    expect(screen.getByText("Invalid chart settings")).toBeInTheDocument();
  });

  it("asks for a required setting that is unset", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        columnSettings: {},
      }),
    });

    expect(
      await screen.findByText("Choose a Label column"),
    ).toBeInTheDocument();
  });

  it("asks for a required column setting whose column left the result", async () => {
    _renderChart({
      vizConfig: _makeConfig({
        pluginId: _addBundledPlugin(),
        columnSettings: { labelColumn: "district-id" as QueryColumn.Id },
      }),
    });

    expect(
      await screen.findByText("Choose a Label column"),
    ).toBeInTheDocument();
  });

  it("does not load the plugin code while a required setting is unset", async () => {
    const loadCode = vi.fn(() => {
      return Promise.resolve({ definition: CASE_CHARTS, messages: MESSAGES });
    });
    const pluginId = _addBundledPlugin({ loadCode });

    _renderChart({ vizConfig: _makeConfig({ pluginId, columnSettings: {} }) });
    await screen.findByText("Choose a Label column");

    expect(loadCode).not.toHaveBeenCalled();
  });

  it("shows a loader while the plugin code loads", async () => {
    const loadCode = vi.fn(() => {
      return new Promise<PluginCodeModule>(() => {});
    });
    const pluginId = _addBundledPlugin({ loadCode });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await waitFor(() => {
      expect(loadCode).toHaveBeenCalled();
    });

    expect(
      screen.getByRole("status", { name: "Loading chart" }),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't load when the plugin code fails to load", async () => {
    const pluginId = _addBundledPlugin({
      loadCode: () => {
        return Promise.reject(new Error("chunk failed"));
      },
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("This chart couldn't load"),
    ).toBeInTheDocument();
  });

  it("draws the chart after a retry once the plugin code loads", async () => {
    let numLoads = 0;
    const pluginId = _addBundledPlugin({
      loadCode: () => {
        numLoads += 1;
        return numLoads === 1
          ? Promise.reject(new Error("chunk failed"))
          : Promise.resolve({ definition: CASE_CHARTS, messages: MESSAGES });
      },
    });
    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the transform throws", async () => {
    const pluginId = _addPluginWithBars(() => {
      throw new Error("boom");
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("logs a failed transform with the plugin and chart ids", async () => {
    const pluginId = _addPluginWithBars(() => {
      throw new Error("boom");
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });
    await screen.findByText("Case bars couldn't render");

    expect(Logger.error).toHaveBeenCalledWith(
      "Plugin chart failed to render",
      expect.objectContaining({ pluginId, pluginVizId: "case-bars" }),
    );
  });

  it("shows that the chart couldn't render when the transform returns a spec with no series", async () => {
    const pluginId = _addPluginWithBars((input) => {
      return {
        rows: input.rows,
        chart: { kind: "bar", xColumn: "region", series: [] },
      };
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the chart spec names a column the rows lack", async () => {
    const pluginId = _addPluginWithBars((input) => {
      return {
        rows: input.rows,
        chart: {
          kind: "bar",
          xColumn: "district",
          series: [{ column: "cases" }],
        },
      };
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the component throws", async () => {
    // React and the boundary both log the crash. Keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pluginId = _addBundledPlugin({
      definition: definePlugin({
        vizTypes: { "case-dots": { Component: CrashingChart } },
      }),
    });

    _renderChart({ vizConfig: _makeDotsConfig(pluginId) });

    expect(
      await screen.findByText("Case dots couldn't render"),
    ).toBeInTheDocument();
  });

  it("shows that the chart couldn't render when the plugin code declares no such chart", async () => {
    const pluginId = _addBundledPlugin({
      definition: definePlugin({ vizTypes: {} }),
    });

    _renderChart({ vizConfig: _makeConfig({ pluginId }) });

    expect(
      await screen.findByText("Case bars couldn't render"),
    ).toBeInTheDocument();
  });

  it("notes how many rows a truncated result's chart was built from", async () => {
    _renderChart({
      vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }),
      isTruncated: true,
    });

    expect(
      await screen.findByText("Built from the first 2 rows of the result."),
    ).toBeInTheDocument();
  });

  it("shows no truncation note for a complete result", async () => {
    _renderChart({ vizConfig: _makeConfig({ pluginId: _addBundledPlugin() }) });
    await screen.findByTestId("bar-chart");

    expect(screen.queryByText(/Built from the first/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.test.tsx`
Expected: FAIL, `Failed to resolve import "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer"`.

- [ ] **Step 3: Add the row limit constant and the loader**

```ts
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants.ts
/**
 * The most result rows a plugin chart component receives. A component draws
 * every row it gets, so this keeps a large result from freezing the page. A
 * transform reads every row instead, since it usually aggregates them first.
 */
export const PLUGIN_VIZ_COMPONENT_ROW_LIMIT = 1_000;
```

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader.tsx
import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";

/**
 * The chart area's loading state while a plugin chart's manifest or code
 * downloads. `PluginVizRenderer` and `PluginVizCodeLoader` render it.
 */
export function PluginVizChartLoader(): JSX.Element {
  const { t } = useLingui();
  return (
    <Center h="100%" w="100%">
      <Loader size="sm" role="status" aria-label={t`Loading chart`} />
    </Center>
  );
}
```

- [ ] **Step 4: Add the missing-settings state**

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings.tsx
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { DangerText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import type {
  PluginLocaleMessages,
  PluginVizSetting,
} from "@avandar/plugin-manifest/runtime";

type Props = {
  /** The required settings that have no value. */
  settings: readonly PluginVizSetting[];

  /** The plugin's manifest strings, which hold the settings' labels. */
  strings: PluginLocaleMessages;
};

/**
 * What a plugin chart shows instead of drawing while required settings are
 * unset: one line per setting, such as "Choose a Date column", in the same
 * danger text built-in charts use for a missing axis or series.
 * `PluginVizConfiguredChart` renders it.
 */
export function PluginVizMissingSettings({
  settings,
  strings,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  return (
    <Stack h="100%" w="100%" justify="center" align="center" gap="xs">
      {settings.map((setting) => {
        const settingLabel = getLocalizedTextFromManifestStrings({
          strings,
          locale: i18n.locale,
          value: setting.label,
        });
        return (
          <DangerText
            key={setting.key}
          >{t`Choose a ${settingLabel}`}</DangerText>
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 5: Add the code-loading hook**

```ts
// src/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode.ts
import { useQuery } from "@avandar/query-hooks";
import { useEffect, useMemo } from "react";
import { PluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import { loadPluginVizRuntime } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import { Logger } from "@/utils/Logger";
import type {
  PluginCodeModule,
  PluginIndexEntry,
} from "@/lib/plugins/PluginIndex.types";
import type { PluginVizRuntimeApi } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import type { PluginMessages, PluginVizDefinition } from "@avandar/plugin-sdk";
import type { UseQueryResultTuple } from "@avandar/query-hooks";

/**
 * Where loading a plugin chart's code stands, for `PluginVizCodeLoader` to
 * branch on.
 *
 * - `loading`: the runtime or the plugin's code chunk is downloading.
 * - `failed`: a chunk failed to load. `retry` loads both again.
 * - `ready`: carries the runtime, the plugin's messages, and the chart's
 *   definition, which is undefined when the code declares no usable chart
 *   under the chart type's id.
 */
export type PluginVizCodeLookup =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "failed"; retry: () => void }>
  | Readonly<{
      status: "ready";
      runtime: PluginVizRuntimeApi;
      messages: PluginMessages;
      definition: PluginVizDefinition | undefined;
    }>;

type LoadedPluginVizCode = Readonly<{
  runtime: PluginVizRuntimeApi;
  codeModule: PluginCodeModule;
}>;

const LOADING: PluginVizCodeLookup = { status: "loading" };

async function _loadPluginVizCode(
  entry: PluginIndexEntry,
): Promise<LoadedPluginVizCode> {
  const [runtime, codeModule] = await Promise.all([
    loadPluginVizRuntime(),
    PluginModuleCache.loadCode(entry),
  ]);
  return { runtime, codeModule };
}

function _getLookupFromLoadedCode(options: {
  loadedCode: LoadedPluginVizCode;
  vizId: string;
}): PluginVizCodeLookup {
  const { loadedCode, vizId } = options;
  const { runtime, codeModule } = loadedCode;
  return {
    status: "ready",
    runtime,
    messages: codeModule.messages,
    definition: runtime.getPluginVizDefinitionFromCodeModule({
      codeModule,
      vizId,
    }),
  };
}

function useLoadedPluginVizCode(
  entry: PluginIndexEntry,
): UseQueryResultTuple<LoadedPluginVizCode> {
  return useQuery({
    // The plugin id identifies the entry. Its other fields are the chunk
    // loaders, which do not change what the query loads.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["plugins", "vizCode", entry.id],
    queryFn: () => {
      return _loadPluginVizCode(entry);
    },
    // Never written to disk. The runtime and the code module hold
    // functions, which JSON persistence cannot keep.
    meta: { persist: false },
    // A failed load shows its Retry button at once instead of retrying out
    // of sight first.
    retry: false,
    staleTime: Infinity,
    // Modules of functions give structural sharing nothing to reuse.
    structuralSharing: false,
  });
}

/**
 * Loads the plugin chart runtime and a plugin's code, each at most once per
 * session, and finds the chart definition the code declares under `vizId`.
 * Lets `PluginVizCodeLoader` draw a stored plugin chart without the plugin
 * host. Both loaders forget a failed attempt, so `retry` loads again. A
 * missing definition is logged with the plugin and chart ids.
 */
export function usePluginVizCode(options: {
  entry: PluginIndexEntry;
  vizId: string;
}): PluginVizCodeLookup {
  const { entry, vizId } = options;
  const [loadedCode, _isLoading, { isError, isFetching, refetch }] =
    useLoadedPluginVizCode(entry);
  const lookup = useMemo((): PluginVizCodeLookup => {
    if (loadedCode !== undefined) {
      return _getLookupFromLoadedCode({ loadedCode, vizId });
    }
    if (isError && !isFetching) {
      return {
        status: "failed",
        retry: () => {
          void refetch();
        },
      };
    }
    return LOADING;
  }, [loadedCode, vizId, isError, isFetching, refetch]);
  const isDefinitionMissing =
    lookup.status === "ready" && lookup.definition === undefined;

  useEffect(
    function logMissingDefinition() {
      if (isDefinitionMissing) {
        Logger.error("Plugin code declares no such chart", {
          pluginId: entry.id,
          pluginVizId: vizId,
        });
      }
    },
    [isDefinitionMissing, entry.id, vizId],
  );

  return lookup;
}
```

- [ ] **Step 6: Add the transform chart**

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart.tsx
import { Trans } from "@lingui/react/macro";
import { Box, Stack, Text } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { Logger } from "@/utils/Logger";
import type { PluginVizRuntimeApi } from "@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime";
import type { PluginVizRunOptions } from "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime";

type Props = {
  runtime: PluginVizRuntimeApi;
  chartOptions: PluginVizRunOptions;
  pluginId: string;

  /** The chart type's localized title, which the render-failed state names. */
  title: string;
};

/**
 * Runs a transform chart's transform, memoized on its input, and draws the
 * output with the built-in chart renderer. Under a chart built from a
 * truncated result it notes how many rows it read. A failed transform is
 * logged with the plugin and chart ids and shows the render-failed state.
 * `PluginVizLoadedChart` renders it.
 */
export function PluginVizTransformChart({
  runtime,
  chartOptions,
  pluginId,
  title,
}: Props): JSX.Element {
  const { definition, vizId, input, messages, locale } = chartOptions;
  const outcome = useMemo(() => {
    return runtime.runPluginVizTransform({
      definition,
      vizId,
      input,
      messages,
      locale,
    });
  }, [runtime, definition, vizId, input, messages, locale]);
  const rowCount = input.rows.length;

  useEffect(
    function logFailedTransform() {
      if (outcome.status === "failed") {
        Logger.error("Plugin chart failed to render", {
          pluginId,
          pluginVizId: vizId,
          error: outcome.error,
        });
      }
    },
    [outcome, pluginId, vizId],
  );

  if (outcome.status === "failed") {
    return (
      <PluginVizPlaceholder
        reason="renderFailed"
        pluginId={pluginId}
        title={title}
      />
    );
  }
  return (
    <Stack h="100%" w="100%" gap="xs">
      <Box flex={1} mih={0}>
        <UiVizConfigRenderer
          uiVizConfig={outcome.uiVizConfig}
          data={outcome.rows}
          dateColumns={outcome.dateColumns}
          columnNames={outcome.columnNames}
        />
      </Box>
      {input.isTruncated ? (
        <Text size="xs" c="dimmed" ta="center">
          <Trans>Built from the first {rowCount} rows of the result.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
```

- [ ] **Step 7: Add the loaded chart and the code loader**

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart.tsx
import { useLingui } from "@lingui/react/macro";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizTransformChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart";
import type { PluginVizCodeLookup } from "@/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { PluginVizInput } from "@avandar/plugin-sdk";

type Props = {
  code: Extract<PluginVizCodeLookup, { status: "ready" }>;
  pluginId: string;
  vizType: PluginVizType;
  input: PluginVizInput;

  /** The chart type's localized title, which the render-failed state names. */
  title: string;

  /**
   * The plugin's localized name, which a crashing chart component is logged
   * under.
   */
  pluginName: string;
};

/**
 * Draws a plugin chart once its code has loaded, the way its manifest says:
 * a transform chart through `PluginVizTransformChart`, a component chart
 * through the runtime's `PluginVizComponentView`. Code that declares no
 * usable chart shows the render-failed state. `PluginVizCodeLoader` renders
 * it.
 */
export function PluginVizLoadedChart({
  code,
  pluginId,
  vizType,
  input,
  title,
  pluginName,
}: Props): JSX.Element {
  const { i18n } = useLingui();
  const { runtime, definition, messages } = code;
  const renderFailed = (
    <PluginVizPlaceholder
      reason="renderFailed"
      pluginId={pluginId}
      title={title}
    />
  );
  if (definition === undefined) {
    return renderFailed;
  }
  const chartOptions = {
    definition,
    vizId: vizType.id,
    input,
    messages,
    locale: i18n.locale,
  };
  const { PluginVizComponentView } = runtime;
  return vizType.render === "transform" ? (
    <PluginVizTransformChart
      runtime={runtime}
      chartOptions={chartOptions}
      pluginId={pluginId}
      title={title}
    />
  ) : (
    <PluginVizComponentView
      {...chartOptions}
      pluginName={pluginName}
      errorFallback={renderFailed}
    />
  );
}
```

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader.tsx
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizChartLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader";
import { PluginVizLoadedChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart";
import { usePluginVizCode } from "@/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizInput } from "@avandar/plugin-sdk";

type Props = {
  lookup: Extract<PluginVizTypeLookup, { status: "ready" }>;
  input: PluginVizInput;
};

/**
 * Loads a plugin chart's code and draws the chart. The chart area shows a
 * loader while the chunks download, and a Retry button when they fail to.
 * `PluginVizConfiguredChart` renders it once every required setting has a
 * value.
 */
export function PluginVizCodeLoader({ lookup, input }: Props): JSX.Element {
  const { i18n } = useLingui();
  const { entry, manifestModule, vizType } = lookup;
  const code = usePluginVizCode({ entry, vizId: vizType.id });
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  const title = localize(vizType.title);
  if (code.status === "loading") {
    return <PluginVizChartLoader />;
  }
  if (code.status === "failed") {
    return (
      <PluginVizPlaceholder
        reason="loadFailed"
        pluginId={entry.id}
        title={title}
        onRetry={code.retry}
      />
    );
  }
  return (
    <PluginVizLoadedChart
      code={code}
      pluginId={entry.id}
      vizType={vizType}
      input={input}
      title={title}
      pluginName={localize(manifestModule.manifest.name)}
    />
  );
}
```

- [ ] **Step 8: Add the configured chart and the renderer**

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart.tsx
import { prop } from "@avandar/utils";
import { useMemo } from "react";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { PluginVizCodeLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader";
import { PluginVizMissingSettings } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings";
import { PLUGIN_VIZ_COMPONENT_ROW_LIMIT } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { PluginVizInput } from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  lookup: Extract<PluginVizTypeLookup, { status: "ready" }>;
  columns: readonly QueryResult.ColumnWithId[];
  rawColumns: readonly QueryResult.Column[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.Plugin;
  isTruncated: boolean;
};

/** What a plugin chart's input is built from. */
type InputSource = {
  vizType: PluginVizType;
  uiConfig: UiPluginVizConfig;
  data: UnknownDataFrame;
  rawColumns: readonly QueryResult.Column[];
  isTruncated: boolean;
};

function _getUiPluginVizConfig(options: {
  vizConfig: AvaVizConfig.Plugin;
  columns: readonly QueryResult.ColumnWithId[];
}): UiPluginVizConfig {
  const { vizConfig, columns } = options;
  const { config } = AvaVizConfigs.toUiVizConfig({
    config: vizConfig,
    columns,
  });
  // The conversion keeps the viz type, so a plugin config always comes back
  // as one. The other arm only satisfies the union.
  return config.vizType === "plugin"
    ? config
    : { ...vizConfig, columnSettings: {} };
}

function _buildSettings(options: {
  vizType: PluginVizType;
  uiConfig: UiPluginVizConfig;
}): PluginVizInput["settings"] {
  const { vizType, uiConfig } = options;
  return Object.fromEntries(
    vizType.settings.map((setting) => {
      return [
        setting.key,
        setting.control.kind === "columnPicker"
          ? uiConfig.columnSettings[setting.key]
          : uiConfig.settings[setting.key],
      ] as const;
    }),
  );
}

function _buildInput(source: Readonly<InputSource>): PluginVizInput {
  const { vizType, uiConfig, data, rawColumns, isTruncated } = source;
  const rows =
    vizType.render === "component"
      ? data.slice(0, PLUGIN_VIZ_COMPONENT_ROW_LIMIT)
      : data;
  return {
    rows,
    columns: rawColumns.map((column) => {
      return { name: column.name, dataType: column.dataType };
    }),
    settings: _buildSettings({ vizType, uiConfig }),
    isTruncated: isTruncated || rows.length < data.length,
  };
}

/**
 * A plugin chart whose type was found: it reads the stored config by column
 * name, asks for any required setting that has no value, and otherwise
 * builds the chart's input (column settings as column names, and at most
 * `PLUGIN_VIZ_COMPONENT_ROW_LIMIT` rows for a component chart) and loads the
 * chart. `PluginVizRenderer` renders it.
 */
export function PluginVizConfiguredChart({
  lookup,
  columns,
  rawColumns,
  data,
  vizConfig,
  isTruncated,
}: Props): JSX.Element {
  const { vizType } = lookup;
  const uiConfig = useMemo(() => {
    return _getUiPluginVizConfig({ vizConfig, columns });
  }, [vizConfig, columns]);
  const input = useMemo(() => {
    return _buildInput({ vizType, uiConfig, data, rawColumns, isTruncated });
  }, [vizType, uiConfig, data, rawColumns, isTruncated]);
  const missingKeys = AvaPluginVizConfigs.getMissingRequiredKeys({
    config: uiConfig,
    settings: vizType.settings,
    columnNames: rawColumns.map(prop("name")),
  });
  if (missingKeys.length > 0) {
    return (
      <PluginVizMissingSettings
        settings={vizType.settings.filter((setting) => {
          return missingKeys.includes(setting.key);
        })}
        strings={lookup.manifestModule.strings}
      />
    );
  }
  return <PluginVizCodeLoader lookup={lookup} input={input} />;
}
```

```tsx
// src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.tsx
import { AvaPluginVizConfigSchema } from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizChartLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader";
import { PluginVizConfiguredChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];

  /**
   * Every column the query returned, including any that could not be given a
   * column ID. The chart's input lists these. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.Plugin;

  /**
   * Whether `data` holds only the first rows of a longer result. A transform
   * chart then notes how many rows it was built from. Defaults to false,
   * because `VisualizationContainer`'s callers pass the full result their
   * query returned. Only a caller that knows its result was cut short sets
   * it.
   */
  isTruncated?: boolean;
};

/**
 * Draws a stored plugin chart from the plugins this deployment bundles, the
 * `plugin` branch of `VisualizationContainer`. It needs neither the plugin
 * host nor a workspace, so a plugin chart also draws on a public dashboard
 * link. A config that fails validation, a plugin or chart type that is not
 * bundled, unset required settings, code that fails to load, and a chart
 * that fails to render each show their own state in the chart area.
 */
export function PluginVizRenderer({
  columns,
  rawColumns = columns,
  data,
  vizConfig,
  isTruncated = false,
}: Props): JSX.Element {
  const isConfigValid = AvaPluginVizConfigSchema.safeParse(vizConfig).success;
  const lookup = usePluginVizType(isConfigValid ? vizConfig : undefined);
  if (!isConfigValid) {
    return (
      <PluginVizPlaceholder
        reason="invalidSettings"
        // A stored config that fails the check can hold anything here.
        pluginId={String(vizConfig.pluginId)}
      />
    );
  }
  if (lookup.status === "loading") {
    return <PluginVizChartLoader />;
  }
  if (lookup.status === "missing") {
    return (
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId={vizConfig.pluginId}
      />
    );
  }
  return (
    <PluginVizConfiguredChart
      lookup={lookup}
      columns={columns}
      rawColumns={rawColumns}
      data={data}
      vizConfig={vizConfig}
      isTruncated={isTruncated}
    />
  );
}
```

- [ ] **Step 9: Run the renderer tests and confirm they pass**

Run: `pnpm vitest run src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.test.tsx`
Expected: PASS (24 tests).

- [ ] **Step 10: Route plugin configs to the renderer**

In `src/components/VisualizationContainer/VisualizationContainer.tsx` (the router Task 8 left), make three edits.

Edit 1. Replace the placeholder import (line 2):

```tsx
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
```

with:

```tsx
import { PluginVizRenderer } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer";
```

Edit 2. In the component docstring, replace:

```tsx
 * Built-in configs render through `BuiltInVizContainer`. A plugin config
 * shows the missing-plugin placeholder.
```

with:

```tsx
 * Built-in configs render through `BuiltInVizContainer`. A plugin config
 * draws through `PluginVizRenderer`.
```

Edit 3. Replace the plugin branch:

```tsx
  if (vizConfig.vizType === "plugin") {
    return (
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId={vizConfig.pluginId}
      />
    );
  }
```

with:

```tsx
  if (vizConfig.vizType === "plugin") {
    return (
      <PluginVizRenderer
        columns={columns}
        rawColumns={rawColumns}
        data={data}
        vizConfig={vizConfig}
      />
    );
  }
```

- [ ] **Step 11: Run the container test and confirm the plugin test fails**

Task 8's test "shows the missing plugin placeholder for a plugin chart" now goes through `PluginVizRenderer`, which looks the manifest up with React Query, and `renderViz` mounts no query client.

Run: `pnpm vitest run src/components/VisualizationContainer/__tests__/VisualizationContainer.test.tsx`
Expected: FAIL, 1 test: "shows the missing plugin placeholder for a plugin chart", with `No QueryClient set, use QueryClientProvider to set one`. Every built-in test passes.

- [ ] **Step 12: Give `renderViz` a query client**

The app always renders charts under its query client provider, so the test fixture mounts one too. The test itself stays as Task 8 wrote it: the plugin index is stubbed empty under Vitest, so the renderer's lookup ends at `missingPlugin` and the real placeholder shows "Plugin not available".

In `src/components/VisualizationContainer/__tests__/VisualizationContainerTestFixtures.tsx`:

Edit 1. Replace the first import line:

```tsx
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
```

with:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
```

Edit 2. Replace `renderViz`:

```tsx
function renderViz(
  vizConfig: Parameters<typeof VisualizationContainer>[0]["vizConfig"],
  data: UnknownDataFrame = DATA,
): ReturnType<typeof render> {
  return render(
    <AvandarAppProvider>
      <VisualizationContainer
        columns={COLUMNS}
        data={data}
        dateColumns={EMPTY_DATE_COLUMNS}
        vizConfig={vizConfig}
      />
    </AvandarAppProvider>,
  );
}
```

with:

```tsx
function renderViz(
  vizConfig: Parameters<typeof VisualizationContainer>[0]["vizConfig"],
  data: UnknownDataFrame = DATA,
): ReturnType<typeof render> {
  // A plugin chart looks its manifest up through React Query, so the
  // container renders under a query client, as it does in the app.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <AvandarAppProvider>
      <QueryClientProvider client={queryClient}>
        <VisualizationContainer
          columns={COLUMNS}
          data={data}
          dateColumns={EMPTY_DATE_COLUMNS}
          vizConfig={vizConfig}
        />
      </QueryClientProvider>
    </AvandarAppProvider>,
  );
}
```

Edit 3. In the `VisualizationContainerTestFixtures` docstring, replace:

```tsx
 * Columns, rows, and a `renderViz` helper that mounts `VisualizationContainer`
 * over them inside the app providers, so each test supplies only the
 * `AvaVizConfig` it checks. Used by the `VisualizationContainer` tests.
```

with:

```tsx
 * Columns, rows, and a `renderViz` helper that mounts `VisualizationContainer`
 * over them inside the app providers and a query client, so each test
 * supplies only the `AvaVizConfig` it checks. Used by the
 * `VisualizationContainer` tests.
```

- [ ] **Step 13: Run the container and renderer tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer src/lib/plugins/vizs`
Expected: PASS (every test in both trees, including Task 8's "shows the missing plugin placeholder for a plugin chart" and the 24 renderer tests).

- [ ] **Step 14: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/lib/plugins/vizs/PluginVizRenderer src/components/VisualizationContainer/VisualizationContainer.tsx src/components/VisualizationContainer/__tests__/VisualizationContainerTestFixtures.tsx`
Expected: exit 0, no ESLint errors.

- [ ] **Step 15: Commit**

```bash
git add src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants.ts \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizLoadedChart.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizTransformChart.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader.tsx \
  src/lib/plugins/vizs/PluginVizRenderer/usePluginVizCode.ts \
  src/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.test.tsx \
  src/components/VisualizationContainer/VisualizationContainer.tsx \
  src/components/VisualizationContainer/__tests__/VisualizationContainerTestFixtures.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): draw stored plugin charts in the visualization container

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 15: Plugin chart settings form

**Files:**
- Create: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.tsx`
- Create: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls.tsx`
- Create: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers.ts`
- Test: `src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx`
- Modify: `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx` (import after line 4, docstring line 37, plugin arm lines 140-142)
- Modify: `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx` (plugin branch tests)

**Context:** This task implements contract C6. The form takes the same props `VizSettingsFormBody` already passes to the per-type forms (`fields`, `config`, `onConfigChange`, `layout`), loads the manifest through `usePluginVizType` (Task 11, never the plugin code), maps each manifest setting to the existing `ControlSpec` (a `columnPicker` keeps its `dataType`; labels, option labels, a number's `unit`, and a text input's `placeholder` are localized with `getLocalizedTextFromManifestStrings`), and renders the shared `Control` with `fields`, in declaration order, in one `SettingsColumns` group titled "Chart settings". `Control` passes option labels through `vizSettingControlLabel`, which returns an unknown label unchanged, so localized plugin labels display as given. `ColumnPickerControl` stores the column ID, so column settings go to `columnSettings` by ID and every other setting to `settings`. Task 8 left a `{ vizType: "plugin" }` arm in `VizSettingsFormBody` that returns `null`; this task replaces it. The form test needs a `QueryClientProvider` and a mocked `@/lib/plugins/pluginIndexHelpers`.

- [ ] **Step 1: Write the failing form test**

```tsx
// src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginVizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { entries: [] as unknown[] };
});

vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});

const EPIDEMIOLOGY_ID = "avandar.epidemiology";
const ONSET_ID = "onset-id" as QueryColumn.Id;

const FIELDS: readonly QueryResult.ColumnWithId[] = [
  { id: ONSET_ID, name: "onset", dataType: "date" },
  { id: "cases-id" as QueryColumn.Id, name: "cases", dataType: "bigint" },
  { id: "region-id" as QueryColumn.Id, name: "region", dataType: "varchar" },
];

const CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: EPIDEMIOLOGY_ID,
  pluginVizId: "epicurve",
  columnSettings: {},
  settings: { interval: "day", window: 7 },
};

const MANIFEST_MODULE = {
  manifest: {
    id: EPIDEMIOLOGY_ID,
    contributes: {
      vizTypes: [
        {
          id: "epicurve",
          title: "%viz.title%",
          icon: "chart-histogram",
          render: "transform",
          settings: [
            {
              key: "dateColumn",
              label: "%viz.dateColumn%",
              control: { kind: "columnPicker", dataType: "temporal" },
              required: true,
            },
            {
              key: "interval",
              label: "%viz.interval%",
              control: {
                kind: "segmented",
                options: [
                  { value: "day", label: "%viz.interval.day%" },
                  { value: "month", label: "%viz.interval.month%" },
                ],
              },
              required: false,
              default: "day",
            },
            {
              key: "palette",
              label: "%viz.palette%",
              control: {
                kind: "select",
                options: [{ value: "warm", label: "%viz.palette.warm%" }],
              },
              required: false,
            },
            {
              key: "showTotals",
              label: "%viz.showTotals%",
              control: { kind: "switch" },
              required: false,
            },
            {
              key: "window",
              label: "%viz.window%",
              control: {
                kind: "number",
                min: 1,
                max: 30,
                unit: "%viz.window.unit%",
              },
              required: false,
            },
            {
              key: "note",
              label: "%viz.note%",
              control: { kind: "text", placeholder: "%viz.note.placeholder%" },
              required: false,
            },
            {
              key: "barColor",
              label: "%viz.barColor%",
              control: { kind: "color" },
              required: false,
            },
          ],
        },
      ],
    },
  },
  strings: {
    en: {
      "viz.title": "Epicurve",
      "viz.dateColumn": "Date column",
      "viz.interval": "Interval",
      "viz.interval.day": "Day",
      "viz.interval.month": "Month",
      "viz.palette": "Palette",
      "viz.palette.warm": "Warm",
      "viz.showTotals": "Show totals",
      "viz.window": "Window",
      "viz.window.unit": "days",
      "viz.note": "Note",
      "viz.note.placeholder": "Add a note",
      "viz.barColor": "Bar color",
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

function _renderForm(
  config: AvaVizConfig.Plugin = CONFIG,
): ReturnType<typeof vi.fn> {
  const onConfigChange = vi.fn();
  render(
    <PluginVizSettingsForm
      fields={FIELDS}
      config={config}
      onConfigChange={onConfigChange}
    />,
    { wrapper: QueryWrapper },
  );
  return onConfigChange;
}

describe("PluginVizSettingsForm", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [
      {
        id: EPIDEMIOLOGY_ID,
        loadManifest: () => {
          return Promise.resolve(MANIFEST_MODULE);
        },
      },
    ];
  });

  it("labels a column picker with the setting's localized label", async () => {
    _renderForm();

    expect(
      await screen.findByRole("combobox", { name: "Date column" }),
    ).toBeInTheDocument();
  });

  it("lists only temporal columns in a temporal column picker", async () => {
    _renderForm();

    // Mantine mounts a select's options only once its dropdown opens.
    fireEvent.click(
      await screen.findByRole("combobox", { name: "Date column" }),
    );

    expect(
      screen.getByRole("option", { name: "onset", hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "cases", hidden: true }),
    ).toBeNull();
  });

  it("writes a picked column to columnSettings by its column ID", async () => {
    const onConfigChange = _renderForm();
    await screen.findByRole("combobox", { name: "Date column" });

    pickMantineSelectOption("Date column", "onset");

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      columnSettings: { dateColumn: ONSET_ID },
    });
  });

  it("shows a segmented control's localized option labels", async () => {
    _renderForm();

    expect(
      await screen.findByRole("radio", { name: "Month" }),
    ).toBeInTheDocument();
  });

  it("writes a segmented choice to settings", async () => {
    const onConfigChange = _renderForm();

    fireEvent.click(await screen.findByRole("radio", { name: "Month" }));

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      settings: { ...CONFIG.settings, interval: "month" },
    });
  });

  it("lists a select's localized option labels", async () => {
    _renderForm();

    fireEvent.click(await screen.findByRole("combobox", { name: "Palette" }));

    expect(
      screen.getByRole("option", { name: "Warm", hidden: true }),
    ).toBeInTheDocument();
  });

  it("writes a switch toggle to settings", async () => {
    const onConfigChange = _renderForm();

    fireEvent.click(await screen.findByRole("switch", { name: "Show totals" }));

    expect(onConfigChange).toHaveBeenCalledWith({
      ...CONFIG,
      settings: { ...CONFIG.settings, showTotals: true },
    });
  });

  it("shows a number input's value with its localized unit", async () => {
    _renderForm();

    expect(await screen.findByLabelText("Window")).toHaveValue("7 days");
  });

  it("shows a text input's localized placeholder", async () => {
    _renderForm();

    expect(
      await screen.findByPlaceholderText("Add a note"),
    ).toBeInTheDocument();
  });

  it("labels a color input with the setting's localized label", async () => {
    _renderForm();

    expect(await screen.findByLabelText("Bar color")).toBeInTheDocument();
  });

  it("says the settings are unavailable when the plugin is not bundled", async () => {
    _renderForm({ ...CONFIG, pluginId: "avandar.removed" });

    expect(
      await screen.findByText(
        "The plugin behind this chart is not available, so its settings cannot be shown.",
      ),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm"`.

- [ ] **Step 3: Implement the setting helpers**

```ts
// src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers.ts
import { match } from "ts-pattern";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PluginVizSettingValue } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type {
  ControlSpec,
  SelectOption,
} from "$/models/vizs/VizSettingDescriptors.types";
import type {
  PluginVizSetting,
  PluginVizSettingControl,
} from "@avandar/plugin-manifest/runtime";

/**
 * A control's new value for one plugin chart setting, and the config and
 * columns it applies to.
 */
type SettingValueChange = {
  config: AvaVizConfig.Plugin;
  setting: PluginVizSetting;
  value: unknown;
  fields: readonly QueryResult.ColumnWithId[];
};

function _localizeOptions(options: {
  choices: ReadonlyArray<Readonly<{ value: string; label: string }>>;
  localize: (value: string) => string;
}): SelectOption[] {
  return options.choices.map((choice) => {
    return { value: choice.value, label: options.localize(choice.label) };
  });
}

function _localizeOptional(options: {
  value: string | undefined;
  localize: (value: string) => string;
}): string | undefined {
  return options.value === undefined
    ? undefined
    : options.localize(options.value);
}

function _getSettingValueFromControlValue(
  value: unknown,
): PluginVizSettingValue | undefined {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

/**
 * Makes the `ControlSpec` the shared `Control` draws for a plugin chart
 * setting, with its manifest strings (option labels, a number's unit, a text
 * input's placeholder) passed through `localize`. A column picker keeps its
 * data type filter.
 */
export function makeControlSpecFromPluginVizSetting(options: {
  setting: PluginVizSetting;
  localize: (value: string) => string;
}): ControlSpec {
  const { setting, localize } = options;
  return match<PluginVizSettingControl, ControlSpec>(setting.control)
    .with({ kind: "select" }, (control) => {
      return {
        kind: "select",
        options: _localizeOptions({ choices: control.options, localize }),
      };
    })
    .with({ kind: "segmented" }, (control) => {
      return {
        kind: "segmented",
        options: _localizeOptions({ choices: control.options, localize }),
      };
    })
    .with({ kind: "number" }, (control) => {
      return {
        ...control,
        unit: _localizeOptional({ value: control.unit, localize }),
      };
    })
    .with({ kind: "text" }, (control) => {
      return {
        kind: "text",
        placeholder: _localizeOptional({
          value: control.placeholder,
          localize,
        }),
      };
    })
    .with(
      { kind: "columnPicker" },
      { kind: "switch" },
      { kind: "color" },
      (control) => {
        return control;
      },
    )
    .exhaustive();
}

/**
 * Makes the plugin chart config that results from a control's new value for
 * one setting. A column picker's value is a column ID, stored in
 * `columnSettings` when it names one of `fields`. Every other setting's value
 * is stored in `settings`. A cleared control stores undefined.
 */
export function makePluginVizConfigFromSettingValue(
  options: Readonly<SettingValueChange>,
): AvaVizConfig.Plugin {
  const { config, setting, value, fields } = options;
  if (setting.control.kind === "columnPicker") {
    const column = fields.find((field) => {
      return field.id === value;
    });
    return {
      ...config,
      columnSettings: { ...config.columnSettings, [setting.key]: column?.id },
    };
  }
  return {
    ...config,
    settings: {
      ...config.settings,
      [setting.key]: _getSettingValueFromControlValue(value),
    },
  };
}
```

- [ ] **Step 4: Implement the controls and the form**

```tsx
// src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls.tsx
import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import {
  makeControlSpecFromPluginVizSetting,
  makePluginVizConfigFromSettingValue,
} from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSetting } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;

  /** The plugin's manifest module, whose strings hold the settings' text. */
  manifestModule: PluginManifestModule;
  settings: readonly PluginVizSetting[];
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;
};

/**
 * One `Control` per setting a plugin chart's manifest declares, in
 * declaration order, with labels and option labels in the current language.
 * `PluginVizSettingsForm` renders it as its only group.
 */
export function PluginVizSettingControls({
  fields,
  config,
  manifestModule,
  settings,
  onConfigChange,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  return (
    <Stack gap="xs">
      {settings.map((setting) => {
        const isColumnSetting = setting.control.kind === "columnPicker";
        return (
          <Control
            key={setting.key}
            label={localize(setting.label)}
            spec={makeControlSpecFromPluginVizSetting({ setting, localize })}
            value={
              isColumnSetting
                ? config.columnSettings[setting.key]
                : config.settings[setting.key]
            }
            fields={fields}
            onChange={(nextValue) => {
              onConfigChange(
                makePluginVizConfigFromSettingValue({
                  config,
                  setting,
                  value: nextValue,
                  fields,
                }),
              );
            }}
          />
        );
      })}
    </Stack>
  );
}
```

```tsx
// src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;

  /** How the setting group is arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
 * The settings form of a plugin chart, drawn from the settings its plugin's
 * manifest declares, in declaration order, in one group. It loads the
 * manifest but never the plugin's code. Column settings are stored by column
 * ID in `columnSettings`, and every other setting in `settings`.
 * `VizSettingsFormBody` renders it for plugin charts.
 */
export function PluginVizSettingsForm({
  fields,
  config,
  onConfigChange,
  layout = "stacked",
}: Props): ReactNode {
  const { t } = useLingui();
  const lookup = usePluginVizType(config);
  if (lookup.status === "loading") {
    return (
      <Loader size="sm" role="status" aria-label={t`Loading chart settings`} />
    );
  }
  if (lookup.status === "missing") {
    return (
      <Text size="sm" c="dimmed">
        <Trans>
          The plugin behind this chart is not available, so its settings cannot
          be shown.
        </Trans>
      </Text>
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
              manifestModule={lookup.manifestModule}
              settings={lookup.vizType.settings}
              onConfigChange={onConfigChange}
            />
          ),
        },
      ]}
    />
  );
}
```

- [ ] **Step 5: Run the form tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx`
Expected: PASS (11 tests).

- [ ] **Step 6: Write the failing `VizSettingsFormBody` tests**

In `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx`:

1. Add this mock after the imports (Task 8 added no test for the `null` plugin branch, so nothing is removed):

```tsx
vi.mock(
  "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm",
  () => {
    return {
      PluginVizSettingsForm: (props: {
        config: { pluginVizId: string };
        onConfigChange: (nextConfig: unknown) => void;
      }) => {
        return (
          <div
            data-testid="plugin-viz-settings-form"
            data-viz-id={props.config.pluginVizId}
          >
            <button
              type="button"
              onClick={() => {
                props.onConfigChange({
                  ...props.config,
                  settings: { interval: "month" },
                });
              }}
            >
              Change interval
            </button>
          </div>
        );
      },
    };
  },
);
```

2. Add this block at the end of the file:

```tsx
describe("VizSettingsFormBody: plugin chart", () => {
  const baseConfig: AvaVizConfig = {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: {},
    settings: {},
  };

  it("renders the plugin settings form for a plugin chart", () => {
    renderForm({ vizConfig: baseConfig });

    expect(screen.getByTestId("plugin-viz-settings-form")).toHaveAttribute(
      "data-viz-id",
      "epicurve",
    );
  });

  it("passes plugin settings edits to onVizConfigChange", () => {
    const { onVizConfigChange } = renderForm({ vizConfig: baseConfig });

    fireEvent.click(screen.getByRole("button", { name: "Change interval" }));

    expect(onVizConfigChange).toHaveBeenCalledWith({
      ...baseConfig,
      settings: { interval: "month" },
    });
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx`
Expected: FAIL, both plugin chart tests, because the plugin arm still returns `null`: "renders the plugin settings form for a plugin chart" with `Unable to find an element by: [data-testid="plugin-viz-settings-form"]`, and "passes plugin settings edits to onVizConfigChange" with `Unable to find an accessible element with the role "button" and name "Change interval"`. The other 16 pass.

- [ ] **Step 8: Render the form in the plugin arm**

In `src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx`:

1. Add the import after the `PieChartForm` import:

```tsx
import { PluginVizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm";
```

2. Replace the plugin arm Task 8 added (lines 140-142):

```tsx
    .with({ vizType: "plugin" }, () => {
      return null;
    })
```

with:

```tsx
    .with({ vizType: "plugin" }, (config) => {
      return (
        <PluginVizSettingsForm
          fields={columns}
          config={config}
          layout={layout}
          onConfigChange={onVizConfigChange}
        />
      );
    })
```

3. In the component docstring, replace line 37:

```tsx
 * Table and plugin configs render no subform.
```

with:

```tsx
 * Plugin charts use `PluginVizSettingsForm`, drawn from their manifest.
 * Table configs render no subform.
```

- [ ] **Step 9: Run the form tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm`
Expected: PASS (every test in the folder, including the 2 plugin chart tests and the 11 `PluginVizSettingsForm` tests).

- [ ] **Step 10: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint src/components/VisualizationContainer/VizSettingsForm`
Expected: exit 0, no ESLint errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.tsx \
  src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls.tsx \
  src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers.ts \
  src/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm.test.tsx \
  src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.tsx \
  src/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): draw plugin chart settings forms from the manifest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 16: Bundle check: lazy runtime exemption and budget re-measure

**Files:**
- Modify: `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts` (lazy runtime markers; whole file shown)
- Test: `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts` (computed budget messages, four new tests)

**Context:** This task implements contract C8. The bundle check today exempts chunks reachable only through the command runner's chunk. The plugin chart runtime (Task 13) is the second lazily loaded runtime, so the single `RUNNER_MODULE_SUFFIX` becomes `LAZY_RUNTIME_MODULE_MARKERS`, and a chunk reachable only through either runtime's chunk is exempt. Three existing tests hard-code the budget-exceeded byte count (28300, 29300); they are rewritten to compute it from `HOST_BUDGET_BYTES` so the budget step below needs no test edits. Then `pnpm check:plugin-bundle` re-measures the host now that the renderer (Tasks 11, 14) ships in the Data Explorer and dashboard chunks, and `HOST_BUDGET_BYTES` is raised only if the check fails, to the measured size rounded up to the next 1,000 bytes plus 2,000. Run this task after Tasks 11 to 15 are committed.

- [ ] **Step 1: Write the failing tests**

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`:

1. Add this constant after `SDK_MODULE`:

```ts
const VIZ_RUNTIME_MODULE =
  "/repo/src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx";
```

2. In `"counts host modules in a lazily loaded route chunk"` and `"counts a chunk the command runner shares with a route"`, replace:

```ts
    expect(violations).toEqual([
      expect.stringMatching(/plugin host adds 28300 bytes/),
    ]);
```

with:

```ts
    expect(violations).toEqual([
      expect.stringMatching(
        `plugin host adds ${HOST_BUDGET_BYTES + 4_300} bytes`,
      ),
    ]);
```

3. In `"counts the command runner when the entry imports it statically"`, replace:

```ts
    expect(violations).toEqual([
      expect.stringMatching(/plugin host adds 29300 bytes/),
    ]);
```

with:

```ts
    expect(violations).toEqual([
      expect.stringMatching(
        `plugin host adds ${HOST_BUDGET_BYTES + 5_300} bytes`,
      ),
    ]);
```

4. Add these tests inside `describe("checkPluginBundle", ...)`, after `"leaves chunks only plugin code loads out of the host budget"`:

```ts
  it("leaves the lazily loaded plugin chart runtime out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js"],
          dynamicImports: ["viz-runtime.js"],
        }),
        _chunk({
          fileName: "viz-runtime.js",
          imports: ["sdk.js", "viz-runtime-only.js"],
          moduleLengths: { [VIZ_RUNTIME_MODULE]: HOST_BUDGET_BYTES },
        }),
        _chunk({
          fileName: "viz-runtime-only.js",
          moduleLengths: {
            "/repo/src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx":
              HOST_BUDGET_BYTES,
          },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });

  it("counts the plugin chart runtime when a route imports it statically", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js", "viz-runtime.js"],
        }),
        _chunk({
          fileName: "viz-runtime.js",
          imports: ["sdk.js"],
          moduleLengths: { [VIZ_RUNTIME_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(
        `plugin host adds ${HOST_BUDGET_BYTES + 5_300} bytes`,
      ),
    ]);
  });

  it("counts a chunk the plugin chart runtime shares with a route", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js", "viz-shared.js"],
          dynamicImports: ["viz-runtime.js"],
        }),
        _chunk({
          fileName: "viz-runtime.js",
          imports: ["sdk.js", "viz-shared.js"],
          moduleLengths: { [VIZ_RUNTIME_MODULE]: 6_000 },
        }),
        _chunk({
          fileName: "viz-shared.js",
          moduleLengths: { [PLUGIN_HOST_MODULE]: HOST_BUDGET_BYTES },
        }),
      ]),
    );

    expect(violations).toEqual([
      expect.stringMatching(
        `plugin host adds ${HOST_BUDGET_BYTES + 4_300} bytes`,
      ),
    ]);
  });

  it("leaves a chunk only the command runner and the chart runtime share out of the host budget", () => {
    const violations = _checkChunks(
      _makeCorrectChunks([
        _chunk({
          fileName: "explorer.js",
          imports: ["index.js"],
          dynamicImports: ["viz-runtime.js"],
        }),
        _chunk({
          fileName: "viz-runtime.js",
          imports: ["sdk.js", "runtime-shared.js"],
          moduleLengths: { [VIZ_RUNTIME_MODULE]: 6_000 },
        }),
        _chunk({
          fileName: "runner.js",
          imports: ["sdk.js", "runtime-shared.js"],
          moduleLengths: { [RUNNER_MODULE]: 6_000 },
        }),
        _chunk({
          fileName: "runtime-shared.js",
          moduleLengths: {
            "/repo/packages/web/plugin-sdk/makePluginTranslator.ts":
              HOST_BUDGET_BYTES,
          },
        }),
      ]),
    );

    expect(violations).toEqual([]);
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`
Expected: FAIL, 3 tests. `"leaves the lazily loaded plugin chart runtime out of the host budget"` and `"leaves a chunk only the command runner and the chart runtime share out of the host budget"` each receive a `The plugin host adds ... bytes` violation instead of `[]`. `"counts a chunk the plugin chart runtime shares with a route"` reports 6,000 bytes more than expected, because the chart runtime's own chunk is still counted. The other 18 pass.

- [ ] **Step 3: Exempt both lazy runtimes**

Replace the whole of `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts` with:

```ts
import { relative } from "node:path";
import {
  PLUGIN_INDEX_MODULE_ID,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "../pluginModuleIds";
import type { Rollup } from "vite";

/** The parts of a Rollup output chunk the bundle check reads. */
export type ChunkSummary = Readonly<{
  fileName: string;
  isEntry: boolean;
  imports: readonly string[];
  dynamicImports: readonly string[];
  moduleLengths: Readonly<Record<string, number>>;
}>;

/** Rendered bytes of host code a workspace without plugins may load. */
export const HOST_BUDGET_BYTES = 24_000;

/** Rendered bytes each bundled plugin adds to `HOST_BUDGET_BYTES`. */
export const PER_PLUGIN_BUDGET_BYTES = 600;

/**
 * Module id fragments that mark plugin host code: the host itself, the
 * manifest package it reads, the SDK it imports for the API factory, and the
 * virtual plugin index.
 */
const HOST_MODULE_MARKERS = [
  "/src/lib/plugins/",
  "/packages/shared/plugin-manifest/",
  "/packages/web/plugin-sdk/",
  `\0${PLUGIN_INDEX_MODULE_ID}`,
];

/**
 * The modules the lazily loaded plugin runtimes are found by: the command
 * runner, which loads when a user picks a command, and the plugin chart
 * runtime, which loads when a plugin chart draws. The app reaches each only
 * through a dynamic `import()`.
 */
const LAZY_RUNTIME_MODULE_MARKERS = [
  "/src/lib/plugins/runPluginCommand/runPluginCommand.ts",
  "/src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx",
];

/**
 * The chunks of a bundle by file name, plus the chunks the check starts its
 * walks from: the entries, the chunk holding the plugin index, and the
 * chunks holding the lazy runtimes.
 */
type ChunkGraph = Readonly<{
  chunksByFileName: ReadonlyMap<string, ChunkSummary>;
  entryFileNames: readonly string[];
  indexChunk: ChunkSummary | undefined;
  lazyRuntimeFileNames: ReadonlySet<string>;
}>;

function _findChunkWithModule(options: {
  chunks: readonly ChunkSummary[];
  isModule: (moduleId: string) => boolean;
}): ChunkSummary | undefined {
  return options.chunks.find((chunk) => {
    return Object.keys(chunk.moduleLengths).some(options.isModule);
  });
}

function _getLazyRuntimeFileNames(
  chunks: readonly ChunkSummary[],
): Set<string> {
  return new Set(
    LAZY_RUNTIME_MODULE_MARKERS.flatMap((marker) => {
      const chunk = _findChunkWithModule({
        chunks,
        isModule: (moduleId) => {
          return moduleId.endsWith(marker);
        },
      });
      return chunk === undefined ? [] : [chunk.fileName];
    }),
  );
}

function _makeChunkGraphFromChunks(
  chunks: readonly ChunkSummary[],
): ChunkGraph {
  return {
    chunksByFileName: new Map(
      chunks.map((chunk) => {
        return [chunk.fileName, chunk] as const;
      }),
    ),
    entryFileNames: chunks
      .filter((chunk) => {
        return chunk.isEntry;
      })
      .map((chunk) => {
        return chunk.fileName;
      }),
    indexChunk: _findChunkWithModule({
      chunks,
      isModule: (moduleId) => {
        return moduleId === `\0${PLUGIN_INDEX_MODULE_ID}`;
      },
    }),
    lazyRuntimeFileNames: _getLazyRuntimeFileNames(chunks),
  };
}

function _getReachableFileNames(options: {
  graph: ChunkGraph;
  startFileNames: readonly string[];
  getEdges: (chunk: ChunkSummary) => readonly string[];
}): Set<string> {
  const { graph, startFileNames, getEdges } = options;
  const reachable = new Set<string>();
  const visit = (fileName: string): void => {
    const chunk = graph.chunksByFileName.get(fileName);
    if (chunk === undefined || reachable.has(fileName)) {
      return;
    }
    reachable.add(fileName);
    getEdges(chunk).forEach(visit);
  };
  startFileNames.forEach(visit);
  return reachable;
}

/**
 * The imports the app follows from a chunk without running a plugin loader:
 * all of them except the dynamic imports of the plugin index's chunk, and
 * except dynamic imports of `skippedFileNames` when given.
 */
function _getHostEdges(options: {
  chunk: ChunkSummary;
  graph: ChunkGraph;
  skippedFileNames?: ReadonlySet<string>;
}): readonly string[] {
  const { chunk, graph, skippedFileNames } = options;
  if (chunk === graph.indexChunk) {
    return chunk.imports;
  }
  return [
    ...chunk.imports,
    ...chunk.dynamicImports.filter((fileName) => {
      return !skippedFileNames?.has(fileName);
    }),
  ];
}

function _getFileNamesNotIn(options: {
  fileNames: ReadonlySet<string>;
  excludedFileNames: ReadonlySet<string>;
}): Set<string> {
  return new Set(
    [...options.fileNames].filter((fileName) => {
      return !options.excludedFileNames.has(fileName);
    }),
  );
}

/**
 * Plugin-only chunks: those reachable from the plugin loaders (the dynamic
 * imports of the chunk holding the plugin index), through static or dynamic
 * imports, that the app cannot reach from an entry through `_getHostEdges`.
 * The app loads them only after a plugin loader runs.
 */
function _getPluginOnlyFileNames(graph: ChunkGraph): Set<string> {
  // Rollup can merge the index into a chunk shared with other modules. Every
  // dynamic import of that chunk then counts as a plugin loader.
  return _getFileNamesNotIn({
    fileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.indexChunk?.dynamicImports ?? [],
      getEdges: (chunk) => {
        return [...chunk.imports, ...chunk.dynamicImports];
      },
    }),
    excludedFileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.entryFileNames,
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph });
      },
    }),
  });
}

/**
 * Lazy-runtime-only chunks: those reachable from a lazy runtime's chunk that
 * the app cannot reach from an entry without dynamically importing one of
 * those chunks. A runtime chunk that any reachable chunk imports statically
 * is not lazy, so it and the chunks it reaches count.
 */
function _getLazyRuntimeOnlyFileNames(graph: ChunkGraph): Set<string> {
  return _getFileNamesNotIn({
    fileNames: _getReachableFileNames({
      graph,
      startFileNames: [...graph.lazyRuntimeFileNames],
      getEdges: (chunk) => {
        return _getHostEdges({ chunk, graph });
      },
    }),
    excludedFileNames: _getReachableFileNames({
      graph,
      startFileNames: graph.entryFileNames,
      getEdges: (chunk) => {
        return _getHostEdges({
          chunk,
          graph,
          skippedFileNames: graph.lazyRuntimeFileNames,
        });
      },
    }),
  });
}

function _isLazyPluginModule(
  moduleId: string,
  pluginsDirectory: string,
): boolean {
  return (
    moduleId.startsWith(`${pluginsDirectory}/`) ||
    moduleId.startsWith(`\0${PLUGIN_MANIFEST_MODULE_PREFIX}`) ||
    moduleId.startsWith(`\0${PLUGIN_LOCALES_MODULE_PREFIX}`)
  );
}

function _isHostModule(moduleId: string): boolean {
  return HOST_MODULE_MARKERS.some((marker) => {
    return moduleId.includes(marker);
  });
}

function _makeDisplayIdFromModuleId(options: {
  moduleId: string;
  pluginsDirectory: string;
}): string {
  const { moduleId, pluginsDirectory } = options;
  if (moduleId.startsWith("\0")) {
    return moduleId.slice(1);
  }
  return `plugins/${relative(pluginsDirectory, moduleId)}`;
}

function _getHostBytesFromChunks(chunks: readonly ChunkSummary[]): number {
  return chunks
    .flatMap((chunk) => {
      return Object.entries(chunk.moduleLengths);
    })
    .reduce((totalBytes, [moduleId, length]) => {
      return _isHostModule(moduleId) ? totalBytes + length : totalBytes;
    }, 0);
}

/** Summarizes a Rollup bundle for `checkPluginBundle`. */
export function makeChunkSummariesFromBundle(
  bundle: Rollup.OutputBundle,
): ChunkSummary[] {
  return Object.values(bundle).flatMap((output) => {
    if (output.type !== "chunk") {
      return [];
    }
    const moduleLengths = Object.fromEntries(
      Object.entries(output.modules).map(([moduleId, info]) => {
        return [moduleId, info.renderedLength];
      }),
    );
    return [
      {
        fileName: output.fileName,
        isEntry: output.isEntry,
        imports: output.imports,
        dynamicImports: output.dynamicImports,
        moduleLengths,
      },
    ];
  });
}

/**
 * Checks that workspaces without plugins pay nothing for them. Every plugin
 * code, manifest, or locale module must sit in a plugin-only chunk: one the
 * app loads only through a plugin loader in `virtual:ava-plugin-index`. The
 * host modules in every other chunk, except those only a lazily loaded
 * runtime (the command runner or the plugin chart runtime) reaches, must
 * stay within the host's byte budget. Returns one message per violation, for
 * `vitePluginAvaPlugins` to fail the build.
 *
 * `pluginsDirectory` must be a real, forward-slash absolute path without a
 * trailing slash, because Vite module ids are realpathed.
 */
export function checkPluginBundle(options: {
  chunks: readonly ChunkSummary[];
  pluginsDirectory: string;
  pluginCount: number;
}): string[] {
  const { chunks, pluginsDirectory, pluginCount } = options;
  const graph = _makeChunkGraphFromChunks(chunks);
  const pluginOnlyFileNames = _getPluginOnlyFileNames(graph);
  const lazyRuntimeOnlyFileNames = _getLazyRuntimeOnlyFileNames(graph);
  const appChunks = chunks.filter((chunk) => {
    return !pluginOnlyFileNames.has(chunk.fileName);
  });
  const pluginViolations = appChunks.flatMap((chunk) => {
    return Object.keys(chunk.moduleLengths)
      .filter((moduleId) => {
        return _isLazyPluginModule(moduleId, pluginsDirectory);
      })
      .map((moduleId) => {
        const displayId = _makeDisplayIdFromModuleId({
          moduleId,
          pluginsDirectory,
        });
        return `${displayId} is in ${chunk.fileName}, which the app can load without any plugin. Plugin code must load only through loadManifest() and loadCode().`;
      });
  });
  const hostBytes = _getHostBytesFromChunks(
    appChunks.filter((chunk) => {
      return !lazyRuntimeOnlyFileNames.has(chunk.fileName);
    }),
  );
  const budgetBytes = HOST_BUDGET_BYTES + PER_PLUGIN_BUDGET_BYTES * pluginCount;
  return hostBytes > budgetBytes
    ? [
        ...pluginViolations,
        `The plugin host adds ${hostBytes} bytes to chunks the app can load without any plugin, over its ${budgetBytes} byte budget.`,
      ]
    : pluginViolations;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts`
Expected: PASS (21 tests).

- [ ] **Step 5: Type-check and lint the touched area**

Run: `pnpm exec tsc -b --noEmit && pnpm exec eslint scripts/vite-plugin-ava-plugins/checkPluginBundle`
Expected: exit 0, no ESLint errors.

- [ ] **Step 6: Commit the exemption**

```bash
git add scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts \
  scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): exempt the lazy plugin chart runtime from the host budget

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: Confirm no host module outside the runtime imports the SDK runtime**

A static SDK runtime import from host code would land the SDK and Lingui's message compiler in the measured chunks and inflate the number the next step reads.

Run: `rg -U -l 'import \{[^}]*\} from "@avandar/plugin-sdk"' src/lib/plugins/vizs src/components/VisualizationContainer -g '!*.test.*'`
(The pattern matches value imports, single-line or multi-line, and skips `import type`.)
Expected: exactly `src/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime.tsx` and `src/lib/plugins/vizs/PluginVizRuntime/PluginVizComponentView.tsx`. Any other file listed must switch its import to `import type` before continuing.

- [ ] **Step 8: Measure the host with the renderer in place**

Run: `pnpm check:plugin-bundle` (a full `vite build`, about a minute)

In a scratch copy with Tasks 1, 3, 4, and 6 to 15 applied, this exited 1 with a measured host size of 35,156 bytes. The SDK runtime and the chart runtime chunk were not counted. The new modules counted are the renderer files, `usePluginVizType`, `loadPluginVizRuntime`, and `PluginVizPlaceholder`. Expect a number near that.

Read the result:

- **Exit 0**: the host still fits its budget. Leave `HOST_BUDGET_BYTES` unchanged, skip Steps 9 to 11, and record in the PR description that the re-measure passed at the current budget.
- **Exit non-zero with a budget line**: the output contains `Plugin bundle check failed:` followed by a line of the form
  `The plugin host adds 35156 bytes to chunks the app can load without any plugin, over its 24600 byte budget.`
  The first number (`35156` in this example) is the measured host size. Continue with Step 9.
- **Exit non-zero with a line ending `Plugin code must load only through loadManifest() and loadCode().`**: a plugin module leaked into an app chunk. Do not change the budget. Find the static import of a plugin module the line names and make it go through the plugin index, then run this step again.

- [ ] **Step 9: Compute the new budget**

The rule (contract C8): the measured size rounded up to the next 1,000 bytes, plus 2,000. With the measured value in place of `35156`:

Run: `node -e 'const measured = 35156; console.log(Math.ceil(measured / 1000) * 1000 + 2000)'`
Expected: one number (`38000` for the example value).

- [ ] **Step 10: Raise `HOST_BUDGET_BYTES`**

In `scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts`, replace:

```ts
/** Rendered bytes of host code a workspace without plugins may load. */
export const HOST_BUDGET_BYTES = 24_000;
```

with the following, putting the measured size from Step 8 in the comment and the number from Step 9 in the constant (shown with the example values):

```ts
/**
 * Rendered bytes of host code a workspace without plugins may load. Measured
 * at 35,156 bytes with plugin charts drawing in the Data Explorer and on
 * dashboards, rounded up to the next 1,000 bytes, plus 2,000 of headroom.
 */
export const HOST_BUDGET_BYTES = 38_000;
```

- [ ] **Step 11: Verify and commit the new budget**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.test.ts && pnpm check:plugin-bundle`
Expected: PASS (21 tests), then the build exits 0 with no `Plugin bundle check failed` output.

```bash
git add scripts/vite-plugin-ava-plugins/checkPluginBundle/checkPluginBundle.ts
git commit -m "$(cat <<'EOF'
chore(plugins): raise the plugin host budget for plugin charts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 17: Data Explorer state: plugin `setActiveVizType` target, `pluginVizConfigMemory`, `vc` URL validation

**Files:**
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts` (new `pluginVizConfigMemory` field after `vizConfigMemory` at line 108, and `pluginVizConfigMemory: {}` in `INITIAL_DATA_EXPLORER_STATE` after line 169)
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts` (imports at lines 1-4, two new exports appended)
- Modify: `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx` (imports at lines 1-10, Task 8's `setActiveVizType` at lines 161-205, `setColumnBindings` at lines 265-297)
- Modify: `src/views/DataExplorerApp/DataExplorerUrlState.ts` (imports at lines 1-16, two helpers above `parseUrlSearch`, the `vc` block at lines 119-125)
- Create: `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx`
- Test: `src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx` (one new `vi.mock`, two constants, one helper, two cases)

**Context:** Implements the Data Explorer half of C7 on top of Task 8's guards. Task 8 left `setActiveVizType(state, newVizType: AvaVizConfig.Type)` ignoring a bare `"plugin"`, and `restoreVizConfigFromUrl` already restores a plugin URL config with `columnSettings: {}`; this task keeps both. `setActiveVizType` now takes `AvaVizConfig.Type | AvaVizConfig.Plugin`, a superset of C7's `AvaVizConfig.BuiltInType | AvaVizConfig.Plugin`: a plugin config (built by the picker in Task 18) goes to `makeStateFromPluginVizConfig`, which uses the config remembered under its `makePluginVizMemoryKey` when one exists, and a string keeps Task 8's path, bare-`"plugin"` guard included. Keeping `AvaVizConfig.Type` in the parameter means the drawer (`DataExplorerDrawer.tsx:81`, `onVizTypeChange={dispatch.setActiveVizType}`, typed `(vizType: AvaVizConfig.Type) => void` in the rail until Task 18) and the chat caller (`applyChatModelTurnResponse.ts:169`, a `ChatDashboardVizType`) compile unchanged. Outgoing configs are filed by `makeVizConfigMemoriesFromState`: built-in configs in `vizConfigMemory` as before, plugin configs in the new `pluginVizConfigMemory`, which `setColumnBindings` remaps like `vizConfigMemory`. A `vc` param whose `vizType` is `"plugin"` must pass `UiPluginVizConfigSchema` (Task 7) or it is dropped and the Explorer opens on the table view. Relies on Tasks 7-9 (`AvaVizConfig.Plugin`; `convertVizConfig` from a plugin config returning the empty built-in config; `hydrateFromQuery`/`hydrateFromQueryResult` returning plugin configs unchanged; plugin branches in `makeFromUiVizConfig`, `toUiVizConfig`, `remapProvisionalColumnIds`) and Task 11's `makePluginVizMemoryKey` in the flat `src/lib/plugins/vizs/pluginVizOptionHelpers.ts`. There is no `DataExplorerUrlState.test.ts`, and `src/views/DataExplorerApp/` already holds `DataExplorerApp.test.tsx`, so the URL cases go in the existing URL integration test. That test renders the real `VisualizationContainer`, which after Task 14 renders `PluginVizRenderer` (it calls `useQuery`); the test mocks the renderer and already wraps a `QueryClientProvider`.

- [ ] **Step 1: Write the failing state tests**

Create `src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx`:

```tsx
/**
 * Plugin charts all share the one `"plugin"` viz type, so the Data Explorer
 * remembers their configs in a separate map keyed by plugin chart type. These
 * tests drive the real `DataExplorerStateManager` through its `Provider` and
 * `useContext`, as the built-in memory tests do, so a break in the actual
 * action wiring is caught here.
 */
import { describe, expect, it } from "vitest";
import { makePluginVizMemoryKey } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import { act, renderHook } from "@/test-utils";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResultColumnBindingRegistry } from "$/models/queries/QueryResultColumnBindings/QueryResultColumnBindings.types";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { RenderHookResult } from "@testing-library/react";
import type { ReactNode } from "react";

const PLUGIN_ID = "avandar.epidemiology";

const EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" as QueryColumn.Id },
  settings: { interval: "epiWeek" },
};

const EDITED_EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  ...EPICURVE_CONFIG,
  settings: { interval: "day" },
};

const RATE_PLOT_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "rate-plot",
  columnSettings: { rateColumn: "rate" as QueryColumn.Id },
  settings: {},
};

const BAR_CONFIG: AvaBarChartVizConfig = {
  vizType: "bar",
  xAxisKey: "onset" as QueryColumn.Id,
  series: [{ renderAs: "bar", key: "cases" as QueryColumn.Id }],
  layout: "stack",
  withLegend: false,
};

const SQL_COLUMN_ID = "sql-onset" as QueryColumn.Id;
const STRUCTURED_COLUMN_ID = "structured-onset" as QueryColumn.Id;

const PROVISIONAL_BINDINGS: QueryResultColumnBindingRegistry = {
  version: 1,
  scopeKey: "explorer",
  sqlKey: "select onset from cases",
  columns: [
    {
      id: SQL_COLUMN_ID,
      name: "onset",
      dataType: "date",
      expressionKey: "physical",
      sqlExpressionKey: "physical",
    },
  ],
};

const STRUCTURED_BINDINGS: QueryResultColumnBindingRegistry = {
  ...PROVISIONAL_BINDINGS,
  columns: [
    {
      ...PROVISIONAL_BINDINGS.columns[0]!,
      id: STRUCTURED_COLUMN_ID,
      expressionKey: "model",
    },
  ],
};

const UI_EPICURVE_CONFIG: UiVizConfig = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" },
  settings: { interval: "month" },
};

function _Wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <DataExplorerStateManager.Provider>
      {children}
    </DataExplorerStateManager.Provider>
  );
}

function _renderStateManager(): RenderHookResult<
  ReturnType<typeof DataExplorerStateManager.useContext>,
  unknown
> {
  return renderHook(
    () => {
      return DataExplorerStateManager.useContext();
    },
    { wrapper: _Wrapper },
  );
}

describe("Data Explorer plugin viz config memory", () => {
  it("activates the plugin config passed to setActiveVizType", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EPICURVE_CONFIG);
  });

  it("restores a plugin chart's edited settings after a round trip through a bar chart", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setVizConfig(EDITED_EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType("bar");
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EDITED_EPICURVE_CONFIG);
  });

  it("restores each plugin chart's own config when switching between two charts of one plugin", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setVizConfig(EDITED_EPICURVE_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(RATE_PLOT_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual(EDITED_EPICURVE_CONFIG);
  });

  it("keeps the outgoing built-in config in the viz type memory when a plugin chart is activated", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setVizConfig(BAR_CONFIG);
    });
    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfigMemory.bar).toStrictEqual(BAR_CONFIG);
  });

  it("ignores a switch to the plugin chart type already active", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setActiveVizType(EPICURVE_CONFIG);
    });
    const stateBeforeReselection = result.current[0];

    act(() => {
      result.current[1].setActiveVizType({ ...EPICURVE_CONFIG, settings: {} });
    });

    expect(result.current[0]).toBe(stateBeforeReselection);
  });

  it("remaps provisional column IDs inside a remembered plugin config", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].setColumnBindings(PROVISIONAL_BINDINGS);
    });
    act(() => {
      result.current[1].setActiveVizType({
        ...EPICURVE_CONFIG,
        columnSettings: { dateColumn: SQL_COLUMN_ID },
      });
    });
    act(() => {
      result.current[1].setActiveVizType("table");
    });
    act(() => {
      result.current[1].setColumnBindings(STRUCTURED_BINDINGS);
    });

    expect(
      result.current[0].pluginVizConfigMemory[
        makePluginVizMemoryKey(EPICURVE_CONFIG)
      ]?.columnSettings,
    ).toStrictEqual({ dateColumn: STRUCTURED_COLUMN_ID });
  });

  it("shows a plugin chart restored from the URL without column settings until a result binds it", () => {
    const { result } = _renderStateManager();

    act(() => {
      result.current[1].restoreVizConfigFromUrl(UI_EPICURVE_CONFIG);
    });

    expect(result.current[0].vizConfig).toStrictEqual({
      ...UI_EPICURVE_CONFIG,
      columnSettings: {},
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx`
Expected: FAIL (6 failed, 1 passed). Task 8's `setActiveVizType` passes the object to `convertVizConfig`, which throws `Error: Invalid viz type: [object Object]` from the outgoing type's conversion matrix. "shows a plugin chart restored from the URL without column settings until a result binds it" passes already: it pins Task 8's `restoreVizConfigFromUrl` guard.

- [ ] **Step 3: Add `pluginVizConfigMemory` to the state type**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts`, insert after line 108 (`vizConfigMemory: Partial<AvaVizConfig.Registry>;`):

```ts
  vizConfigMemory: Partial<AvaVizConfig.Registry>;

  /**
   * The last config the user saw for each plugin chart type, keyed by
   * `makePluginVizMemoryKey` (`<pluginId>/<pluginVizId>`), so switching away
   * from a plugin chart and back restores its settings.
   *
   * Kept apart from `vizConfigMemory` because every plugin config shares the
   * one `"plugin"` viz type. Written on the way out of a plugin chart type and
   * reconciled against the current result columns the same way, and
   * in-memory only.
   */
  pluginVizConfigMemory: Readonly<Record<string, AvaVizConfig.Plugin>>;
```

In `INITIAL_DATA_EXPLORER_STATE`, replace line 169 (`  vizConfigMemory: {},`) with:

```ts
  vizConfigMemory: {},
  pluginVizConfigMemory: {},
```

- [ ] **Step 4: Add the memory helpers**

In `src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts`, replace the import block (lines 1-4) with:

```ts
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { makePluginVizMemoryKey } from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { DataExplorerAppState } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
```

Append at the end of the file (after `isSameColumnSchema`):

```ts
/**
 * Returns the state's two viz config memories with its active config filed
 * under its own key: a built-in config under its viz type in
 * `vizConfigMemory`, a plugin config under its plugin memory key in
 * `pluginVizConfigMemory`. Called by `setActiveVizType` and
 * `makeStateFromPluginVizConfig` on the way out of the active chart type, so
 * switching back restores that config.
 */
export function makeVizConfigMemoriesFromState(
  state: Readonly<DataExplorerAppState>,
): Pick<DataExplorerAppState, "vizConfigMemory" | "pluginVizConfigMemory"> {
  const { vizConfig, vizConfigMemory, pluginVizConfigMemory } = state;
  if (vizConfig.vizType === "plugin") {
    return {
      vizConfigMemory,
      pluginVizConfigMemory: {
        ...pluginVizConfigMemory,
        [makePluginVizMemoryKey(vizConfig)]: vizConfig,
      },
    };
  }
  // TypeScript widens the computed union key to `string` and so cannot see
  // that `vizConfig` lands under its own `vizType`. The key is taken from
  // the value itself, so the correlation holds by construction.
  return {
    vizConfigMemory: {
      ...vizConfigMemory,
      [vizConfig.vizType]: vizConfig,
    } as Partial<AvaVizConfig.Registry>,
    pluginVizConfigMemory,
  };
}

/**
 * Activates a plugin chart config picked in the viz type picker, or the
 * config remembered for the same plugin chart type when there is one, and
 * files the outgoing config. Returns `state` unchanged when that plugin chart
 * type is already active. Called by `setActiveVizType` for a plugin target.
 */
export function makeStateFromPluginVizConfig(
  options: Readonly<{
    state: DataExplorerAppState;
    pluginVizConfig: AvaVizConfig.Plugin;
  }>,
): DataExplorerAppState {
  const { state, pluginVizConfig } = options;
  const memoryKey = makePluginVizMemoryKey(pluginVizConfig);
  if (
    state.vizConfig.vizType === "plugin" &&
    makePluginVizMemoryKey(state.vizConfig) === memoryKey
  ) {
    return state;
  }
  return {
    ...state,
    ...makeVizConfigMemoriesFromState(state),
    vizConfig: state.pluginVizConfigMemory[memoryKey] ?? pluginVizConfig,
    pendingUrlVizConfig: undefined,
  };
}
```

- [ ] **Step 5: Accept plugin targets in `setActiveVizType` and remap plugin memory**

In `src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx`, replace lines 1-10 with:

```tsx
import { Model } from "@avandar/models";
import { objectValuesMap, setValue } from "@avandar/utils";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import { INITIAL_DATA_EXPLORER_STATE } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
import {
  applyQueryChange,
  isSameColumnSchema,
  makeStateFromPluginVizConfig,
  makeVizConfigMemoriesFromState,
} from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers";
```

Replace Task 8's `setActiveVizType` action (lines 161-205), which reads:

```tsx
    /**
     * Activates a visualization type while preserving its most recent config.
     * Returns state with a restored or hydrated config for the selected type.
     */
    setActiveVizType: (
      state: DataExplorerAppState,
      newVizType: AvaVizConfig.Type,
    ) => {
      const { vizConfig, query, vizConfigMemory, lastResultColumns } = state;

      // A bare "plugin" type names no plugin chart type, so there is nothing
      // to activate.
      if (vizConfig.vizType === newVizType || newVizType === "plugin") {
        return state;
      }

      const rememberedVizConfig = vizConfigMemory[newVizType];
      const initialVizConfig =
        rememberedVizConfig ??
        AvaVizConfigs.convertVizConfig(vizConfig, newVizType);
      const nextVizConfig =
        lastResultColumns !== undefined
          ? AvaVizConfigs.hydrateFromQueryResult(
              initialVizConfig,
              lastResultColumns,
            )
          : rememberedVizConfig === undefined && state.isStructuredQueryInSync
            ? AvaVizConfigs.hydrateFromQuery(initialVizConfig, query)
            : initialVizConfig;

      // TypeScript widens the computed union key to `string` and so cannot see
      // that `vizConfig` lands under its own `vizType`. The key is taken from
      // the value itself, so the correlation holds by construction.
      const nextVizConfigMemory = {
        ...vizConfigMemory,
        [vizConfig.vizType]: vizConfig,
      } as Partial<AvaVizConfig.Registry>;

      return {
        ...state,
        vizConfig: nextVizConfig,
        vizConfigMemory: nextVizConfigMemory,
        pendingUrlVizConfig: undefined,
      };
    },
```

with:

```tsx
    /**
     * Activates a visualization type while preserving its most recent config.
     * A built-in type restores its remembered config or converts the active
     * one, then fills empty slots. A plugin chart config, built by the viz
     * type picker, gives way to the config remembered for its plugin chart
     * type when there is one.
     */
    setActiveVizType: (
      state: DataExplorerAppState,
      target: AvaVizConfig.Type | AvaVizConfig.Plugin,
    ): DataExplorerAppState => {
      if (typeof target !== "string") {
        return makeStateFromPluginVizConfig({ state, pluginVizConfig: target });
      }
      const { vizConfig, query, vizConfigMemory, lastResultColumns } = state;

      // A bare "plugin" type names no plugin chart type, so there is nothing
      // to activate.
      if (vizConfig.vizType === target || target === "plugin") {
        return state;
      }

      const rememberedVizConfig = vizConfigMemory[target];
      const initialVizConfig =
        rememberedVizConfig ??
        AvaVizConfigs.convertVizConfig(vizConfig, target);
      const nextVizConfig =
        lastResultColumns !== undefined
          ? AvaVizConfigs.hydrateFromQueryResult(
              initialVizConfig,
              lastResultColumns,
            )
          : rememberedVizConfig === undefined && state.isStructuredQueryInSync
            ? AvaVizConfigs.hydrateFromQuery(initialVizConfig, query)
            : initialVizConfig;

      return {
        ...state,
        ...makeVizConfigMemoriesFromState(state),
        vizConfig: nextVizConfig,
        pendingUrlVizConfig: undefined,
      };
    },
```

`restoreVizConfigFromUrl` (lines 207-224) stays as Task 8 left it.

Replace the whole `setColumnBindings` action (its doc comment through its closing `},`, lines 265-297; Task 8 did not change it) with:

```tsx
    /**
     * Stores the column bindings of the latest bound query result, which the
     * next result is bound from and "Save to dashboard" saves with the chart.
     * Chart configs on provisional SQL column IDs, remembered ones included,
     * move to the IDs these bindings give the same expressions.
     */
    setColumnBindings: (
      state: DataExplorerAppState,
      columnBindings: QueryResultColumnBindingRegistry,
    ) => {
      const previous = state.columnBindings;
      if (!previous) {
        return { ...state, columnBindings };
      }
      const vizConfig = AvaVizConfigs.remapProvisionalColumnIds({
        config: state.vizConfig,
        previous: previous,
        current: columnBindings,
      });
      const vizConfigMemory = Object.fromEntries(
        Object.entries(state.vizConfigMemory).map(([type, config]) => {
          return [
            type,
            AvaVizConfigs.remapProvisionalColumnIds({
              config: config,
              previous: previous,
              current: columnBindings,
            }),
          ];
        }),
      ) as Partial<AvaVizConfig.Registry>;
      const pluginVizConfigMemory = objectValuesMap(
        state.pluginVizConfigMemory,
        (config) => {
          const remappedConfig = AvaVizConfigs.remapProvisionalColumnIds({
            config: config,
            previous: previous,
            current: columnBindings,
          });
          // The remap keeps a config's viz type, so this only narrows the
          // result back to a plugin config.
          return remappedConfig.vizType === "plugin" ? remappedConfig : config;
        },
      );
      return {
        ...state,
        columnBindings,
        vizConfig,
        vizConfigMemory,
        pluginVizConfigMemory,
      };
    },
```

- [ ] **Step 6: Run the state tests and confirm they pass**

Run: `pnpm vitest run src/views/DataExplorerApp/DataExplorerStateManager/__tests__ src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect`
Expected: PASS (7 files, 30 tests: the 7 new plugin memory tests and the unchanged built-in memory, column identity, source identity, query trigger, reducer, and picker suites).

- [ ] **Step 7: Write the failing URL tests**

In `src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx`, add this mock directly after the `@/lib/ui/viz/LineChart/LineChart` mock (after line 158):

```tsx
vi.mock("@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer", () => {
  return {
    PluginVizRenderer: ({ vizConfig }: { vizConfig: unknown }) => {
      return (
        <output data-testid="plugin-viz">{JSON.stringify(vizConfig)}</output>
      );
    },
  };
});
```

Add these constants after `_STYLED_CHART_URL` (originally line 211):

```tsx
/** A link to an epicurve, keyed by `QueryResult` column name. */
const _PLUGIN_CHART_URL: DataExplorerUrlSearch = {
  sql: 'select "quarter", "revenue" from "sales"',
  vc: JSON.stringify({
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    columnSettings: { dateColumn: "quarter" },
    settings: { interval: "epiWeek" },
  }),
};

/** A link whose plugin chart config names no plugin. */
const _INVALID_PLUGIN_CHART_URL: DataExplorerUrlSearch = {
  sql: 'select "quarter", "revenue" from "sales"',
  vc: JSON.stringify({
    vizType: "plugin",
    pluginId: "",
    pluginVizId: "epicurve",
    columnSettings: {},
    settings: {},
  }),
};
```

Add this helper after `_getRenderedBarChart` (originally line 272):

```tsx
function _getRenderedPluginVizConfig(): unknown {
  return JSON.parse(screen.getByTestId("plugin-viz").textContent ?? "{}");
}
```

Append these cases at the end of the file:

```tsx
it("binds a plugin chart restored from the URL to the reopened result's columns", async () => {
  const session = _renderExplorerSession({
    urlSearch: _PLUGIN_CHART_URL,
    onNavigate: () => {},
  });

  await waitFor(() => {
    const quarterColumn = session.result.current[0].lastResultColumns?.find(
      (column) => {
        return column.name === "quarter";
      },
    );
    expect(_getRenderedPluginVizConfig()).toEqual({
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: quarterColumn?.id },
      settings: { interval: "epiWeek" },
    });
  });
});

it("falls back to the table view when the URL's plugin chart config is invalid", async () => {
  const session = _renderExplorerSession({
    urlSearch: _INVALID_PLUGIN_CHART_URL,
    onNavigate: () => {},
  });
  await waitFor(() => {
    expect(session.result.current[0].rawSql).toBe(
      _INVALID_PLUGIN_CHART_URL.sql,
    );
  });
  await act(async () => {});

  expect(session.result.current[0].vizConfig).toEqual({ vizType: "table" });
});
```

- [ ] **Step 8: Run them and confirm the invalid-config case fails**

Run: `pnpm vitest run src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx`
Expected: FAIL in "falls back to the table view when the URL's plugin chart config is invalid" with `expected { vizType: 'plugin', …(4) } to deeply equal { vizType: 'table' }`: `parseUrlSearch` accepts the config unchecked. The other 4 cases pass; the binding case already works through Task 8's restore guard and plugin name-to-ID branch.

- [ ] **Step 9: Validate plugin configs in `vc`**

In `src/views/DataExplorerApp/DataExplorerUrlState.ts`, replace the import block (lines 1-16) with:

```ts
import {
  isNonNullish,
  isPlainObject,
  makeObjectFromEntries,
  prop,
  propEq,
} from "@avandar/utils";
import { z } from "zod";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { UiPluginVizConfigSchema } from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { OrderByDirection } from "$/models/queries/StructuredQuery/StructuredQuery.types";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type {
  DataExplorerAppState,
  OpenDatasetInfo,
} from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types";
```

Insert these helpers directly above the `parseUrlSearch` doc comment (above line 71):

```ts
/** The value a JSON string holds, or undefined when the string is not JSON. */
function _parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * The chart config a `vc` param holds, or undefined when it is not JSON. A
 * plugin chart config must also pass `UiPluginVizConfigSchema`, since nothing
 * downstream can repair one that names no plugin chart type, so a failing one
 * is dropped and the Explorer opens on the table view.
 */
function _getUiVizConfigFromParam(vc: string): UiVizConfig | undefined {
  const parsed = _parseJson(vc);
  if (isPlainObject(parsed) && parsed["vizType"] === "plugin") {
    const pluginVizConfig = UiPluginVizConfigSchema.safeParse(parsed);
    return pluginVizConfig.success ? pluginVizConfig.data : undefined;
  }
  return parsed as UiVizConfig | undefined;
}
```

In `parseUrlSearch`, replace the `vc` block (lines 119-125), which reads:

```ts
  if (search.vc) {
    try {
      result.vizConfig = JSON.parse(search.vc) as UiVizConfig;
    } catch {
      // Ignore malformed JSON — the viz will fall back to defaults.
    }
  }
```

with:

```ts
  if (search.vc) {
    const vizConfig = _getUiVizConfigFromParam(search.vc);
    if (vizConfig) {
      result.vizConfig = vizConfig;
    }
  }
```

- [ ] **Step 10: Run the URL tests and confirm they pass**

Run: `pnpm vitest run src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx src/views/DataExplorerApp/dataExplorerUrlHydration`
Expected: PASS (5 tests in the integration file, 12 URL hydration tests).

- [ ] **Step 11: Type-check, lint, and format the touched area**

Run: `pnpm exec tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

Run: `pnpm exec eslint src/views/DataExplorerApp/DataExplorerStateManager src/views/DataExplorerApp/DataExplorerUrlState.ts src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx && pnpm exec oxfmt --ignore-path .oxfmtignore --check src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx src/views/DataExplorerApp/DataExplorerUrlState.ts src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx`
Expected: exit 0.

- [ ] **Step 12: Commit**

```bash
git add src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerAppState.types.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/dataExplorerStateHelpers.ts \
  src/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager.tsx \
  src/views/DataExplorerApp/DataExplorerStateManager/__tests__/DataExplorerStateManager.pluginVizConfigMemory.test.tsx \
  src/views/DataExplorerApp/DataExplorerUrlState.ts \
  src/views/DataExplorerApp/__tests__/explorerUrlChartRestore.integration.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): remember plugin chart configs in the Data Explorer

setActiveVizType accepts a plugin chart config, pluginVizConfigMemory
restores each plugin chart type's settings, and a plugin config in the
vc URL param must pass UiPluginVizConfigSchema.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 18: `VizTypeSelect` "Plugins" group

**Files:**
- Modify: `src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.tsx` (full rewrite: `vizConfig` and `columns` props, Plugins group, plugin config on pick)
- Modify: `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.tsx` (import after line 12, `Props` at lines 17-33, destructuring at lines 44-54, `VizTypeSelect` call at lines 85-94)
- Modify: `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx` (rail props at lines 73-83)
- Modify: `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.test.tsx` (rail props in `_renderRail`)
- Modify (outside the requested scope): `apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx` (the demo film renders `DataExplorerDrawerRail` at line 315, so its `vizType` prop at line 320 becomes `vizConfig` plus `columns`, which keeps `tsconfig.app.json` and `type-check:video-producer` compiling)
- Test: `src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.test.tsx` (full rewrite with an `ActivePluginsContext.Provider` fixture)

**Context:** Implements the picker half of C7. None of these files were changed by Tasks 6-10. The `@avandar/ui` `Select` already accepts grouped data (`SelectOptionGroup<T> = { group: string; items: ... }` in `packages/web/ui/src/inputs/Select/Select.tsx`, passed straight to Mantine, whose `OptionsDropdown` renders each group as `role="group"` labelled by its title). The picker lists the built-in types, then a "Plugins" group from `usePluginVizOptions()` (Task 11), which reads `manifestModule.manifest.id`, `manifest.contributes.vizTypes`, and `manifestModule.strings` from `ActivePluginsContext` without further filtering; the test fixture matches that shape. The selected value is the built-in viz type, or `makePluginVizOptionValue(vizConfig)` for a plugin config. Picking a plugin option builds the config with `AvaPluginVizConfigs.makeConfig` (Task 9, which writes every declared key and leaves unset ones `undefined`) from the `columns` prop and passes it to `onChange`; Task 17's `setActiveVizType` accepts it. The drawer passes its `columns` prop, the latest result's columns (`schema.columns` in `DataExplorerApp`, the same list `syncVizFromQueryResult` stores as `lastResultColumns`), which are also the columns the settings form binds controls to. An active plugin chart whose plugin is no longer active stays in the Plugins group under the translated "Plugin chart", so the picker never shows a blank type for the chart on screen. `usePluginVizOptions` never runs a query, so neither the picker nor its hosts' tests need a `QueryClientProvider`.

- [ ] **Step 1: Write the failing tests**

Replace `src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.test.tsx` with:

```tsx
/**
 * Tests for the visualization type picker: the display name of each built-in
 * type, the "Plugins" group of the workspace's active plugin chart types, and
 * what it reports back when a type is picked.
 */
import { describe, expect, it, vi } from "vitest";
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { fireEvent, render, screen, within } from "@/test-utils";
import {
  getMantineSelectDropdown,
  pickMantineSelectOption,
} from "@/test-utils/pickMantineSelectOption";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";

const PLUGIN_ID = "avandar.epidemiology";

const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: "cases" as QueryColumn.Id, name: "cases", dataType: "bigint" },
  { id: "onset" as QueryColumn.Id, name: "onset", dataType: "date" },
];

const EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: PLUGIN_ID,
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" as QueryColumn.Id },
  settings: { interval: "epiWeek" },
};

function _ChartBarIcon(): null {
  return null;
}

const EPIDEMIOLOGY_PLUGIN = {
  entry: { id: PLUGIN_ID },
  manifestModule: {
    manifest: {
      id: PLUGIN_ID,
      name: "%plugin.name%",
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [
          {
            id: "epicurve",
            title: "%viz.epicurve.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "dateColumn",
                label: "%viz.epicurve.dateColumn%",
                control: { kind: "columnPicker", dataType: "temporal" },
                required: true,
              },
              {
                key: "interval",
                label: "%viz.epicurve.interval%",
                control: {
                  kind: "select",
                  options: [
                    { value: "day", label: "%viz.epicurve.day%" },
                    { value: "epiWeek", label: "%viz.epicurve.epiWeek%" },
                  ],
                },
                required: false,
                default: "epiWeek",
              },
            ],
          },
        ],
      },
    },
    strings: {
      en: {
        "plugin.name": "Epidemiology",
        "viz.epicurve.title": "Epicurve",
        "viz.epicurve.dateColumn": "Date column",
        "viz.epicurve.interval": "Interval",
        "viz.epicurve.day": "Day",
        "viz.epicurve.epiWeek": "Epi week",
      },
    },
    icons: { "chart-bar": _ChartBarIcon },
  },
} as unknown as ActivePlugin;

function _renderPicker(
  options: {
    vizConfig?: AvaVizConfig.T;
    activePlugins?: readonly ActivePlugin[];
  } = {},
): { onChange: ReturnType<typeof vi.fn> } {
  const { vizConfig = { vizType: "table" }, activePlugins = [] } = options;
  const onChange = vi.fn();
  render(
    <ActivePluginsContext.Provider value={activePlugins}>
      <VizTypeSelect
        vizConfig={vizConfig}
        columns={COLUMNS}
        onChange={onChange}
      />
    </ActivePluginsContext.Provider>,
  );
  return { onChange };
}

function _openDropdown(): HTMLElement {
  const combobox = screen.getByRole("combobox", {
    name: /visualization type/i,
  });
  fireEvent.click(combobox);
  fireEvent.focus(combobox);
  return getMantineSelectDropdown(/Visualization Type/i);
}

describe("VizTypeSelect", () => {
  it("reports the picked visualization type", () => {
    const { onChange } = _renderPicker();

    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");

    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("shows the display name of the current type rather than its key", () => {
    _renderPicker();

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Table");
  });

  it("lists an active plugin's chart types under a Plugins group", () => {
    _renderPicker({ activePlugins: [EPIDEMIOLOGY_PLUGIN] });

    const pluginsGroup = within(_openDropdown()).getByRole("group", {
      name: "Plugins",
      hidden: true,
    });

    expect(
      within(pluginsGroup).getByRole("option", {
        name: "Epicurve",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("omits the Plugins group when no plugin is active", () => {
    _renderPicker();

    expect(
      within(_openDropdown()).queryByRole("group", {
        name: "Plugins",
        hidden: true,
      }),
    ).toBeNull();
  });

  it("reports a config built from the result's columns when a plugin chart type is picked", () => {
    const { onChange } = _renderPicker({
      activePlugins: [EPIDEMIOLOGY_PLUGIN],
    });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(onChange).toHaveBeenCalledWith({
      vizType: "plugin",
      pluginId: PLUGIN_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: "onset" },
      settings: { interval: "epiWeek" },
    });
  });

  it("shows the plugin chart's title as the current type when a plugin chart is active", () => {
    _renderPicker({
      vizConfig: EPICURVE_CONFIG,
      activePlugins: [EPIDEMIOLOGY_PLUGIN],
    });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Epicurve");
  });

  it("keeps showing an active plugin chart whose plugin is no longer active", () => {
    _renderPicker({ vizConfig: EPICURVE_CONFIG });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Plugin chart");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.test.tsx`
Expected: FAIL (5 failed, 2 passed). The current picker reads a `value` prop these renders leave unset, so the three "current type" cases fail on `toHaveValue`, and it has no Plugins group (`Unable to find an element with the role "group" and name "Plugins"`, `Could not find option "Epicurve" for combobox: /Visualization Type/i`). "reports the picked visualization type" and "omits the Plugins group when no plugin is active" pass.

- [ ] **Step 3: Implement the picker**

Replace `src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.tsx` with:

```tsx
import { Select } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { VizTypes } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import {
  getPluginVizSelectionFromOptionValue,
  makePluginVizOptionValue,
} from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import { usePluginVizOptions } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginVizOption } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { SelectData, SelectOption } from "@avandar/ui";
import type { ReactNode } from "react";

type Props = {
  /**
   * The active chart config. The selected option is its viz type, or for a
   * plugin chart its plugin chart type.
   */
  vizConfig: AvaVizConfig.T | UiVizConfig;

  /**
   * Columns of the latest query result. A picked plugin chart type fills its
   * required column settings from them.
   */
  columns: readonly QueryResult.ColumnWithId[];

  /**
   * Called with the built-in viz type the user picks, or with the config
   * built for the plugin chart type they pick.
   */
  onChange: (target: AvaVizConfig.BuiltInType | AvaVizConfig.Plugin) => void;

  /** Mantine input size. Defaults to the theme default. */
  size?: string;

  /** Renders the label above the input. Off in compact hosts like a toolbar. */
  withLabel?: boolean;

  className?: string;
};

function _getSelectedValue(
  vizConfig: Readonly<AvaVizConfig.T | UiVizConfig>,
): string {
  return vizConfig.vizType === "plugin"
    ? makePluginVizOptionValue(vizConfig)
    : vizConfig.vizType;
}

function _buildSelectData(options: {
  selectedValue: string;
  pluginVizOptions: readonly PluginVizOption[];
  pluginsGroupLabel: string;
  unlistedPluginChartLabel: string;
}): SelectData<string> {
  const {
    selectedValue,
    pluginVizOptions,
    pluginsGroupLabel,
    unlistedPluginChartLabel,
  } = options;
  const builtInOptions = VizTypes.map((vizType): SelectOption<string> => {
    return { label: vizTypeLabel(vizType), value: vizType };
  });
  const pluginOptions = pluginVizOptions.map((option): SelectOption<string> => {
    return { label: option.label, value: option.value };
  });
  // A chart whose plugin is no longer active stays listed as itself, so the
  // picker never shows a blank type for the chart on screen.
  const isUnlistedPluginChart =
    getPluginVizSelectionFromOptionValue(selectedValue) !== undefined &&
    !pluginOptions.some((option) => {
      return option.value === selectedValue;
    });
  const groupItems = isUnlistedPluginChart
    ? [
        ...pluginOptions,
        { label: unlistedPluginChartLabel, value: selectedValue },
      ]
    : pluginOptions;
  return groupItems.length === 0
    ? builtInOptions
    : [...builtInOptions, { group: pluginsGroupLabel, items: groupItems }];
}

function _buildTargetFromOptionValue(options: {
  optionValue: string | null;
  pluginVizOptions: readonly PluginVizOption[];
  columns: readonly QueryResult.ColumnWithId[];
}): AvaVizConfig.BuiltInType | AvaVizConfig.Plugin | undefined {
  const { optionValue, pluginVizOptions, columns } = options;
  const builtInVizType = VizTypes.find((vizType) => {
    return vizType === optionValue;
  });
  if (builtInVizType !== undefined) {
    return builtInVizType;
  }
  const pluginVizOption = pluginVizOptions.find((option) => {
    return option.value === optionValue;
  });
  return pluginVizOption === undefined
    ? undefined
    : AvaPluginVizConfigs.makeConfig({
        pluginId: pluginVizOption.selection.pluginId,
        pluginVizId: pluginVizOption.selection.pluginVizId,
        settings: pluginVizOption.vizType.settings,
        columns,
      });
}

/**
 * Visualization type picker: the built-in viz types, then a "Plugins" group
 * with the chart types of the workspace's active plugins. Lives outside the
 * settings subforms because the type choice reconfigures every other control,
 * so hosts place it in their own chrome, such as a drawer rail or a chart
 * block's field, rather than inside the form body.
 */
export function VizTypeSelect({
  vizConfig,
  columns,
  onChange,
  size,
  withLabel = true,
  className,
}: Props): ReactNode {
  const { t } = useLingui();
  const pluginVizOptions = usePluginVizOptions();
  const selectedValue = _getSelectedValue(vizConfig);

  return (
    <Select
      allowDeselect={false}
      data={_buildSelectData({
        selectedValue,
        pluginVizOptions,
        pluginsGroupLabel: t`Plugins`,
        unlistedPluginChartLabel: t`Plugin chart`,
      })}
      size={size}
      className={className}
      label={withLabel ? t`Visualization Type` : undefined}
      aria-label={t`Visualization Type`}
      value={selectedValue}
      onChange={(optionValue) => {
        const target = _buildTargetFromOptionValue({
          optionValue,
          pluginVizOptions,
          columns,
        });
        if (target !== undefined) {
          onChange(target);
        }
      }}
    />
  );
}
```

- [ ] **Step 4: Pass the active config and columns from the rail and drawer**

In `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.tsx`, add this import after line 12 (`import type { AvaVizConfig } ...`):

```tsx
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
```

Replace the `Props` block (lines 17-33) with:

```tsx
type Props = {
  activeTab: DrawerTab;
  isCollapsed: boolean;

  /** Id of the collapsible region the toggle reveals, for `aria-controls`. */
  regionId: string;

  queryEditorMode: QueryEditorMode;

  /** The active chart config, whose type the chart-type control shows. */
  vizConfig: AvaVizConfig.T;

  /**
   * Columns of the latest query result, which a picked plugin chart type
   * fills its required column settings from.
   */
  columns: readonly QueryResult.ColumnWithId[];

  /** False when the SQL has parts the manual form cannot represent. */
  isStructuredQueryInSync: boolean;

  onQueryEditorModeChange: (mode: QueryEditorMode) => void;

  /** Called with the picked built-in viz type or plugin chart config. */
  onVizTypeChange: (
    target: AvaVizConfig.BuiltInType | AvaVizConfig.Plugin,
  ) => void;
  onToggleCollapsed: () => void;
};
```

Replace the destructuring at lines 44-54 with:

```tsx
export function DataExplorerDrawerRail({
  activeTab,
  isCollapsed,
  regionId,
  queryEditorMode,
  vizConfig,
  columns,
  isStructuredQueryInSync,
  onQueryEditorModeChange,
  onVizTypeChange,
  onToggleCollapsed,
}: Props): ReactNode {
```

Replace the `visualizations` arm (lines 85-94) with:

```tsx
    visualizations: () => {
      return (
        <VizTypeSelect
          size="xs"
          withLabel={false}
          vizConfig={vizConfig}
          columns={columns}
          onChange={onVizTypeChange}
        />
      );
    },
```

In `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx`, replace the rail element (lines 73-83) with:

```tsx
          <DataExplorerDrawerRail
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            regionId={DRAWER_REGION_ID}
            queryEditorMode={queryEditorMode}
            vizConfig={vizConfig}
            columns={columns}
            isStructuredQueryInSync={isStructuredQueryInSync}
            onQueryEditorModeChange={setQueryEditorMode}
            onVizTypeChange={dispatch.setActiveVizType}
            onToggleCollapsed={onToggleCollapsed}
          />
```

In `src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.test.tsx`, replace the line `        vizType="bar"` in `_renderRail` with:

```tsx
        vizConfig={{ vizType: "table" }}
        columns={[]}
```

In `apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx`, replace line 320 (`                vizType={stage.isChart ? "bar" : "table"}`) with:

```tsx
                vizConfig={stage.isChart ? barConfig : { vizType: "table" }}
                columns={aggregateColumns}
```

(`barConfig` and `aggregateColumns` are already imported from `./explorerStage` at lines 40-45.)

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm vitest run src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect src/views/DataExplorerApp/DataExplorerDrawer`
Expected: PASS (3 files, 23 tests: 7 picker, 5 rail, 11 drawer).

- [ ] **Step 6: Type-check, lint, and format the touched area**

Run: `pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm type-check:video-producer`
Expected: exit 0.

Run: `pnpm exec eslint src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect src/views/DataExplorerApp/DataExplorerDrawer apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx && pnpm exec oxfmt --ignore-path .oxfmtignore --check src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.tsx src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.test.tsx src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.tsx src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.test.tsx src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.tsx \
  src/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect.test.tsx \
  src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.tsx \
  src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail.test.tsx \
  src/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.tsx \
  apps/ava-video-producer/avandar-adapter/ExplorerScreen/ExplorerScreen.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): list plugin chart types in the visualization type picker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 19: Dashboards: chart type field with plugin options

**Files:**
- Create: `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.tsx`
- Create: `src/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig.tsx`
- Create: `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx`
- Modify: `src/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring.ts` (new `replaceVizConfig` writer; whole file shown)
- Modify: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx` (imports at lines 4-9 and after 16, `vizTypeLabel` option at line 51, the `vizType` `select` at lines 71-80, field config after line 147, options entry at line 167, memo dependencies)
- Test: `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.test.ts` (two cases pinning what `resolveData` does with plugin configs)
- Test: `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx` (one case and one `vi.mock`)
- Test: `src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts` (one case)

**Context:** Implements the dashboard half of C7. **Field choice: a Puck `custom` field.** Puck 0.21's `select` field renders a native `<select>` whose selected option is `JSON.stringify({ value })` of the bound prop (`node_modules/@puckeditor/core/dist/chunk-EBISZQTK.mjs`, `SelectField`). The block stores `vizType: "plugin"` for every plugin chart, so a `select` bound to `vizType` cannot tell which plugin chart is selected; encoded option values would have to live in `vizType` itself, which contradicts the stored shape; and the native select has no option groups. The new `VizTypePField` renders Task 18's `VizTypeSelect` from the selected block's props, read through `useDataVizAuthoring` as `VizConfigPField` does. A built-in pick goes through Puck's field `onChange`, so `resolveData` converts and remembers configs exactly as before. A plugin pick writes `vizType: "plugin"` and the config `VizTypeSelect` built (from `authoring.schema` columns) in one Puck `replace` through the new `useDataVizAuthoring().replaceVizConfig`, merged over the block's bound props when its columns are known and written as given before its query has run (there are no columns to bind yet, so its column settings start `undefined`). Puck's direct `replace` dispatch skips `resolveData` (only a field `onChange` runs it), so a plugin pick builds a fresh config instead of restoring the block's memory. Task 8 already made the rest of the block plugin-safe, so this task changes none of it: `makeDataVizPBlockStateFromProps` and `synchronizeUiVizType` skip conversion when `vizType` is `"plugin"`, `_getEmptyConfigVizType` never asks for an empty plugin config, and `DataVizPBlock` draws an empty table while a plugin chart's bindings resolve. Two cases pin the `resolveData` behavior the field relies on: a plugin type and config arriving together are kept, and a later built-in pick converts a plugin config to that type's empty config. `VizConfigContent` already sends any non-table config to `VizSettingsFormBody`, whose plugin arm (Task 15) renders `PluginVizSettingsForm` with `fields`, `config`, `onConfigChange`, and `layout`; a case pins that with the form mocked (the real form calls `useQuery`, and the test already wraps a `QueryClientProvider`). `createDataVizBlock` copies `vizType` and `vizConfig` through, so a plugin chart survives "Save to dashboard" unchanged; a case pins that. `findDashboardTile` and the DataViz `Props` already compile with plugin configs after Task 8. `PluginHost`, which provides `ActivePluginsContext`, wraps the whole workspace layout in `WorkspaceLayoutContents.tsx`, so the dashboard editor's field sees the active plugins. `useDataVizAuthoring` reads `useQueryClient()`, so the field test wraps a `QueryClientProvider`.

- [ ] **Step 1: Pin how `resolveData` treats plugin configs**

In `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.test.ts`, replace the import block (lines 1-6) with:

```ts
import { describe, expect, it } from "vitest";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { makeDataVizPBlockStateFromProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { AvaBarChartVizConfig } from "$/models/vizs/AvaBarChartVizConfig/AvaBarChartVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizConfigMemory } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps";
```

Add this constant after `STYLED_BAR_CONFIG` (originally line 29):

```ts
const EPICURVE_CONFIG: AvaVizConfig.Plugin = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { dateColumn: "onset" as QueryColumn.Id },
  settings: { interval: "epiWeek" },
};
```

Append at the end of the file:

```ts
describe("makeDataVizPBlockStateFromProps plugin charts", () => {
  it("keeps a plugin chart's config when its type and config arrive together", () => {
    const actualProps = _getDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "plugin",
        vizConfig: EPICURVE_CONFIG,
      },
      changed: { vizType: true, vizConfig: true },
    });
    expect(actualProps.vizConfig).toStrictEqual(EPICURVE_CONFIG);
  });

  it("switches a plugin chart to an empty chart of the picked built-in type", () => {
    const actualProps = _getDataVizPBlockProps({
      props: {
        nlQuery: { prompt: "", rawSql: "", generations: [] },
        vizType: "bar",
        vizConfig: EPICURVE_CONFIG,
      },
      changed: { vizType: true },
    });
    expect(actualProps.vizConfig).toEqual(AvaVizConfigs.makeEmptyConfig("bar"));
  });
});
```

- [ ] **Step 2: Run them and confirm they pass**

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.test.ts`
Expected: PASS (17 tests). The two new cases pin behavior Task 8 already provides; they guard the field written below.

- [ ] **Step 3: Write the failing chart type field tests**

Create `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx`:

```tsx
/**
 * Tests for the DataViz block's chart type field: built-in picks go through
 * Puck's field change, and plugin picks write the plugin type and its config
 * to the selected block in one replace.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileQueryResultColumnBindings } from "$/models/queries/QueryResultColumnBindings/reconcileQueryResultColumnBindings/reconcileQueryResultColumnBindings";
import { ActivePluginsContext } from "@/lib/plugins/PluginHost/ActivePluginsContext";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { VizTypePField } from "@/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";

const TEST_WORKSPACE_ID =
  "00000000-0000-4000-8000-000000000001" as Workspace.Id;

const PLUGIN_ID = "avandar.epidemiology";

const editor = vi.hoisted<{
  dispatch: ReturnType<typeof vi.fn>;
  selectedItem: { type: string; props: Record<string, unknown> };
  getSelectorForId: () => { index: number; zone: undefined };
}>(() => {
  return {
    dispatch: vi.fn(),
    selectedItem: { type: "DataViz", props: {} as Record<string, unknown> },
    getSelectorForId: () => {
      return { index: 0, zone: undefined };
    },
  };
});
vi.mock("@puckeditor/core", () => {
  return {
    createUsePuck: () => {
      return (selector: (state: unknown) => unknown) => {
        return selector(editor);
      };
    },
  };
});

const bindings = vi.hoisted(() => {
  return { isQueryPending: false };
});
const schema = reconcileQueryResultColumnBindings({
  scopeKey: "viz-block",
  sqlKey: "SELECT * FROM cases",
  columns: [
    { name: "cases", dataType: "bigint" },
    { name: "onset", dataType: "date" },
  ],
  projections: [],
  previous: undefined,
});
vi.mock(
  "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizColumnBindings/useDataVizColumnBindings",
  () => {
    return {
      useDataVizColumnBindings: () => {
        return bindings.isQueryPending
          ? { status: "loading", schema: undefined, error: undefined }
          : { status: "ready", schema, error: undefined };
      },
    };
  },
);

function _ChartBarIcon(): null {
  return null;
}

const EPIDEMIOLOGY_PLUGIN = {
  entry: { id: PLUGIN_ID },
  manifestModule: {
    manifest: {
      id: PLUGIN_ID,
      name: "%plugin.name%",
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [
          {
            id: "epicurve",
            title: "%viz.epicurve.title%",
            icon: "chart-bar",
            render: "transform",
            settings: [
              {
                key: "dateColumn",
                label: "%viz.epicurve.dateColumn%",
                control: { kind: "columnPicker", dataType: "temporal" },
                required: true,
              },
              {
                key: "interval",
                label: "%viz.epicurve.interval%",
                control: {
                  kind: "select",
                  options: [
                    { value: "day", label: "%viz.epicurve.day%" },
                    { value: "epiWeek", label: "%viz.epicurve.epiWeek%" },
                  ],
                },
                required: false,
                default: "epiWeek",
              },
            ],
          },
        ],
      },
    },
    strings: {
      en: {
        "plugin.name": "Epidemiology",
        "viz.epicurve.title": "Epicurve",
        "viz.epicurve.dateColumn": "Date column",
        "viz.epicurve.interval": "Interval",
        "viz.epicurve.day": "Day",
        "viz.epicurve.epiWeek": "Epi week",
      },
    },
    icons: { "chart-bar": _ChartBarIcon },
  },
} as unknown as ActivePlugin;

function _renderField(vizConfig: AvaVizConfig.T): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  editor.selectedItem.props = {
    id: "viz-block",
    columnBindingVersion: 1,
    nlQuery: {
      prompt: "Cases by onset week",
      rawSql: "SELECT * FROM cases",
      generations: [],
    },
    vizType: vizConfig.vizType,
    vizConfig: vizConfig,
    columnBindings: schema.registry,
    localFilters: [],
    globalFilterTargets: {},
    globalFilterSubscription: { mode: "all", subscribedFilterIds: [] },
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DashboardFilterStateManager.Provider>
        <ActivePluginsContext.Provider value={[EPIDEMIOLOGY_PLUGIN]}>
          <VizTypePField
            auth={{ auth: "workspace", workspaceId: TEST_WORKSPACE_ID }}
            onChange={onChange}
          />
        </ActivePluginsContext.Provider>
      </DashboardFilterStateManager.Provider>
    </QueryClientProvider>,
  );
  return { onChange };
}

describe("VizTypePField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bindings.isQueryPending = false;
  });

  it("writes the picked plugin chart type and its config to the block", () => {
    _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "replace",
        data: expect.objectContaining({
          props: expect.objectContaining({
            vizType: "plugin",
            vizConfig: {
              vizType: "plugin",
              pluginId: PLUGIN_ID,
              pluginVizId: "epicurve",
              columnSettings: { dateColumn: schema.columns[1]!.id },
              settings: { interval: "epiWeek" },
            },
          }),
        }),
      }),
    );
  });

  it("hands a picked built-in type to Puck's field change", () => {
    const { onChange } = _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");

    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("shows the block's plugin chart type as its chart type", () => {
    _renderField({
      vizType: "plugin",
      pluginId: PLUGIN_ID,
      pluginVizId: "epicurve",
      columnSettings: { dateColumn: schema.columns[1]!.id },
      settings: { interval: "epiWeek" },
    });

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Epicurve");
  });

  it("writes a picked plugin chart to a block whose query has not run yet", () => {
    bindings.isQueryPending = true;
    _renderField({ vizType: "table" });

    pickMantineSelectOption(/Visualization Type/i, "Epicurve");

    expect(editor.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          props: expect.objectContaining({
            vizType: "plugin",
            vizConfig: expect.objectContaining({
              pluginVizId: "epicurve",
              columnSettings: {},
            }),
          }),
        }),
      }),
    );
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx`
Expected: FAIL with `Failed to resolve import "@/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField"`.

- [ ] **Step 5: Add `replaceVizConfig` to the authoring hook**

Replace `src/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring.ts` with:

```ts
import { identity } from "@avandar/utils";
import { createUsePuck } from "@puckeditor/core";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import { useDataVizRuntimeColumnBindings } from "../../pblocks/DataVizPBlock/useDataVizRuntimeColumnBindings/useDataVizRuntimeColumnBindings";
import { getDataVizAuthoringProps } from "./getDataVizAuthoringProps";
import type { Props } from "../../pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizAuthoringChange } from "./getDataVizAuthoringProps";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

const usePuckSelector = createUsePuck();

type Authoring = ReturnType<typeof useDataVizRuntimeColumnBindings> & {
  props: Props & { id: string };
  update: (
    changes: Partial<Extract<Props, { columnBindingVersion: 1 }>>,
  ) => void;
  updateColumnNameProps: (
    changes: Partial<Extract<Props, { columnBindingVersion: 0 }>>,
  ) => void;

  /**
   * Writes a chart type together with its config, such as a picked plugin
   * chart. Merged over the block's bound props once its columns are known,
   * written as given before its query has run, and skipped on a version 0
   * block whose column names do not all bind.
   */
  replaceVizConfig: (
    changes: Pick<
      Extract<Props, { columnBindingVersion: 1 }>,
      "vizType" | "vizConfig"
    >,
  ) => void;
};

function useSelectedDataVizOwner(): {
  props: Props & { id: string };
  replace: (updatedProps: Props) => void;
} {
  const editor = usePuckSelector(identity);
  const selected = editor.selectedItem;
  const props = selected?.props as Props & { id: string };
  const replace = (updatedProps: Props): void => {
    if (!selected) {
      return;
    }
    const selector = editor.getSelectorForId(props.id);
    if (!selector) {
      return;
    }
    editor.dispatch({
      type: "replace",
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...selected, props: { ...updatedProps, id: props.id } },
    });
  };
  return { props, replace };
}

/**
 * Gives a Puck field the selected DataViz block's props and column bindings,
 * and functions that write a field edit back to that block. The block is
 * rewritten only on a field edit, never on render. Use it in a field that
 * edits a chart, for example its viz settings or its local filters.
 */
export function useDataVizAuthoring(
  auth: Readonly<StructuredQueryAuth>,
): Authoring {
  const { props, replace } = useSelectedDataVizOwner();
  const { filtersById } = DashboardFilterStateManager.useState();
  const columnBindings = useDataVizRuntimeColumnBindings({
    props: props,
    auth: auth,
  });
  const update = (change: DataVizAuthoringChange): void => {
    const updated = getDataVizAuthoringProps({
      props,
      columnBindings,
      filters: Object.values(filtersById),
      change,
    });
    if (updated) {
      replace(updated);
    }
  };
  const replaceVizConfig: Authoring["replaceVizConfig"] = (changes) => {
    const boundProps = columnBindings.runtime?.props ?? props;
    if (boundProps.columnBindingVersion === 1) {
      replace({ ...props, ...boundProps, ...changes });
    }
  };
  return {
    ...columnBindings,
    props,
    update: (changes) => {
      return update({ kind: "columnId", props: changes });
    },
    updateColumnNameProps: (changes) => {
      return update({ kind: "columnName", props: changes });
    },
    replaceVizConfig,
  };
}
```

- [ ] **Step 6: Create the field and its config hook**

Create `src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.tsx`:

```tsx
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { useDataVizAuthoring } from "../useDataVizAuthoring/useDataVizAuthoring";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { ReactElement } from "react";

type Props = {
  /**
   * Authorizes the chart query whose result columns fill a picked plugin
   * chart's required column settings.
   */
  auth: StructuredQueryAuth;

  /**
   * Puck's setter for the block's `vizType` prop. A built-in type goes
   * through it so `resolveData` converts the config.
   */
  onChange: (vizType: AvaVizConfig.Type) => void;
};

/**
 * Puck custom field for a DataViz block's chart type, built from the
 * `VizTypeSelect` the Data Explorer also uses, so it lists the workspace's
 * plugin chart types beside the built-in ones. A built-in type goes through
 * Puck's field change, so `resolveData` converts the config as for any type
 * change. A plugin chart type is written with the config built for it, since
 * only this field has the plugin chart's settings. Use it as the `vizType`
 * field of a chart block, for example the dashboard's DataViz block.
 */
export function VizTypePField({
  auth,
  onChange,
}: Readonly<Props>): ReactElement {
  const authoring = useDataVizAuthoring(auth);
  return (
    <VizTypeSelect
      vizConfig={authoring.props.vizConfig}
      columns={authoring.schema?.columns ?? []}
      onChange={(target) => {
        if (typeof target === "string") {
          onChange(target);
          return;
        }
        authoring.replaceVizConfig({ vizType: "plugin", vizConfig: target });
      }}
    />
  );
}
```

Create `src/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { useCallback, useMemo } from "react";
import { VizTypePField } from "@/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { CustomField } from "@puckeditor/core";

/**
 * Builds the Puck `CustomField` config for a chart block's chart type, which
 * lists the built-in viz types and the workspace's plugin chart types. Takes
 * the chart query's auth so the field can read the result columns a picked
 * plugin chart fills its column settings from. A hook because the field
 * `label` is translated with the Lingui macro.
 */
export function useVizTypePFieldConfig(
  auth: Readonly<StructuredQueryAuth>,
): CustomField<AvaVizConfig.Type> {
  const { t } = useLingui();

  const render = useCallback(
    ({ onChange }: AvaPageFieldProps<AvaVizConfig.Type>) => {
      return <VizTypePField auth={auth} onChange={onChange} />;
    },
    [auth],
  );

  return useMemo(() => {
    return {
      label: t`Visualization Type`,
      type: "custom",
      render,
    };
  }, [t, render]);
}
```

- [ ] **Step 7: Use the field in the DataViz block config**

In `src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx` (unchanged by Tasks 6-10):

Replace lines 4-9:

```tsx
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import {
  AvaVizConfigs,
  VizTypes,
} from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
```

with:

```tsx
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
```

Add this import after line 16 (`import { useVizConfigPFieldConfig } ...`):

```tsx
import { useVizTypePFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig";
```

In `DataVizPBlockConfigOptions`, replace `  vizTypeLabel: string;` (line 51) with:

```tsx
  vizTypeField: Field<DataVizPBlockProps["vizType"]>;
```

In `_getDataVizPBlockConfig`, replace the `vizType` `select` field (lines 71-80, from `vizType: {` through its closing `},`) with:

```tsx
      vizType: options.vizTypeField,
```

In `useDataVizPBlockConfig`, insert after the `vizConfigFieldConfig` declaration (after line 147):

```tsx
  const vizTypeFieldConfig = useVizTypePFieldConfig(auth);
```

In the options object passed to `_getDataVizPBlockConfig`, replace the `vizTypeLabel` entry (originally line 167) with:

```tsx
      vizTypeField: vizTypeFieldConfig,
```

and in that `useMemo`'s dependency array, add `vizTypeFieldConfig,` after `vizConfigFieldConfig,`. The `t` from `useLingui()` is still used for the block `label`.

- [ ] **Step 8: Run the field tests and confirm they pass**

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Pin the settings field routing and "Save to dashboard" copy**

In `src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx`, add this mock after the `useDataQuery` mock (after line 97):

```tsx
vi.mock(
  "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingsForm",
  () => {
    return {
      PluginVizSettingsForm: ({
        config,
      }: {
        config: { pluginVizId: string };
      }) => {
        return (
          <output data-testid="plugin-viz-settings-form">
            {config.pluginVizId}
          </output>
        );
      },
    };
  },
);
```

Add this case inside `describe("VizConfigPField", ...)`, right after the "atomically stores the selected ID and owning registry when an axis option is picked" case and before the `describe`'s closing `});`:

```tsx
  it("renders the plugin settings form when the block holds a plugin chart", () => {
    _renderField({
      value: {
        vizType: "plugin",
        pluginId: "avandar.epidemiology",
        pluginVizId: "epicurve",
        columnSettings: {},
        settings: { interval: "epiWeek" },
      },
    });
    expect(screen.getByTestId("plugin-viz-settings-form")).toHaveTextContent(
      "epicurve",
    );
  });
```

In `src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts`, add after line 6:

```ts
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
```

and add this case as the last one inside `describe("createDataVizBlock", ...)`:

```ts
  it("stores a plugin chart's type and config in the block unchanged", () => {
    const vizConfig: AvaVizConfig.Plugin = {
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings: {},
      settings: { interval: "epiWeek" },
    };
    const block = createDataVizBlock({
      columnBindings: {
        version: 1,
        scopeKey: "explorer",
        sqlKey: "SELECT onset FROM cases",
        columns: [],
      },
      rawSql: "SELECT onset FROM cases",
      prompt: "Cases by onset week",
      vizType: "plugin",
      vizConfig,
    });

    expect(block.props).toMatchObject({ vizType: "plugin", vizConfig });
  });
```

- [ ] **Step 10: Run the pinning tests and confirm they pass**

Run: `pnpm vitest run src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts`
Expected: PASS (7 and 5 tests). Both new cases pin behavior that already holds: `VizConfigContent` sends a non-table config to `VizSettingsFormBody`, whose plugin arm (Task 15) renders the mocked form, and `createDataVizBlock` copies `vizType` and `vizConfig` through.

- [ ] **Step 11: Run every dashboard test in the touched area**

Run: `pnpm vitest run src/views/DashboardApp/AvaPage src/views/DataExplorerApp/SaveToDashboardModal`
Expected: PASS (21 files, 133 tests, including the `DataVizPBlock` suite, whose `resolveData` case now builds the block config with the custom field).

- [ ] **Step 12: Type-check, lint, and format the touched area**

Run: `pnpm exec tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

Run: `pnpm exec eslint src/views/DashboardApp/AvaPage/pfields src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock && pnpm exec oxfmt --ignore-path .oxfmtignore --check src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.tsx src/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig.tsx src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx src/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring.ts src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.test.ts src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts`
Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.tsx \
  src/views/DashboardApp/AvaPage/pfields/VizTypePField/useVizTypePFieldConfig.tsx \
  src/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField.test.tsx \
  src/views/DashboardApp/AvaPage/pfields/useDataVizAuthoring/useDataVizAuthoring.ts \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/useDataVizPBlockConfig.tsx \
  src/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/makeDataVizPBlockStateFromProps/makeDataVizPBlockStateFromProps.test.ts \
  src/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField.test.tsx \
  src/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock/createDataVizBlock.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): pick plugin chart types for dashboard charts

The DataViz block's chart type is a custom Puck field built from
VizTypeSelect. A plugin pick writes the plugin type and its config
together, since a select bound to vizType cannot tell plugin charts
apart.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 20: Gadget summaries: "Plugin chart" label

**Files:**
- Modify: `src/clients/dashboards/findDashboardTile/findDashboardTile.ts` (Task 8's `DashboardTileSummary` and `_readVizType`, lines 5-30)
- Modify: `src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts` (Task 8's `_buildChartFacts` at lines 64-70, its call at line 156)
- Test: `src/clients/dashboards/findDashboardTile/findDashboardTile.test.ts`
- Test: `src/components/RichText/Gadget/useGadgetSummaries/__tests__/useGadgetSummaries.dashboards.test.tsx`

**Context:** Implements the gadget part of C7. Task 8 narrowed `DashboardTileSummary.vizType` and `_buildChartFacts` to `AvaVizConfig.BuiltInType | undefined`, so a stored `"plugin"` reads as `undefined` and the tile loses its Chart fact. This task widens both back to `AvaVizConfig.Type | undefined`: `findDashboardTile._readVizType` reads `"plugin"` as `"plugin"`, and `_buildChartFacts` shows the translated "Plugin chart" for a plugin tile. The manifest title would need the manifest chunk, which loads asynchronously (`useVizTypeLabel` does that and calls `useQuery`), while a summary is built synchronously. The label is translated in the `useDashboardTileSummary` hook with `t` from `useLingui()` and passed in, since `_buildChartFacts` is a plain helper. The shared gadget fixtures dashboard is also read by the tile-count test (`["Tiles", "3"]`), so the new case mocks its own dashboard instead of adding a tile to the fixtures. Neither hook path calls `useQuery`, so the tests need no `QueryClientProvider`.

- [ ] **Step 1: Write the failing tests**

In `src/clients/dashboards/findDashboardTile/findDashboardTile.test.ts`, add this case after "reads a viz type this build does not know as undefined" (after line 65):

```ts
  it("reads a plugin chart tile's viz type as plugin", () => {
    const config = {
      type: "DataViz",
      props: { id: "DataViz-plugin", vizType: "plugin" },
    };
    expect(findDashboardTile(config, "DataViz-plugin")?.vizType).toBe("plugin");
  });
```

In `src/components/RichText/Gadget/useGadgetSummaries/__tests__/useGadgetSummaries.dashboards.test.tsx`, add this case inside `describe("useDashboardTileSummary", ...)`, after "omits the Chart fact for a viz type this build does not know" (after line 113):

```tsx
  it("shows Plugin chart as the Chart fact of a plugin chart tile", () => {
    mocks.useDashboardById.mockReturnValue([
      {
        ...DASHBOARD,
        config: {
          content: [
            {
              type: "DataViz",
              props: {
                id: "DataViz-plugin",
                nlQuery: { prompt: "Cases by onset week" },
                vizType: "plugin",
              },
            },
          ],
        },
      },
      false,
    ]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-plugin"),
    );
    expect(_factPairs(summary)).toEqual([
      ["Dashboard", "Measles by borough"],
      ["Chart", "Plugin chart"],
      ["Updated", UPDATED_LABEL],
    ]);
  });
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm vitest run src/clients/dashboards/findDashboardTile/findDashboardTile.test.ts src/components/RichText/Gadget/useGadgetSummaries/__tests__/useGadgetSummaries.dashboards.test.tsx`
Expected: FAIL (2 failed, 16 passed): `expected undefined to be 'plugin'` in `findDashboardTile`, and the tile summary's facts lack the `["Chart", "Plugin chart"]` pair.

- [ ] **Step 3: Implement**

In `src/clients/dashboards/findDashboardTile/findDashboardTile.ts`, replace lines 5-30 (Task 8's `DashboardTileSummary` type through `_readVizType`), which read:

```ts
/**
 * The parts of a dashboard tile that describe it without running its query,
 * for example on a card that references the tile from a comment.
 */
export type DashboardTileSummary = {
  id: string;
  prompt: string | undefined;
  vizType: AvaVizConfig.BuiltInType | undefined;
};

function _readPrompt(nlQuery: unknown): string | undefined {
  if (!isPlainObject(nlQuery)) {
    return undefined;
  }
  const prompt: unknown = nlQuery["prompt"];
  return isString(prompt) && prompt.trim() !== "" ? prompt : undefined;
}

/**
 * The built-in viz type a stored value names, or undefined when it names none.
 */
function _readVizType(vizType: unknown): AvaVizConfig.BuiltInType | undefined {
  return VizTypes.find((knownType) => {
    return knownType === vizType;
  });
}
```

with:

```ts
/**
 * The parts of a dashboard tile that describe it without running its query,
 * for example on a card that references the tile from a comment.
 */
export type DashboardTileSummary = {
  id: string;
  prompt: string | undefined;

  /**
   * A built-in viz type, `"plugin"` for any plugin chart, or undefined when
   * this build knows no viz type of that name.
   */
  vizType: AvaVizConfig.Type | undefined;
};

function _readPrompt(nlQuery: unknown): string | undefined {
  if (!isPlainObject(nlQuery)) {
    return undefined;
  }
  const prompt: unknown = nlQuery["prompt"];
  return isString(prompt) && prompt.trim() !== "" ? prompt : undefined;
}

/**
 * The viz type a stored value names, or undefined when this build has none.
 * Every plugin chart reads as `"plugin"`.
 */
function _readVizType(vizType: unknown): AvaVizConfig.Type | undefined {
  if (vizType === "plugin") {
    return "plugin";
  }
  return VizTypes.find((knownType) => {
    return knownType === vizType;
  });
}
```

In `src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts`, replace Task 8's `_buildChartFacts` (lines 64-70), which reads:

```ts
function _buildChartFacts(
  vizType: AvaVizConfig.BuiltInType | undefined,
): GadgetFact[] {
  return vizType === undefined
    ? []
    : [{ label: msg`Chart`, value: vizTypeLabel(vizType) }];
}
```

with:

```ts
function _buildChartFacts(options: {
  vizType: AvaVizConfig.Type | undefined;
  pluginChartLabel: string;
}): GadgetFact[] {
  const { vizType, pluginChartLabel } = options;
  if (vizType === undefined) {
    return [];
  }
  // A plugin chart's title lives in its plugin's manifest, which loads
  // lazily, so a summary names every plugin chart the same way.
  return [
    {
      label: msg`Chart`,
      value: vizType === "plugin" ? pluginChartLabel : vizTypeLabel(vizType),
    },
  ];
}
```

In `useDashboardTileSummary`, replace `          ..._buildChartFacts(tile.vizType),` (originally line 156) with:

```ts
          ..._buildChartFacts({
            vizType: tile.vizType,
            pluginChartLabel: t`Plugin chart`,
          }),
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm vitest run src/clients/dashboards/findDashboardTile src/components/RichText/Gadget/useGadgetSummaries`
Expected: PASS (4 files, 35 tests: 7 `findDashboardTile`, and the dashboards, datasets, and ontology gadget suites).

- [ ] **Step 5: Type-check, lint, and format the touched area**

Run: `pnpm exec tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

Run: `pnpm exec eslint src/clients/dashboards/findDashboardTile src/components/RichText/Gadget/useGadgetSummaries && pnpm exec oxfmt --ignore-path .oxfmtignore --check src/clients/dashboards/findDashboardTile/findDashboardTile.ts src/clients/dashboards/findDashboardTile/findDashboardTile.test.ts src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts src/components/RichText/Gadget/useGadgetSummaries/__tests__/useGadgetSummaries.dashboards.test.tsx`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/clients/dashboards/findDashboardTile/findDashboardTile.ts \
  src/clients/dashboards/findDashboardTile/findDashboardTile.test.ts \
  src/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries.ts \
  src/components/RichText/Gadget/useGadgetSummaries/__tests__/useGadgetSummaries.dashboards.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): name plugin chart tiles in gadget summaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

### Task 21: Epidemiology: `getDateFromCellValue` and `getBucketStartFromDate`

**Files:**
- Create: `plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.ts`
- Test: `plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.test.ts`
- Create: `plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.ts`
- Test: `plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.test.ts`

**Context:** These two pure helpers implement C9's date reading and bucketing for the
epicurve transform (Task 22). `getDateFromCellValue` reads a `Date`, an ISO date or
timestamp string, or an epoch milliseconds number, all in UTC: the Data Explorer hands
date cells over as ISO text or epoch milliseconds (`getDateColumns.ts` sniffs both), and
JavaScript would otherwise parse zone-less timestamp text in the browser's zone. It also
rejects impossible calendar days (V8 reads `2021-02-30` as 2 March) and years outside
0000 to 9999, because bucket starts are written as `YYYY-MM-DD` and parsed back for
zero-fill. `getBucketStartFromDate` returns the bucket's first day as `YYYY-MM-DD`; epi
weeks start on Sunday, which reproduces MMWR weeks, including week 53 of 2020
(2020-12-27 to 2021-01-02). Plugin code follows the repo style: no `for`/`while`,
block-bodied arrows (`arrow-body-style: always`), extensionless relative imports, and
explicit return types on exports. Nothing here depends on earlier tasks.

- [ ] **Step 1: Write the failing test for `getDateFromCellValue`**

`plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDateFromCellValue } from "./getDateFromCellValue";

function _getIsoText(value: unknown): string | undefined {
  return getDateFromCellValue(value)?.toISOString();
}

describe("getDateFromCellValue", () => {
  it("reads a Date as the same instant", () => {
    expect(_getIsoText(new Date("2021-01-03T10:15:00.000Z"))).toBe(
      "2021-01-03T10:15:00.000Z",
    );
  });

  it("reads an ISO date string as midnight UTC", () => {
    expect(_getIsoText("2021-01-03")).toBe("2021-01-03T00:00:00.000Z");
  });

  it("reads a timestamp string without a zone as UTC", () => {
    expect(_getIsoText("2021-01-02 23:30:00")).toBe("2021-01-02T23:30:00.000Z");
  });

  it("keeps the fraction of a second in a timestamp string", () => {
    expect(_getIsoText("2021-01-02T23:30:15.250")).toBe(
      "2021-01-02T23:30:15.250Z",
    );
  });

  it("converts a timestamp string with a zone offset to UTC", () => {
    expect(_getIsoText("2021-01-02T23:30:00-05:00")).toBe(
      "2021-01-03T04:30:00.000Z",
    );
  });

  it("reads a timestamp string that ends in Z as UTC", () => {
    expect(_getIsoText("2021-01-02T23:30:00Z")).toBe(
      "2021-01-02T23:30:00.000Z",
    );
  });

  it("reads an epoch milliseconds number as that instant", () => {
    expect(_getIsoText(Date.UTC(2021, 0, 3))).toBe("2021-01-03T00:00:00.000Z");
  });

  it("ignores whitespace around a date string", () => {
    expect(_getIsoText("  2021-01-03 ")).toBe("2021-01-03T00:00:00.000Z");
  });

  it("keeps a year below 100 as written", () => {
    expect(_getIsoText("0099-01-01")).toBe("0099-01-01T00:00:00.000Z");
  });

  it("returns undefined for an invalid Date", () => {
    expect(getDateFromCellValue(new Date("not a date"))).toBeUndefined();
  });

  it("returns undefined for a calendar day that does not exist", () => {
    expect(getDateFromCellValue("2021-02-30")).toBeUndefined();
    expect(getDateFromCellValue("2021-13-01")).toBeUndefined();
  });

  it("returns undefined for a time of day that does not exist", () => {
    expect(getDateFromCellValue("2021-01-02 24:00:00")).toBeUndefined();
    expect(getDateFromCellValue("2021-01-02 10:60:00")).toBeUndefined();
  });

  it("returns undefined for text that is not an ISO date", () => {
    expect(getDateFromCellValue("")).toBeUndefined();
    expect(getDateFromCellValue("n/a")).toBeUndefined();
    expect(getDateFromCellValue("01/03/2021")).toBeUndefined();
  });

  it("returns undefined for a number that is not finite", () => {
    expect(getDateFromCellValue(Number.NaN)).toBeUndefined();
    expect(getDateFromCellValue(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("returns undefined for a year past 9999", () => {
    expect(getDateFromCellValue(Date.UTC(10_000, 0, 1))).toBeUndefined();
  });

  it("returns undefined for values that are not dates, text, or numbers", () => {
    expect(getDateFromCellValue(null)).toBeUndefined();
    expect(getDateFromCellValue(undefined)).toBeUndefined();
    expect(getDateFromCellValue(true)).toBeUndefined();
    expect(getDateFromCellValue(1_609_632_000_000n)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.test.ts`
Expected: FAIL, `Failed to resolve import "./getDateFromCellValue"`.

- [ ] **Step 3: Implement `getDateFromCellValue`**

`plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.ts`:

```ts
/**
 * `YYYY-MM-DD`, optionally followed by a time (`T` or a space, then
 * `HH:MM`, optional seconds and fraction) and an optional zone (`Z` or an
 * offset such as `+05:30`).
 */
const DATE_TEXT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/i;

/** The last year a `YYYY-MM-DD` bucket start can hold. */
const MAX_YEAR = 9999;

function _getValidDate(milliseconds: number): Date | undefined {
  const date = new Date(milliseconds);
  const year = date.getUTCFullYear();
  return Number.isNaN(year) || year < 0 || year > MAX_YEAR ? undefined : date;
}

/** Minutes east of UTC for a zone designator. Undefined when malformed. */
function _getOffsetMinutesFromZone(
  zone: string | undefined,
): number | undefined {
  if (zone === undefined || zone.toUpperCase() === "Z") {
    return 0;
  }
  const digits = zone.slice(1).replace(":", "");
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));
  if (hours > 23 || minutes > 59) {
    return undefined;
  }
  return (zone.startsWith("-") ? -1 : 1) * (hours * 60 + minutes);
}

type WallClock = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  milliseconds: number;
}>;

/**
 * A wall-clock time read as UTC. Undefined for a day or a time of day that
 * does not exist.
 */
function _getUtcDateFromWallClock(wallClock: WallClock): Date | undefined {
  const { year, month, day, hour, minute, second, milliseconds } = wallClock;
  if (hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }
  // `setUTCFullYear` keeps a year below 100 as written, where `Date.UTC`
  // would read 0099 as 1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  const isRealDay =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isRealDay ? date : undefined;
}

function _getDateFromText(text: string): Date | undefined {
  const match = DATE_TEXT_PATTERN.exec(text.trim());
  if (match === null) {
    return undefined;
  }
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText = "0",
    minuteText = "0",
    secondText = "0",
    fractionText = "",
    zone,
  ] = match;
  const offsetMinutes = _getOffsetMinutesFromZone(zone);
  const wallClockDate = _getUtcDateFromWallClock({
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
    milliseconds: Math.floor(Number(`0${fractionText}`) * 1000),
  });
  if (wallClockDate === undefined || offsetMinutes === undefined) {
    return undefined;
  }
  return _getValidDate(wallClockDate.getTime() - offsetMinutes * 60_000);
}

/**
 * Reads a query result cell as a date, for charts that bucket rows by time,
 * such as an epicurve. Accepts a `Date`, an ISO date or timestamp string, and
 * an epoch milliseconds number. Text without a zone is read as UTC, and text
 * with a zone is converted to UTC. Anything else, an impossible calendar date,
 * or a year outside 0000 to 9999 is undefined.
 */
export function getDateFromCellValue(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return _getValidDate(value.getTime());
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? _getValidDate(value) : undefined;
  }
  if (typeof value === "string") {
    return _getDateFromText(value);
  }
  return undefined;
}
```

The regex line is longer than 80 characters. That is allowed: the repo's `max-len` rule
sets `ignoreRegExpLiterals: true`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Write the failing test for `getBucketStartFromDate`**

`plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getBucketStartFromDate } from "./getBucketStartFromDate";
import type { EpicurveInterval } from "./getBucketStartFromDate";

function _getBucketStart(isoText: string, interval: EpicurveInterval): string {
  return getBucketStartFromDate({ date: new Date(isoText), interval });
}

describe("getBucketStartFromDate", () => {
  it("returns the UTC calendar day for the day interval", () => {
    expect(_getBucketStart("2021-01-02T23:30:00.000Z", "day")).toBe(
      "2021-01-02",
    );
  });

  it("uses the UTC day even where the local day differs", () => {
    // 02:00 UTC on 3 January is still 2 January west of Greenwich.
    expect(_getBucketStart("2021-01-03T02:00:00.000Z", "day")).toBe(
      "2021-01-03",
    );
  });

  it("starts an epi week on the Sunday before a midweek date", () => {
    expect(_getBucketStart("2021-01-13T12:00:00.000Z", "epiWeek")).toBe(
      "2021-01-10",
    );
  });

  it("starts an epi week on a Sunday's own date", () => {
    expect(_getBucketStart("2021-01-10T00:00:00.000Z", "epiWeek")).toBe(
      "2021-01-10",
    );
  });

  it("puts Thursday 2020-12-31 in MMWR week 53 of 2020, from 2020-12-27", () => {
    expect(_getBucketStart("2020-12-31T12:00:00.000Z", "epiWeek")).toBe(
      "2020-12-27",
    );
  });

  it("puts Saturday 2021-01-02 in MMWR week 53 of 2020, from 2020-12-27", () => {
    expect(_getBucketStart("2021-01-02T23:59:59.999Z", "epiWeek")).toBe(
      "2020-12-27",
    );
  });

  it("starts MMWR week 1 of 2021 on Sunday 2021-01-03", () => {
    expect(_getBucketStart("2021-01-03T00:00:00.000Z", "epiWeek")).toBe(
      "2021-01-03",
    );
  });

  it("returns the first of the month for the month interval", () => {
    expect(_getBucketStart("2021-01-31T23:00:00.000Z", "month")).toBe(
      "2021-01-01",
    );
  });

  it("returns 1 February for the leap day 2020-02-29", () => {
    expect(_getBucketStart("2020-02-29T12:00:00.000Z", "month")).toBe(
      "2020-02-01",
    );
  });

  it("pads a year before 1000 to four digits", () => {
    expect(_getBucketStart("0999-06-15T00:00:00.000Z", "day")).toBe(
      "0999-06-15",
    );
  });
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.test.ts`
Expected: FAIL, `Failed to resolve import "./getBucketStartFromDate"`.

- [ ] **Step 7: Implement `getBucketStartFromDate`**

`plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.ts`:

```ts
/**
 * How an epicurve groups dates into bars: one bar per UTC day, per epi week
 * (Sunday to Saturday, as the CDC's MMWR weeks run), or per calendar month.
 */
export type EpicurveInterval = "day" | "epiWeek" | "month";

const DAY_IN_MILLISECONDS = 86_400_000;

/** How many whole days a date sits after the start of its bucket. */
const DAYS_INTO_BUCKET: Record<EpicurveInterval, (date: Date) => number> = {
  day: () => {
    return 0;
  },
  epiWeek: (date) => {
    return date.getUTCDay();
  },
  month: (date) => {
    return date.getUTCDate() - 1;
  },
};

function _getTextFromUtcDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Gets the first day of the bucket a date falls in, as `YYYY-MM-DD` in UTC,
 * so dates can be grouped and the buckets sorted as text. An epi week starts
 * on the Sunday on or before the date, which matches MMWR weeks, including
 * week 53 in the years that have one.
 */
export function getBucketStartFromDate(
  options: Readonly<{ date: Date; interval: EpicurveInterval }>,
): string {
  const { date, interval } = options;
  const dayStart =
    Math.floor(date.getTime() / DAY_IN_MILLISECONDS) * DAY_IN_MILLISECONDS;
  const bucketStart =
    dayStart - DAYS_INTO_BUCKET[interval](date) * DAY_IN_MILLISECONDS;
  return _getTextFromUtcDate(new Date(bucketStart));
}
```

- [ ] **Step 8: Run both tests and confirm they pass, in a zone west of UTC too**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve`
Expected: PASS (2 files, 26 tests).

Run: `TZ=America/Los_Angeles pnpm vitest run plugins/epidemiology/src/epicurve`
Expected: PASS (2 files, 26 tests). A failure here means a local-time method crept in.

- [ ] **Step 9: Type-check and lint the plugin**

Run: `pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: exit 0, no output.

- [ ] **Step 10: Commit**

```bash
git add plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.ts \
  plugins/epidemiology/src/epicurve/getDateFromCellValue/getDateFromCellValue.test.ts \
  plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.ts \
  plugins/epidemiology/src/epicurve/getBucketStartFromDate/getBucketStartFromDate.test.ts
git commit -m "$(cat <<'EOF'
feat(plugins): bucket epicurve dates by day, epi week, and month

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Epidemiology: `makeEpicurveFromRows`

**Files:**
- Create: `plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.ts`
- Test: `plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.test.ts`
- Create: `plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.ts`
- Test: `plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.test.ts`
- Modify: `plugins/epidemiology/locales/en.json` (adds `viz.epicurve.cases`, `viz.epicurve.other`, `viz.epicurve.unknown`)

**Context:** This is the epicurve's transform (C9, spec "Epicurve (transform)"), typed
against the SDK's `PluginVizInput`, `PluginVizContext`, `PluginVizTransformResult`, and
`PluginChartSpec` (C2, Task 3), so it is assignable to `PluginVizTransform`. It reads the
settings `dateColumn` (required; it throws an `Error` when unset, which the host turns
into its "couldn't render" placeholder), `countColumn` (rows count 1 each when unset),
`interval` (`epiWeek` when unset or unknown), and `stackByColumn`. It skips undated
rows, zero-fills every bucket between the first and last, ranks stack-by values by total
cases (ties by text, the missing value last), keeps the top 8 as their own series, and
sums the rest as "Other". A missing value (null, undefined, or empty text) is its own
"Unknown" series that competes in the ranking like any value, so the legend never holds
more than 9 entries; it is keyed apart from a real value that reads "Unknown". Labels
come from `context.i18n.t` with keys in the plugin's `locales/en.json`.

**Output column names.** Rows hold `bucket` (`YYYY-MM-DD`) plus one column per series:
`cases` for the single series, or `series_0` to `series_7` and `series_other` when
stacked, each labeled in the spec. Generated names are deliberate: a raw value can be any
text, Recharts reads a `dataKey` such as `a.b` as a nested path, and a value could
collide with `bucket`. The labels carry the display text.

A small shared reader, `getNumberFromCellValue`, is added first. The rate plot (Task 23)
reuses it. `makeRegressionPointsFromRows` keeps its own private copy, since changing it is
outside this task.

- [ ] **Step 1: Write the failing test for `getNumberFromCellValue`**

`plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getNumberFromCellValue } from "./getNumberFromCellValue";

describe("getNumberFromCellValue", () => {
  it("returns a finite number unchanged", () => {
    expect(getNumberFromCellValue(12.5)).toBe(12.5);
  });

  it("converts a bigint to a number", () => {
    expect(getNumberFromCellValue(42n)).toBe(42);
  });

  it("converts numeric text, ignoring surrounding whitespace", () => {
    expect(getNumberFromCellValue(" 7.25 ")).toBe(7.25);
  });

  it("returns undefined for blank text", () => {
    expect(getNumberFromCellValue("")).toBeUndefined();
    expect(getNumberFromCellValue("   ")).toBeUndefined();
  });

  it("returns undefined for text that is not a number", () => {
    expect(getNumberFromCellValue("n/a")).toBeUndefined();
  });

  it("returns undefined for a value that is not finite", () => {
    expect(getNumberFromCellValue(Number.NaN)).toBeUndefined();
    expect(getNumberFromCellValue(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(getNumberFromCellValue("Infinity")).toBeUndefined();
  });

  it("returns undefined for null, undefined, booleans, and objects", () => {
    expect(getNumberFromCellValue(null)).toBeUndefined();
    expect(getNumberFromCellValue(undefined)).toBeUndefined();
    expect(getNumberFromCellValue(true)).toBeUndefined();
    expect(getNumberFromCellValue({ value: 1 })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.test.ts`
Expected: FAIL, `Failed to resolve import "./getNumberFromCellValue"`.

- [ ] **Step 3: Implement `getNumberFromCellValue`**

`plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.ts`:

```ts
/**
 * Reads a query result cell as a finite number, for charts that sum or plot
 * values, such as case counts or rates. Numbers, bigints, and numeric text
 * count, so a raw row from a chart's input can be read as is. Blank text,
 * other types, and values that are not finite are undefined. A bigint above
 * 2^53 rounds to the nearest double.
 */
export function getNumberFromCellValue(value: unknown): number | undefined {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  if (
    typeof value !== "number" &&
    typeof value !== "bigint" &&
    typeof value !== "string"
  ) {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Add the transform's strings**

Replace `plugins/epidemiology/locales/en.json` with:

```json
{
  "plugin.name": "Epidemiology",
  "plugin.description": "Statistical modeling tools for public-health data.",
  "regression.linear.title": "Linear regression",
  "modal.xColumn": "Predictor (X)",
  "modal.yColumn": "Outcome (Y)",
  "modal.fit": "Fit regression",
  "modal.slope": "Slope",
  "modal.intercept": "Intercept",
  "modal.rSquared": "R²",
  "modal.n": "Rows used",
  "modal.notAvailable": "Not available",
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result.",
  "modal.notEnoughData": "Pick two different numeric columns with at least two rows where X varies.",
  "modal.failed": "Could not read the result: {message}",
  "viz.epicurve.cases": "Cases",
  "viz.epicurve.other": "Other",
  "viz.epicurve.unknown": "Unknown"
}
```

- [ ] **Step 6: Write the failing test for the transform**

`plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.test.ts`:

```ts
import { makePluginTranslator } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeEpicurveFromRows } from "./makeEpicurveFromRows";
import type {
  PluginVizContext,
  PluginVizInput,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

const CONTEXT: PluginVizContext = {
  i18n: {
    t: makePluginTranslator({
      locale: "en-US",
      messages: { en: englishMessages },
    }),
  },
  locale: "en-US",
};

function _makeEpicurve(options: {
  rows: PluginVizInput["rows"];
  settings?: PluginVizInput["settings"];
}): PluginVizTransformResult {
  return makeEpicurveFromRows(
    {
      rows: options.rows,
      columns: [
        { name: "onset", dataType: "date" },
        { name: "cases", dataType: "bigint" },
        { name: "status", dataType: "varchar" },
      ],
      settings: { dateColumn: "onset", interval: "day", ...options.settings },
      isTruncated: false,
    },
    CONTEXT,
  );
}

function _makeOnsetRows(onsets: readonly string[]): PluginVizInput["rows"] {
  return onsets.map((onset) => {
    return { onset };
  });
}

describe("makeEpicurveFromRows", () => {
  it("counts one case per row when no count column is set", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04", "2021-01-04", "2021-01-05"]),
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 2 },
      { bucket: "2021-01-05", cases: 1 },
    ]);
  });

  it("sums the count column per bucket", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", cases: 3 },
        { onset: "2021-01-04", cases: "2" },
        { onset: "2021-01-05", cases: 4n },
      ],
      settings: { countColumn: "cases" },
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 5 },
      { bucket: "2021-01-05", cases: 4 },
    ]);
  });

  it("adds nothing for a row whose count is not a number", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", cases: 3 },
        { onset: "2021-01-04", cases: null },
      ],
      settings: { countColumn: "cases" },
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 3 }]);
  });

  it("skips rows without a valid date", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04" },
        { onset: null },
        { onset: "not a date" },
        { onset: "2021-02-30" },
      ],
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 1 }]);
  });

  it("reads Date objects and epoch milliseconds as dates", () => {
    const { rows } = _makeEpicurve({
      rows: [
        { onset: new Date("2021-01-04T08:00:00.000Z") },
        { onset: Date.UTC(2021, 0, 4, 20) },
      ],
    });
    expect(rows).toEqual([{ bucket: "2021-01-04", cases: 2 }]);
  });

  it("fills every empty day between the first and last date with zero", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-08", "2021-01-04"]),
    });
    expect(rows).toEqual([
      { bucket: "2021-01-04", cases: 1 },
      { bucket: "2021-01-05", cases: 0 },
      { bucket: "2021-01-06", cases: 0 },
      { bucket: "2021-01-07", cases: 0 },
      { bucket: "2021-01-08", cases: 1 },
    ]);
  });

  it("zero-fills epi weeks across the 2020 to 2021 year boundary", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-12-22", "2020-12-31", "2021-01-12"]),
      settings: { interval: "epiWeek" },
    });
    expect(rows).toEqual([
      { bucket: "2020-12-20", cases: 1 },
      { bucket: "2020-12-27", cases: 1 },
      { bucket: "2021-01-03", cases: 0 },
      { bucket: "2021-01-10", cases: 1 },
    ]);
  });

  it("puts 2020-12-31 and 2021-01-02 in MMWR week 53 of 2020", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-12-31", "2021-01-02", "2021-01-03"]),
      settings: { interval: "epiWeek" },
    });
    expect(rows).toEqual([
      { bucket: "2020-12-27", cases: 2 },
      { bucket: "2021-01-03", cases: 1 },
    ]);
  });

  it("zero-fills months across a year boundary", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2020-11-15", "2021-02-01"]),
      settings: { interval: "month" },
    });
    expect(rows).toEqual([
      { bucket: "2020-11-01", cases: 1 },
      { bucket: "2020-12-01", cases: 0 },
      { bucket: "2021-01-01", cases: 0 },
      { bucket: "2021-02-01", cases: 1 },
    ]);
  });

  it("buckets by epi week when the interval is unset", () => {
    const { rows } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04", "2021-01-09"]),
      settings: { interval: undefined },
    });
    expect(rows).toEqual([{ bucket: "2021-01-03", cases: 2 }]);
  });

  it("returns a stacked bar spec with no bar gap and a date x axis", () => {
    const { chart } = _makeEpicurve({
      rows: _makeOnsetRows(["2021-01-04"]),
    });
    expect(chart).toEqual({
      kind: "bar",
      xColumn: "bucket",
      xColumnType: "date",
      series: [{ column: "cases", label: "Cases" }],
      layout: "stack",
      barGap: "none",
    });
  });

  it("makes one series per stack-by value, from the most cases to the fewest", () => {
    const { rows, chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "Vaccinated" },
        { onset: "2021-01-04", status: "Unvaccinated" },
        { onset: "2021-01-05", status: "Unvaccinated" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "Unvaccinated" },
      { column: "series_1", label: "Vaccinated" },
    ]);
    expect(rows).toEqual([
      { bucket: "2021-01-04", series_0: 1, series_1: 1 },
      { bucket: "2021-01-05", series_0: 1, series_1: 0 },
    ]);
  });

  it("orders stack-by values with the same total by their text", () => {
    const { chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "b" },
        { onset: "2021-01-04", status: "a" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "a" },
      { column: "series_1", label: "b" },
    ]);
  });

  it("sums the stack-by values past the top 8 as Other", () => {
    const { rows, chart } = _makeEpicurve({
      rows: Array.from({ length: 10 }, (_value, index) => {
        return { onset: "2021-01-04", status: `s${index}`, cases: 10 - index };
      }),
      settings: { stackByColumn: "status", countColumn: "cases" },
    });
    const labels = chart.series.map((oneSeries) => {
      return oneSeries.label;
    });
    expect(labels).toEqual([
      "s0",
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
      "s7",
      "Other",
    ]);
    expect(rows[0]).toMatchObject({ series_7: 3, series_other: 3 });
  });

  it("labels rows with no stack-by value as Unknown", () => {
    const { rows, chart } = _makeEpicurve({
      rows: [
        { onset: "2021-01-04", status: "Vaccinated" },
        { onset: "2021-01-04", status: null },
        { onset: "2021-01-04", status: "" },
      ],
      settings: { stackByColumn: "status" },
    });
    expect(chart.series).toEqual([
      { column: "series_0", label: "Unknown" },
      { column: "series_1", label: "Vaccinated" },
    ]);
    expect(rows).toEqual([{ bucket: "2021-01-04", series_0: 2, series_1: 1 }]);
  });

  it("returns no rows and the Cases series when no row has a valid date", () => {
    const result = _makeEpicurve({
      rows: _makeOnsetRows(["n/a"]),
      settings: { stackByColumn: "status" },
    });
    expect(result.rows).toEqual([]);
    expect(result.chart.series).toEqual([{ column: "cases", label: "Cases" }]);
  });

  it("throws when the date column setting is unset", () => {
    expect(() => {
      return _makeEpicurve({
        rows: _makeOnsetRows(["2021-01-04"]),
        settings: { dateColumn: undefined },
      });
    }).toThrow('The epicurve needs a "dateColumn" setting.');
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.test.ts`
Expected: FAIL, `Failed to resolve import "./makeEpicurveFromRows"`.

- [ ] **Step 8: Implement the transform**

`plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.ts`:

```ts
import { getNumberFromCellValue } from "../../getNumberFromCellValue/getNumberFromCellValue";
import { getBucketStartFromDate } from "../getBucketStartFromDate/getBucketStartFromDate";
import { getDateFromCellValue } from "../getDateFromCellValue/getDateFromCellValue";
import type { EpicurveInterval } from "../getBucketStartFromDate/getBucketStartFromDate";
import type {
  AvandarApi,
  PluginChartSpec,
  PluginVizContext,
  PluginVizInput,
  PluginVizSettingValue,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

/** The output column holding each bar's bucket start, as `YYYY-MM-DD`. */
const BUCKET_COLUMN = "bucket";

/** The output column of the one series drawn without a stack-by column. */
const CASES_COLUMN = "cases";

/** The output column of the series that sums every value past the top 8. */
const OTHER_COLUMN = "series_other";

/** How many stack-by values get a series of their own. */
const MAX_NAMED_SERIES = 8;

const DAY_IN_MILLISECONDS = 86_400_000;

const INTERVALS: readonly EpicurveInterval[] = ["day", "epiWeek", "month"];

/**
 * A stack-by value, or `undefined` for a row with no value. Rows without a
 * stack-by column all fall under `undefined` too, as one series.
 */
type StackValue = string | undefined;

type EpicurveSettings = Readonly<{
  dateColumn: string;
  countColumn: string | undefined;
  interval: EpicurveInterval;
  stackByColumn: string | undefined;
}>;

type EpicurveCounts = Readonly<{
  /** Cases per bucket start, then per stack-by value. */
  countsByBucket: Map<string, Map<StackValue, number>>;
  /** Cases per stack-by value, over every bucket. */
  totalsByStackValue: Map<StackValue, number>;
}>;

type EpicurveSeries = Readonly<{
  column: string;
  label: string;
  /** The stack-by values whose cases this series adds up. */
  stackValues: readonly StackValue[];
}>;

function _getColumnFromSetting(
  value: PluginVizSettingValue | undefined,
): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function _getSettingsFromInput(
  settings: PluginVizInput["settings"],
): EpicurveSettings {
  const dateColumn = _getColumnFromSetting(settings.dateColumn);
  if (dateColumn === undefined) {
    throw new Error('The epicurve needs a "dateColumn" setting.');
  }
  return {
    dateColumn,
    countColumn: _getColumnFromSetting(settings.countColumn),
    interval:
      INTERVALS.find((interval) => {
        return interval === settings.interval;
      }) ?? "epiWeek",
    stackByColumn: _getColumnFromSetting(settings.stackByColumn),
  };
}

function _getStackValueFromCell(value: unknown): StackValue {
  return value === null || value === undefined || value === ""
    ? undefined
    : String(value);
}

function _addCount(options: {
  counts: Map<StackValue, number>;
  stackValue: StackValue;
  caseCount: number;
}): void {
  const { counts, stackValue, caseCount } = options;
  counts.set(stackValue, (counts.get(stackValue) ?? 0) + caseCount);
}

/** Adds up the cases per bucket and stack-by value. Skips undated rows. */
function _countRows(options: {
  rows: PluginVizInput["rows"];
  settings: EpicurveSettings;
}): EpicurveCounts {
  const { rows, settings } = options;
  const counts: EpicurveCounts = {
    countsByBucket: new Map(),
    totalsByStackValue: new Map(),
  };
  rows.forEach((row) => {
    const date = getDateFromCellValue(row[settings.dateColumn]);
    if (date === undefined) {
      return;
    }
    const bucketStart = getBucketStartFromDate({
      date,
      interval: settings.interval,
    });
    const caseCount =
      settings.countColumn === undefined
        ? 1
        : (getNumberFromCellValue(row[settings.countColumn]) ?? 0);
    const stackValue =
      settings.stackByColumn === undefined
        ? undefined
        : _getStackValueFromCell(row[settings.stackByColumn]);
    const bucketCounts =
      counts.countsByBucket.get(bucketStart) ?? new Map<StackValue, number>();
    _addCount({ counts: bucketCounts, stackValue, caseCount });
    counts.countsByBucket.set(bucketStart, bucketCounts);
    _addCount({ counts: counts.totalsByStackValue, stackValue, caseCount });
  });
  return counts;
}

/** Orders values by text, with the missing value last. */
function _compareStackValues(valueA: StackValue, valueB: StackValue): number {
  if (valueA === valueB) {
    return 0;
  }
  if (valueA === undefined || valueB === undefined) {
    return valueA === undefined ? 1 : -1;
  }
  return valueA < valueB ? -1 : 1;
}

/** Orders stack-by values from the most cases to the fewest. */
function _getRankedStackValues(
  totals: ReadonlyMap<StackValue, number>,
): StackValue[] {
  return [...totals.entries()]
    .sort(([valueA, totalA], [valueB, totalB]) => {
      return totalB - totalA || _compareStackValues(valueA, valueB);
    })
    .map(([stackValue]) => {
      return stackValue;
    });
}

/**
 * One series per stack-by value for the 8 values with the most cases, then
 * "Other" for the rest. Without a stack-by column, or without any dated
 * row, a single "Cases" series.
 */
function _getSeriesFromTotals(options: {
  totals: ReadonlyMap<StackValue, number>;
  hasStackByColumn: boolean;
  t: AvandarApi["i18n"]["t"];
}): EpicurveSeries[] {
  const { totals, hasStackByColumn, t } = options;
  const rankedValues = _getRankedStackValues(totals);
  if (!hasStackByColumn || rankedValues.length === 0) {
    const label = t("viz.epicurve.cases");
    return [{ column: CASES_COLUMN, label, stackValues: rankedValues }];
  }
  const namedSeries = rankedValues
    .slice(0, MAX_NAMED_SERIES)
    .map((stackValue, index) => {
      return {
        column: `series_${index}`,
        label: stackValue ?? t("viz.epicurve.unknown"),
        stackValues: [stackValue],
      };
    });
  const otherValues = rankedValues.slice(MAX_NAMED_SERIES);
  return otherValues.length === 0
    ? namedSeries
    : [
        ...namedSeries,
        {
          column: OTHER_COLUMN,
          label: t("viz.epicurve.other"),
          stackValues: otherValues,
        },
      ];
}

function _getDateFromBucketStart(bucketStart: string): Date {
  return new Date(`${bucketStart}T00:00:00.000Z`);
}

function _getBucketCount(options: {
  first: Date;
  last: Date;
  interval: EpicurveInterval;
}): number {
  const { first, last, interval } = options;
  if (interval === "month") {
    const yearCount = last.getUTCFullYear() - first.getUTCFullYear();
    return yearCount * 12 + last.getUTCMonth() - first.getUTCMonth() + 1;
  }
  const stepInDays = interval === "epiWeek" ? 7 : 1;
  const elapsed = last.getTime() - first.getTime();
  return Math.round(elapsed / (stepInDays * DAY_IN_MILLISECONDS)) + 1;
}

function _getNthBucketStart(options: {
  first: Date;
  index: number;
  interval: EpicurveInterval;
}): string {
  const { first, index, interval } = options;
  const date = new Date(first.getTime());
  if (interval === "month") {
    date.setUTCMonth(first.getUTCMonth() + index);
  } else {
    const stepInDays = interval === "epiWeek" ? 7 : 1;
    date.setUTCDate(first.getUTCDate() + index * stepInDays);
  }
  return getBucketStartFromDate({ date, interval });
}

/**
 * Every bucket start from the first counted bucket to the last, so a bucket
 * with no cases still gets a bar of zero.
 */
function _getBucketStartsFromCounts(options: {
  countsByBucket: ReadonlyMap<string, unknown>;
  interval: EpicurveInterval;
}): string[] {
  const { countsByBucket, interval } = options;
  const countedStarts = [...countsByBucket.keys()].sort();
  const firstStart = countedStarts[0];
  const lastStart = countedStarts[countedStarts.length - 1];
  if (firstStart === undefined || lastStart === undefined) {
    return [];
  }
  const first = _getDateFromBucketStart(firstStart);
  const last = _getDateFromBucketStart(lastStart);
  return Array.from(
    { length: _getBucketCount({ first, last, interval }) },
    (_value, index) => {
      return _getNthBucketStart({ first, index, interval });
    },
  );
}

function _makeRowsFromCounts(options: {
  bucketStarts: readonly string[];
  countsByBucket: ReadonlyMap<string, ReadonlyMap<StackValue, number>>;
  series: readonly EpicurveSeries[];
}): Array<Record<string, string | number>> {
  const { bucketStarts, countsByBucket, series } = options;
  return bucketStarts.map((bucketStart) => {
    const bucketCounts = countsByBucket.get(bucketStart);
    const seriesEntries = series.map((oneSeries) => {
      const caseCount = oneSeries.stackValues.reduce((sum, stackValue) => {
        return sum + (bucketCounts?.get(stackValue) ?? 0);
      }, 0);
      return [oneSeries.column, caseCount] as const;
    });
    return Object.fromEntries([[BUCKET_COLUMN, bucketStart], ...seriesEntries]);
  });
}

function _makeChartFromSeries(
  series: readonly EpicurveSeries[],
): PluginChartSpec {
  return {
    kind: "bar",
    xColumn: BUCKET_COLUMN,
    xColumnType: "date",
    series: series.map((oneSeries) => {
      return { column: oneSeries.column, label: oneSeries.label };
    }),
    layout: "stack",
    barGap: "none",
  };
}

/**
 * Turns line-list or count rows into an epidemic curve: cases per day, epi
 * week, or month, as touching stacked bars. Every bucket between the first
 * and last date is kept, so a gap in an outbreak shows as zero. With a
 * stack-by column, such as vaccination status, the 8 values with the most
 * cases get their own series and the rest are summed as "Other".
 */
export function makeEpicurveFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  const settings = _getSettingsFromInput(input.settings);
  const { countsByBucket, totalsByStackValue } = _countRows({
    rows: input.rows,
    settings,
  });
  const series = _getSeriesFromTotals({
    totals: totalsByStackValue,
    hasStackByColumn: settings.stackByColumn !== undefined,
    t: context.i18n.t,
  });
  const bucketStarts = _getBucketStartsFromCounts({
    countsByBucket,
    interval: settings.interval,
  });
  return {
    rows: _makeRowsFromCounts({ bucketStarts, countsByBucket, series }),
    chart: _makeChartFromSeries(series),
  };
}
```

- [ ] **Step 9: Run the tests and confirm they pass**

Run: `pnpm vitest run plugins/epidemiology/src/epicurve plugins/epidemiology/src/getNumberFromCellValue`
Expected: PASS (4 files, 50 tests).

- [ ] **Step 10: Type-check and lint the plugin**

Run: `pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: exit 0, no output. (Needs Task 3's SDK types.)

- [ ] **Step 11: Commit**

```bash
git add plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.ts \
  plugins/epidemiology/src/getNumberFromCellValue/getNumberFromCellValue.test.ts \
  plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.ts \
  plugins/epidemiology/src/epicurve/makeEpicurveFromRows/makeEpicurveFromRows.test.ts \
  plugins/epidemiology/locales/en.json
git commit -m "$(cat <<'EOF'
feat(plugins): add the epicurve transform

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: Epidemiology: rate plot (`makeRatePlotPointsFromRows`, `RatePlot`)

**Files:**
- Create: `plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.ts`
- Test: `plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.test.ts`
- Create: `plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.ts`
- Test: `plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.test.ts`
- Create: `plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.tsx`
- Create: `plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.types.ts`
- Create: `plugins/epidemiology/src/ratePlot/RatePlot/RatePlotChart.tsx`
- Create: `plugins/epidemiology/src/ratePlot/RatePlot/RatePlotTooltip.tsx`
- Test: `plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.test.tsx`
- Modify: `plugins/epidemiology/locales/en.json` (adds `viz.ratePlot.title`, `viz.ratePlot.rateText`, `viz.ratePlot.intervalText`, `viz.ratePlot.empty`)

**Context:** The rate plot is the component chart type (C9, spec "Rate plot
(component)"). `RatePlot` takes `PluginVizComponentProps` (C2, Task 3), reads the
settings `labelColumn`, `rateColumn`, `lowerColumn`, `upperColumn`, and `sort` (`rate`
when unset), and is built only from `@avandar/plugin-ui` and `@avandar/plugin-ui/charts`
(C3, Task 5): a `ComposedChart layout="vertical"` with a category `YAxis` of labels, a
number `XAxis` of rates, `Scatter` dots, and an `ErrorBar` child. `ErrorBar` draws nothing
for a row whose `rateError` is undefined, so whiskers appear only when both bounds are
numbers, and never when either bound column is unset. The tooltip text ("12.4
(9.8–15.6)") comes from ICU `{rate, number}` messages, which Lingui formats in the
translator's locale, so it follows the viewer locale with no locale prop. The chart has
`role="img"` and the translated title as its SVG `<title>`, which is its accessible name.
The tooltip is passed as `content={RatePlotTooltip}`: Recharts 3.8.1 calls
`React.createElement(content, props)` for a function, so a stable component avoids a
remount on every render. The render test mocks nothing in Recharts; Recharts 3.8.1 draws
in jsdom when the chart has a numeric `width` and `height`. The test wraps the component
in a bare `MantineProvider` and `PluginVizProvider` (Task 4, props `vizId`, `t`,
`children`): Task 5's `useChartTheme` reads only `useMantineTheme()` and
`useComputedColorScheme("light")`, and Task 4's `useT()` returns the
`PluginVizProvider` translator when no `AvandarProvider` is present. The repo's `render`
from `src/test-utils` is not an option here: the plugin path restriction in
`eslint/plugin-restrictions.js` forbids any plugin file, tests included, from importing
outside `plugins/epidemiology`, so plugin tests use `@testing-library/react` directly, as
`RegressionModal.test.tsx` does. The work is split over four files so each function
stays under 45 lines.

- [ ] **Step 1: Write the failing test for `makeRatePlotPointsFromRows`**

`plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeRatePlotPointsFromRows } from "./makeRatePlotPointsFromRows";
import type { RatePlotPoint, RatePlotSort } from "./makeRatePlotPointsFromRows";
import type { PluginVizInput } from "@avandar/plugin-sdk";

function _makePoints(options: {
  rows: PluginVizInput["rows"];
  hasBounds?: boolean;
  sort?: RatePlotSort;
}): RatePlotPoint[] {
  const hasBounds = options.hasBounds ?? true;
  return makeRatePlotPointsFromRows({
    rows: options.rows,
    labelColumn: "borough",
    rateColumn: "rate",
    lowerColumn: hasBounds ? "lower" : undefined,
    upperColumn: hasBounds ? "upper" : undefined,
    sort: options.sort ?? "rate",
  });
}

function _getLabels(points: readonly RatePlotPoint[]): string[] {
  return points.map((point) => {
    return point.label;
  });
}

describe("makeRatePlotPointsFromRows", () => {
  it("makes one point per row with its label, rate, and bounds", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }],
      }),
    ).toEqual([{ label: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }]);
  });

  it("converts numeric text and bigints in the rate and bounds", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Queens", rate: "8", lower: 6n, upper: " 10 " }],
      }),
    ).toEqual([{ label: "Queens", rate: 8, lower: 6, upper: 10 }]);
  });

  it("skips rows whose rate is not a number", () => {
    const points = _makePoints({
      rows: [
        { borough: "Bronx", rate: 12.4 },
        { borough: "Queens", rate: null },
        { borough: "Brooklyn", rate: "n/a" },
        { borough: "Manhattan", rate: "" },
        { borough: "Staten Island" },
      ],
    });
    expect(_getLabels(points)).toEqual(["Bronx"]);
  });

  it("leaves a bound undefined when its value is not a number", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: null, upper: 15.6 }],
      }),
    ).toEqual([{ label: "Bronx", rate: 12.4, lower: undefined, upper: 15.6 }]);
  });

  it("leaves both bounds undefined when their columns are not set", () => {
    expect(
      _makePoints({
        rows: [{ borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 }],
        hasBounds: false,
      }),
    ).toEqual([
      { label: "Bronx", rate: 12.4, lower: undefined, upper: undefined },
    ]);
  });

  it("writes a missing label as empty text", () => {
    const points = _makePoints({ rows: [{ borough: null, rate: 1 }] });
    expect(_getLabels(points)).toEqual([""]);
  });

  it("sorts by rate from highest to lowest", () => {
    const points = _makePoints({
      rows: [
        { borough: "Bronx", rate: 8 },
        { borough: "Queens", rate: 15 },
        { borough: "Brooklyn", rate: 11 },
      ],
      sort: "rate",
    });
    expect(_getLabels(points)).toEqual(["Queens", "Brooklyn", "Bronx"]);
  });

  it("sorts by label from A to Z", () => {
    const points = _makePoints({
      rows: [
        { borough: "Queens", rate: 15 },
        { borough: "Bronx", rate: 8 },
        { borough: "Brooklyn", rate: 11 },
      ],
      sort: "label",
    });
    expect(_getLabels(points)).toEqual(["Bronx", "Brooklyn", "Queens"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.test.ts`
Expected: FAIL, `Failed to resolve import "./makeRatePlotPointsFromRows"`.

- [ ] **Step 3: Implement `makeRatePlotPointsFromRows`**

`plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.ts`:

```ts
import { getNumberFromCellValue } from "../../getNumberFromCellValue/getNumberFromCellValue";
import type { PluginVizInput } from "@avandar/plugin-sdk";

/** How the rate plot orders its rows: by rate, highest first, or by label. */
export type RatePlotSort = "rate" | "label";

/**
 * One row of the rate plot: a dot at `rate`, and whiskers from `lower` to
 * `upper` when both bounds are numbers.
 */
export type RatePlotPoint = Readonly<{
  label: string;
  rate: number;
  lower: number | undefined;
  upper: number | undefined;
}>;

type RatePlotPointsOptions = Readonly<{
  rows: PluginVizInput["rows"];
  labelColumn: string;
  rateColumn: string;
  lowerColumn: string | undefined;
  upperColumn: string | undefined;
  sort: RatePlotSort;
}>;

function _getLabelFromCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function _getBoundFromRow(options: {
  row: PluginVizInput["rows"][number];
  column: string | undefined;
}): number | undefined {
  const { row, column } = options;
  return column === undefined ? undefined : getNumberFromCellValue(row[column]);
}

function _compareByRate(pointA: RatePlotPoint, pointB: RatePlotPoint): number {
  return pointB.rate - pointA.rate || pointA.label.localeCompare(pointB.label);
}

function _compareByLabel(pointA: RatePlotPoint, pointB: RatePlotPoint): number {
  return pointA.label.localeCompare(pointB.label) || pointB.rate - pointA.rate;
}

/**
 * Makes the rate plot's rows from query result rows, such as one row per
 * borough with an incidence rate and its confidence bounds. Rows whose rate
 * is not a number are skipped. A bound that is not a number, or whose column
 * is not set, is undefined, and the row is drawn without whiskers.
 */
export function makeRatePlotPointsFromRows(
  options: RatePlotPointsOptions,
): RatePlotPoint[] {
  const { rows, labelColumn, rateColumn, lowerColumn, upperColumn } = options;
  const points = rows.flatMap((row) => {
    const rate = getNumberFromCellValue(row[rateColumn]);
    if (rate === undefined) {
      return [];
    }
    return [
      {
        label: _getLabelFromCell(row[labelColumn]),
        rate,
        lower: _getBoundFromRow({ row, column: lowerColumn }),
        upper: _getBoundFromRow({ row, column: upperColumn }),
      },
    ];
  });
  return points.sort(
    options.sort === "rate" ? _compareByRate : _compareByLabel,
  );
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Add the rate plot's strings**

Replace `plugins/epidemiology/locales/en.json` with (the en dash in `intervalText` is the
range separator the spec shows):

```json
{
  "plugin.name": "Epidemiology",
  "plugin.description": "Statistical modeling tools for public-health data.",
  "regression.linear.title": "Linear regression",
  "modal.xColumn": "Predictor (X)",
  "modal.yColumn": "Outcome (Y)",
  "modal.fit": "Fit regression",
  "modal.slope": "Slope",
  "modal.intercept": "Intercept",
  "modal.rSquared": "R²",
  "modal.n": "Rows used",
  "modal.notAvailable": "Not available",
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result.",
  "modal.notEnoughData": "Pick two different numeric columns with at least two rows where X varies.",
  "modal.failed": "Could not read the result: {message}",
  "viz.epicurve.cases": "Cases",
  "viz.epicurve.other": "Other",
  "viz.epicurve.unknown": "Unknown",
  "viz.ratePlot.title": "Rate plot",
  "viz.ratePlot.rateText": "{rate, number}",
  "viz.ratePlot.intervalText": "{rate, number} ({lower, number}–{upper, number})",
  "viz.ratePlot.empty": "No rows have a numeric rate to plot."
}
```

- [ ] **Step 6: Write the failing test for `makeRateTextFromPoint`**

`plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.test.ts`:

```ts
import { makePluginTranslator } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeRateTextFromPoint } from "./makeRateTextFromPoint";
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";

const BRONX: RatePlotPoint = {
  label: "Bronx",
  rate: 12.4,
  lower: 9.8,
  upper: 15.6,
};

function _makeText(point: RatePlotPoint, locale = "en-US"): string {
  return makeRateTextFromPoint({
    point,
    t: makePluginTranslator({ locale, messages: { en: englishMessages } }),
  });
}

describe("makeRateTextFromPoint", () => {
  it("writes the rate followed by its interval", () => {
    expect(_makeText(BRONX)).toBe("12.4 (9.8–15.6)");
  });

  it("formats the numbers in the translator's locale", () => {
    expect(_makeText(BRONX, "de-DE")).toBe("12,4 (9,8–15,6)");
  });

  it("writes only the rate when a bound is missing", () => {
    expect(_makeText({ ...BRONX, upper: undefined })).toBe("12.4");
  });

  it("groups the digits of a large rate", () => {
    expect(
      _makeText({ label: "All", rate: 1234.5, lower: 1000, upper: 1500 }),
    ).toBe("1,234.5 (1,000–1,500)");
  });
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.test.ts`
Expected: FAIL, `Failed to resolve import "./makeRateTextFromPoint"`.

- [ ] **Step 8: Implement `makeRateTextFromPoint`**

`plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.ts`:

```ts
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import type { AvandarApi } from "@avandar/plugin-sdk";

/**
 * Writes a rate plot row's rate as text, with its interval when both bounds
 * are numbers, for example "12.4 (9.8–15.6)". The numbers are formatted in
 * the translator's locale, so a viewer in `de-DE` reads "12,4 (9,8–15,6)".
 */
export function makeRateTextFromPoint(options: {
  point: RatePlotPoint;
  t: AvandarApi["i18n"]["t"];
}): string {
  const { point, t } = options;
  if (point.lower === undefined || point.upper === undefined) {
    return t("viz.ratePlot.rateText", { rate: point.rate });
  }
  return t("viz.ratePlot.intervalText", {
    rate: point.rate,
    lower: point.lower,
    upper: point.upper,
  });
}
```

- [ ] **Step 9: Run the test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Write the failing render test for `RatePlot`**

`plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.test.tsx`:

```tsx
import { makePluginTranslator, PluginVizProvider } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { RatePlot } from "./RatePlot";
import type { PluginVizComponentProps } from "@avandar/plugin-sdk";

const BOROUGH_ROWS: PluginVizComponentProps["rows"] = [
  { borough: "Bronx", rate: 12.4, lower: 9.8, upper: 15.6 },
  { borough: "Queens", rate: 8.1, lower: 6.2, upper: 10.3 },
];

const RATE_SETTINGS: PluginVizComponentProps["settings"] = {
  labelColumn: "borough",
  rateColumn: "rate",
  lowerColumn: "lower",
  upperColumn: "upper",
  sort: "rate",
};

function _renderRatePlot(rows: PluginVizComponentProps["rows"]): void {
  render(
    <MantineProvider>
      <PluginVizProvider
        vizId="rate-plot"
        t={makePluginTranslator({
          locale: "en-US",
          messages: { en: englishMessages },
        })}
      >
        <RatePlot
          rows={rows}
          columns={[
            { name: "borough", dataType: "varchar" },
            { name: "rate", dataType: "double" },
            { name: "lower", dataType: "double" },
            { name: "upper", dataType: "double" },
          ]}
          settings={RATE_SETTINGS}
          isTruncated={false}
          width={600}
          height={400}
        />
      </PluginVizProvider>
    </MantineProvider>,
  );
}

describe("RatePlot", () => {
  it("draws a chart named by its translated title at the given size", () => {
    _renderRatePlot(BOROUGH_ROWS);
    const chart = screen.getByRole("img", { name: "Rate plot" });
    expect(chart).toHaveAttribute("width", "600");
    expect(chart).toHaveAttribute("height", "400");
  });

  it("shows a message instead of a chart when no row has a numeric rate", () => {
    _renderRatePlot([{ borough: "Bronx", rate: null }]);
    expect(
      screen.getByText("No rows have a numeric rate to plot."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.test.tsx`
Expected: FAIL, `Failed to resolve import "./RatePlot"`.

- [ ] **Step 12: Add the chart row type**

`plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.types.ts`:

```ts
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";

/**
 * One row of the data `RatePlot` hands to the chart: the point, the whisker
 * lengths below and above the rate for `ErrorBar`, and the tooltip text.
 */
export type RatePlotChartRow = RatePlotPoint &
  Readonly<{
    rateError: readonly [number, number] | undefined;
    rateText: string;
  }>;
```

- [ ] **Step 13: Add the tooltip**

`plugins/epidemiology/src/ratePlot/RatePlot/RatePlotTooltip.tsx` (`active` and
`payload` are the prop names Recharts passes to tooltip content, so they keep those
names):

```tsx
import { Stack, Text } from "@avandar/plugin-ui";
import type { RatePlotChartRow } from "./RatePlot.types";
import type { ReactNode } from "react";

/** The props the chart's `Tooltip` passes to its `content` component. */
type Props = {
  active: boolean;
  /** The hovered entries. Each holds its chart row as `payload`. */
  payload: ReadonlyArray<Readonly<{ payload?: RatePlotChartRow }>>;
};

/**
 * The rate plot's tooltip: the hovered row's label, then its rate and
 * interval, such as "12.4 (9.8–15.6)". `RatePlotChart` passes it to the
 * chart's `Tooltip` as its content.
 */
export function RatePlotTooltip({
  active,
  payload,
}: Readonly<Props>): ReactNode {
  const row = payload[0]?.payload;
  if (!active || row === undefined) {
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
        {row.label}
      </Text>
      <Text size="sm">{row.rateText}</Text>
    </Stack>
  );
}
```

- [ ] **Step 14: Add the chart**

`plugins/epidemiology/src/ratePlot/RatePlot/RatePlotChart.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Scatter,
  Tooltip,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import { RatePlotTooltip } from "./RatePlotTooltip";
import type { RatePlotChartRow } from "./RatePlot.types";
import type { ReactNode } from "react";

type Props = {
  chartRows: readonly RatePlotChartRow[];
  width: number;
  height: number;
};

const CHART_MARGIN = { top: 8, right: 24, bottom: 8, left: 8 };

/** Room for row labels such as "Staten Island" beside the chart. */
const LABEL_AXIS_WIDTH = 120;

const WHISKER_CAP_WIDTH = 6;

/**
 * Draws the rate plot's rows as dots on a horizontal rate axis, one row per
 * label, with whiskers for rows that have both bounds. `RatePlot` renders it
 * once it has at least one row to draw.
 */
export function RatePlotChart({
  chartRows,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  const axisProps = {
    stroke: theme.gridColor,
    tick: { fill: theme.textColor },
  };
  return (
    <ComposedChart
      width={width}
      height={height}
      layout="vertical"
      data={chartRows}
      margin={CHART_MARGIN}
      role="img"
      title={t("viz.ratePlot.title")}
    >
      <CartesianGrid stroke={theme.gridColor} horizontal={false} />
      <XAxis type="number" dataKey="rate" {...axisProps} />
      <YAxis
        type="category"
        dataKey="label"
        width={LABEL_AXIS_WIDTH}
        {...axisProps}
      />
      <Tooltip cursor={false} content={RatePlotTooltip} />
      <Scatter dataKey="rate" fill={theme.colors[0]}>
        <ErrorBar
          dataKey="rateError"
          direction="x"
          stroke={theme.textColor}
          width={WHISKER_CAP_WIDTH}
        />
      </Scatter>
    </ComposedChart>
  );
}
```

- [ ] **Step 15: Add the component**

`plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.tsx`:

```tsx
import { useT } from "@avandar/plugin-sdk";
import { Stack, Text } from "@avandar/plugin-ui";
import { useMemo } from "react";
import { makeRatePlotPointsFromRows } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import { makeRateTextFromPoint } from "../makeRateTextFromPoint/makeRateTextFromPoint";
import { RatePlotChart } from "./RatePlotChart";
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import type { RatePlotChartRow } from "./RatePlot.types";
import type {
  AvandarApi,
  PluginVizComponentProps,
  PluginVizSettingValue,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

function _getColumnFromSetting(
  value: PluginVizSettingValue | undefined,
): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * How far the whiskers reach below and above the rate. Undefined, so no
 * whiskers are drawn, unless both bounds are numbers.
 */
function _getRateErrorFromPoint(
  point: RatePlotPoint,
): readonly [number, number] | undefined {
  if (point.lower === undefined || point.upper === undefined) {
    return undefined;
  }
  return [
    Math.max(0, point.rate - point.lower),
    Math.max(0, point.upper - point.rate),
  ];
}

function _makeChartRowsFromInput(options: {
  rows: PluginVizComponentProps["rows"];
  settings: PluginVizComponentProps["settings"];
  t: AvandarApi["i18n"]["t"];
}): RatePlotChartRow[] {
  const { rows, settings, t } = options;
  const labelColumn = _getColumnFromSetting(settings.labelColumn);
  const rateColumn = _getColumnFromSetting(settings.rateColumn);
  if (labelColumn === undefined || rateColumn === undefined) {
    return [];
  }
  const points = makeRatePlotPointsFromRows({
    rows,
    labelColumn,
    rateColumn,
    lowerColumn: _getColumnFromSetting(settings.lowerColumn),
    upperColumn: _getColumnFromSetting(settings.upperColumn),
    sort: settings.sort === "label" ? "label" : "rate",
  });
  return points.map((point) => {
    return {
      ...point,
      rateError: _getRateErrorFromPoint(point),
      rateText: makeRateTextFromPoint({ point, t }),
    };
  });
}

/**
 * Draws rates with confidence intervals, one horizontal row per label: a dot
 * at the rate and whiskers from the lower to the upper bound, for example
 * incidence per 100,000 by borough. A row without both bounds, or a chart
 * without both bound columns set, has no whiskers. With no numeric rate to
 * draw, it says so instead.
 */
export function RatePlot(props: PluginVizComponentProps): ReactNode {
  const { rows, settings, width, height } = props;
  const t = useT();
  const chartRows = useMemo(() => {
    return _makeChartRowsFromInput({ rows, settings, t });
  }, [rows, settings, t]);
  if (chartRows.length === 0) {
    return (
      <Stack h={height} justify="center" align="center">
        <Text size="sm" c="dimmed">
          {t("viz.ratePlot.empty")}
        </Text>
      </Stack>
    );
  }
  return <RatePlotChart chartRows={chartRows} width={width} height={height} />;
}
```

- [ ] **Step 16: Run the rate plot tests and confirm they pass**

Run: `pnpm vitest run plugins/epidemiology/src/ratePlot`
Expected: PASS (3 files, 14 tests). No "act" or "unhandled error" warnings.

- [ ] **Step 17: Type-check and lint the plugin**

Run: `pnpm exec tsc -p plugins/epidemiology/tsconfig.json --noEmit && pnpm exec eslint plugins/epidemiology`
Expected: exit 0, no output. (Needs Tasks 3, 4, and 5: the SDK viz types,
`PluginVizProvider`, and `@avandar/plugin-ui/charts` in the ESLint allowlist.)

- [ ] **Step 18: Commit**

```bash
git add plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.ts \
  plugins/epidemiology/src/ratePlot/makeRatePlotPointsFromRows/makeRatePlotPointsFromRows.test.ts \
  plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.ts \
  plugins/epidemiology/src/ratePlot/makeRateTextFromPoint/makeRateTextFromPoint.test.ts \
  plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.tsx \
  plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.types.ts \
  plugins/epidemiology/src/ratePlot/RatePlot/RatePlotChart.tsx \
  plugins/epidemiology/src/ratePlot/RatePlot/RatePlotTooltip.tsx \
  plugins/epidemiology/src/ratePlot/RatePlot/RatePlot.test.tsx \
  plugins/epidemiology/locales/en.json
git commit -m "$(cat <<'EOF'
feat(plugins): add the rate plot chart component

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: Epidemiology: manifest `vizTypes`, locale strings, `definePlugin` wiring

**Files:**
- Modify: `plugins/epidemiology/ava.yaml` (adds `contributes.vizTypes`)
- Modify: `plugins/epidemiology/locales/en.json` (adds every manifest string for the two chart types; groups keys by feature)
- Modify: `plugins/epidemiology/src/index.tsx` (adds `vizTypes` to `definePlugin`)
- Test: `plugins/epidemiology/src/index.test.tsx` (adds two cases)

**Context:** This task makes the two chart types real: the manifest declares them (C1,
Tasks 1 and 2 add the schema, the locale-key checks for titles, setting labels, and
option labels, and the icon checks for `vizTypes[].icon`), and the entry registers their
code under the manifest ids (C2: `definePlugin({ commands, vizTypes })`, Task 3). The
YAML is the spec's epicurve table verbatim plus the rate plot table. The icons are real
Tabler icons, matched exact-case: `chart-histogram` is `IconChartHistogram` and
`chart-dots-3` is `IconChartDots3`, both present in
`node_modules/@tabler/icons-react/dist/esm/icons/`. Manifest strings are plain text (no
ICU arguments). Checked against Task 1 and Task 2 as written in their plan: both entries
pass `PluginVizTypeSchema` (ids match `COMMAND_ID_PATTERN`, keys match
`^[a-zA-Z][a-zA-Z0-9]*$`, `segmented` has at least two options, `required` booleans),
`getIssuesFromVizTypes` reports nothing (no duplicate ids, keys, or option values; each
`default` is one of its segmented option values; no `default` on a column picker), and
Task 2's key collector (`title`, each setting `label`, each option `label`, `number.unit`,
`text.placeholder`) finds 19 distinct `%key%` strings, all defined in the `en.json`
below. There is no `number` or `text` control, so no unit or placeholder key is needed.
The YAML parses with the manifest package's own settings (YAML 1.2, `core` schema,
`uniqueKeys`).

- [ ] **Step 1: Write the failing entry tests**

Replace `plugins/epidemiology/src/index.test.tsx` with:

```tsx
import { AvandarProvider } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import plugin from "./index";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

function _makeApi(openModal: AvandarApi["ui"]["openModal"]): AvandarApi {
  return {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: [
        { name: "age", dataType: "bigint" },
        { name: "weight", dataType: "double" },
      ],
      rowCount: 5,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows: [], isTruncated: false });
      }),
    },
    ui: { openModal, openDrawer: vi.fn(), notify: vi.fn() },
    i18n: {
      t: (key) => {
        return `translated:${key}`;
      },
    },
  };
}

describe("the epidemiology plugin", () => {
  it("opens the linear regression modal under its translated title", () => {
    const openModal = vi.fn();
    const api = _makeApi(openModal);
    void plugin.commands["regression.linear"]?.(api);
    expect(openModal).toHaveBeenCalledTimes(1);
    const [options] = openModal.mock.calls[0] as Parameters<
      AvandarApi["ui"]["openModal"]
    >;
    expect(options.title).toBe("translated:regression.linear.title");
    render(
      <MantineProvider>
        <AvandarProvider api={api}>{options.content}</AvandarProvider>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("button", { name: "translated:modal.fit" }),
    ).toBeInTheDocument();
  });

  it("draws the epicurve chart type with the epicurve transform", () => {
    expect(plugin.vizTypes.epicurve?.transform).toBe(makeEpicurveFromRows);
  });

  it("draws the rate-plot chart type with the RatePlot component", () => {
    expect(plugin.vizTypes["rate-plot"]?.Component).toBe(RatePlot);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx`
Expected: FAIL, `Tests  2 failed | 1 passed (3)`. The new tests report
`expected undefined to be [Function makeEpicurveFromRows]` and
`expected undefined to be [Function RatePlot]`, because `definePlugin` defaults
`vizTypes` to `{}`.

- [ ] **Step 3: Register the chart types in the entry**

Replace `plugins/epidemiology/src/index.tsx` with:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import { RegressionModal } from "./RegressionModal/RegressionModal";

// A plugin entry exports its definition, not a component, so there is nothing
// for fast refresh to track.
// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
```

- [ ] **Step 4: Run the entry test and confirm it passes**

Run: `pnpm vitest run plugins/epidemiology/src/index.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Declare the chart types in the manifest**

Replace `plugins/epidemiology/ava.yaml` with:

```yaml
# The epidemiology plugin: statistical tools for public-health data.
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
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
  vizTypes:
    - id: epicurve
      title: "%viz.epicurve.title%"
      icon: chart-histogram
      render: transform
      settings:
        - key: dateColumn
          label: "%viz.epicurve.dateColumn%"
          control: { kind: columnPicker, dataType: temporal }
          required: true
        - key: countColumn
          label: "%viz.epicurve.countColumn%"
          control: { kind: columnPicker, dataType: numeric }
        - key: interval
          label: "%viz.epicurve.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.epicurve.interval.day%" }
              - { value: epiWeek, label: "%viz.epicurve.interval.epiWeek%" }
              - { value: month, label: "%viz.epicurve.interval.month%" }
          default: epiWeek
        - key: stackByColumn
          label: "%viz.epicurve.stackByColumn%"
          control: { kind: columnPicker, dataType: text }
    - id: rate-plot
      title: "%viz.ratePlot.title%"
      icon: chart-dots-3
      render: component
      settings:
        - key: labelColumn
          label: "%viz.ratePlot.labelColumn%"
          control: { kind: columnPicker, dataType: text }
          required: true
        - key: rateColumn
          label: "%viz.ratePlot.rateColumn%"
          control: { kind: columnPicker, dataType: numeric }
          required: true
        - key: lowerColumn
          label: "%viz.ratePlot.lowerColumn%"
          control: { kind: columnPicker, dataType: numeric }
        - key: upperColumn
          label: "%viz.ratePlot.upperColumn%"
          control: { kind: columnPicker, dataType: numeric }
        - key: sort
          label: "%viz.ratePlot.sort%"
          control:
            kind: segmented
            options:
              - { value: rate, label: "%viz.ratePlot.sort.rate%" }
              - { value: label, label: "%viz.ratePlot.sort.label%" }
          default: rate
```

- [ ] **Step 6: Add the manifest strings**

Replace `plugins/epidemiology/locales/en.json` with (same keys as before plus the 15
manifest strings, grouped by feature):

```json
{
  "plugin.name": "Epidemiology",
  "plugin.description": "Statistical modeling tools for public-health data.",
  "regression.linear.title": "Linear regression",
  "modal.xColumn": "Predictor (X)",
  "modal.yColumn": "Outcome (Y)",
  "modal.fit": "Fit regression",
  "modal.slope": "Slope",
  "modal.intercept": "Intercept",
  "modal.rSquared": "R²",
  "modal.n": "Rows used",
  "modal.notAvailable": "Not available",
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result.",
  "modal.notEnoughData": "Pick two different numeric columns with at least two rows where X varies.",
  "modal.failed": "Could not read the result: {message}",
  "viz.epicurve.title": "Epicurve",
  "viz.epicurve.dateColumn": "Date column",
  "viz.epicurve.countColumn": "Case count column",
  "viz.epicurve.interval": "Interval",
  "viz.epicurve.interval.day": "Day",
  "viz.epicurve.interval.epiWeek": "Epi week",
  "viz.epicurve.interval.month": "Month",
  "viz.epicurve.stackByColumn": "Stack by column",
  "viz.epicurve.cases": "Cases",
  "viz.epicurve.other": "Other",
  "viz.epicurve.unknown": "Unknown",
  "viz.ratePlot.title": "Rate plot",
  "viz.ratePlot.labelColumn": "Label column",
  "viz.ratePlot.rateColumn": "Rate column",
  "viz.ratePlot.lowerColumn": "Lower bound column",
  "viz.ratePlot.upperColumn": "Upper bound column",
  "viz.ratePlot.sort": "Sort by",
  "viz.ratePlot.sort.rate": "Rate",
  "viz.ratePlot.sort.label": "Label",
  "viz.ratePlot.rateText": "{rate, number}",
  "viz.ratePlot.intervalText": "{rate, number} ({lower, number}–{upper, number})",
  "viz.ratePlot.empty": "No rows have a numeric rate to plot."
}
```

- [ ] **Step 7: Run every epidemiology test**

Run: `pnpm vitest run plugins/epidemiology`
Expected: PASS (12 files, 109 tests). The 5 test files that existed before this slice,
plus the 7 added in Tasks 21 to 23.

- [ ] **Step 8: Validate the plugin with the CLI**

Run: `pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs plugin validate epidemiology`
Expected: the build prints `Build success`, then:

```text
🔎 Validating plugins/epidemiology...
  Checking ava.yaml, locales, icons, and dependencies...
  Running tsc...
  Running eslint...
✅ plugins/epidemiology is valid.
```

A `%key%` missing from `en.json`, an unknown icon, or a bad `default` fails at the first
check and names the field.

- [ ] **Step 9: Confirm the bundled manifest still compiles in the Vite plugin tests**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: PASS (every file).

- [ ] **Step 10: Commit**

```bash
git add plugins/epidemiology/ava.yaml \
  plugins/epidemiology/locales/en.json \
  plugins/epidemiology/src/index.tsx \
  plugins/epidemiology/src/index.test.tsx
git commit -m "$(cat <<'EOF'
feat(plugins): declare the epicurve and rate plot chart types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: `docs/plugin-authoring.md`: chart types

**Files:**
- Modify: `docs/plugin-authoring.md` (intro lines 3-19; the scaffold listing at line 56 and the epidemiology tree at lines 64-86; two new sections after "## 5. Write the command" at line 185; renumber "## 6."-"## 8." to "## 8."-"## 10."; the allowlist list and the paragraph at lines 273-293; one new rule at the end)

**Context:** The guide gains the chart type material the spec's "Documentation" section
asks for, written in the guide's existing style: numbered imperative `##` sections, no
`###` headings, short paragraphs, `| Key | Rule |`-style tables, and fenced examples.
Because a single section would need subsections, the material is two numbered
sections: "6. Declare a chart type" (manifest `vizTypes`, settings controls) and "7. Draw
a chart type" (both render paths with short examples, `@avandar/plugin-ui/charts`, the
bundled-code rule, errors, and the limits: 200 rows for a transform that returns bars,
500 for line and area, and 1,000 rows for a component). Nothing links to the old section
numbers (checked with `grep -rn plugin-authoring` over the repo), so renumbering is safe.
The facts come from the contracts (C1, C2, C3, C5), the placeholder copy in Task 7's
`PluginVizPlaceholder` ("Plugin not available", "Invalid chart settings", "*Title*
couldn't render", "This chart couldn't load" with "Retry"), Task 14's "Choose a *setting
label*" lines and `PLUGIN_VIZ_COMPONENT_ROW_LIMIT` (1,000), and
`shared/config/GlobalVizConfig.ts` (`VIZ_RENDER_LIMITS`: bar 200, line and area 500).

- [ ] **Step 1: Update the introduction**

Replace lines 3-19 (from "This guide shows how to add" through the design background
paragraph) with:

```markdown
This guide shows how to add a bundled plugin that puts a command in the Data
Explorer toolbar or adds a chart type. It assumes a checkout of this repository
with dependencies installed, and the `ava` CLI on your `PATH` (run
`pnpm build:ava-cli` if it is not).

Bundled plugins live in `plugins/<name>/`, are listed in
`plugins/bundled.yaml`, and are built into the app as lazy chunks. A workspace
without a plugin installed downloads none of that plugin's manifest, code, or
styles, unless a page shows a chart saved from that plugin. Once a settings
admin installs it in Settings → Plugins, its code downloads only when someone
first uses one of its commands or views one of its charts. The small plugin
host and one installations request load for every workspace.

Design background:
`docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`,
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`, and
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`. Package
exports: the READMEs of `@avandar/plugin-manifest`, `@avandar/plugin-sdk`, and
`@avandar/plugin-ui` (see `docs/avandar-packages.md`).
```

- [ ] **Step 2: Update the scaffold listing and the reference tree**

In section 2, replace the line

```text
  src/index.tsx       export default definePlugin({ commands: { ... } })
```

with

```text
  src/index.tsx       export default definePlugin({ commands, vizTypes })
```

Then replace the epidemiology tree (the `text` block that starts with
`plugins/epidemiology/src/`) with:

```text
plugins/epidemiology/src/
  index.tsx                                  the plugin entry
  index.test.tsx
  epicurve/                                  the epicurve chart type
    getBucketStartFromDate/
      getBucketStartFromDate.ts
      getBucketStartFromDate.test.ts
    getDateFromCellValue/
      getDateFromCellValue.ts
      getDateFromCellValue.test.ts
    makeEpicurveFromRows/
      makeEpicurveFromRows.ts                its transform
      makeEpicurveFromRows.test.ts
  fitLinearRegression/
    fitLinearRegression.ts
    fitLinearRegression.test.ts
  getNumberFromCellValue/
    getNumberFromCellValue.ts
    getNumberFromCellValue.test.ts
  makeRegressionPointsFromRows/
    makeRegressionPointsFromRows.ts
    makeRegressionPointsFromRows.test.ts
  ratePlot/                                  the rate plot chart type
    makeRatePlotPointsFromRows/
      makeRatePlotPointsFromRows.ts
      makeRatePlotPointsFromRows.test.ts
    makeRateTextFromPoint/
      makeRateTextFromPoint.ts
      makeRateTextFromPoint.test.ts
    RatePlot/
      RatePlot.tsx                           its component
      RatePlot.test.tsx
      RatePlot.types.ts
      RatePlotChart.tsx
      RatePlotTooltip.tsx
  RegressionModal/
    RegressionModal.tsx
    RegressionModal.test.tsx
    RegressionModal.constants.ts
    RegressionModal.types.ts
    ColumnPickers.tsx
    FitOutcome.tsx
    FittedResult.tsx
    RegressionForm.tsx
    makeStatisticTextFromNumber/
      makeStatisticTextFromNumber.ts
      makeStatisticTextFromNumber.test.ts
```

- [ ] **Step 3: Add the two chart type sections**

Insert the following after the end of "## 5. Write the command" (after its closing
`RowCount` example block, before "## 6. Translate plugin strings"):

`````markdown
## 6. Declare a chart type

A chart type adds an entry to the chart type pickers of the Data Explorer and
the dashboard editor, in a "Plugins" group that lists the chart types of
installed, enabled, and approved plugins. Declare it under
`contributes.vizTypes` in `ava.yaml`. Avandar draws its settings form from the
manifest, so the picker and the form never load plugin code.

```yaml
contributes:
  vizTypes:
    - id: epicurve
      title: "%viz.epicurve.title%"
      icon: chart-histogram
      render: transform
      settings:
        - key: dateColumn
          label: "%viz.epicurve.dateColumn%"
          control: { kind: columnPicker, dataType: temporal }
          required: true
        - key: interval
          label: "%viz.epicurve.interval%"
          control:
            kind: segmented
            options:
              - { value: day, label: "%viz.epicurve.interval.day%" }
              - { value: epiWeek, label: "%viz.epicurve.interval.epiWeek%" }
              - { value: month, label: "%viz.epicurve.interval.month%" }
          default: epiWeek
```

| Key | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, and hyphens in dot-separated words, like a command id. Unique within the plugin. Its code in `definePlugin` uses the same key |
| `title` | A `%key%` reference. It names the chart in the picker and in its error messages |
| `icon` | A Tabler icon name, checked like command icons |
| `render` | `transform` or `component` (see the next section) |
| `settings[].key` | A letter, then letters and digits. Unique within the chart type |
| `settings[].label` | A `%key%` reference |
| `settings[].control` | One of the controls below |
| `settings[].required` | Optional, `false` by default. Until every required setting has a value, the chart area asks for each one ("Choose a Date column") instead of drawing the chart |
| `settings[].default` | Optional. It must fit the control, as the table below says |

Settings render in the order they are declared, in one group. When someone
picks the chart type, each setting starts at its `default`, and each required
column picker starts at the first result column of its data type. Optional
column pickers start unset, so one column is never bound to several roles,
such as a rate and its bounds, at once.

| `kind` | Options | The chart receives | `default` |
| --- | --- | --- | --- |
| `columnPicker` | `dataType`: `numeric`, `temporal`, `text`, or `any`. Omitted means `any` | The column's name | Not allowed |
| `select` | `options`: one or more `{ value, label }`, each `label` a `%key%` | The chosen `value` | One of the `value`s |
| `segmented` | `options`: two or more `{ value, label }` | The chosen `value` | One of the `value`s |
| `switch` | None | `true` or `false` | A boolean |
| `number` | `min`, `max`, `step`, and `unit` (a `%key%`), all optional | A number | A number from `min` to `max` |
| `text` | `placeholder` (a `%key%`), optional | The text | A string |
| `color` | None | A color, as text | A string |

Duplicate ids, setting keys, or option values, a `default` that does not fit
its control, and a `number` whose `min` is above its `max` all fail
validation. Chart types need no permission: a chart receives only rows its
viewer can already see.

## 7. Draw a chart type

Give each chart type its code under `vizTypes` in `definePlugin`, keyed by its
manifest `id`. A `transform` chart type provides `transform`, and a
`component` chart type provides `Component`:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";

// eslint-disable-next-line react-refresh/only-export-components
export default definePlugin({
  vizTypes: {
    epicurve: { transform: makeEpicurveFromRows },
    "rate-plot": { Component: RatePlot },
  },
});
```

Both receive a `PluginVizInput`:

| Field | Meaning |
| --- | --- |
| `rows` | The query result, as rows keyed by column name |
| `columns` | `[{ name, dataType }]`, the result's columns |
| `settings` | The chart's settings, keyed by `key`. A column setting holds the column's name. An unset setting is `undefined` |
| `isTruncated` | True when the chart received fewer rows than the result has |

A **transform** is a pure, synchronous function that turns the input into new
rows and a `PluginChartSpec`, and Avandar draws the result with its own bar,
line, or area chart. It suits charts that aggregate, so it receives the whole
fetched result, and Avandar runs it again only when the rows or settings
change. Its second argument carries `i18n.t` and the viewer's `locale`, for
labels such as "Other":

```ts
import type {
  PluginVizContext,
  PluginVizInput,
  PluginVizTransformResult,
} from "@avandar/plugin-sdk";

export function makeCountsFromRows(
  input: PluginVizInput,
  context: PluginVizContext,
): PluginVizTransformResult {
  const groupColumn = String(input.settings.groupColumn);
  const counts = new Map<string, number>();
  input.rows.forEach((row) => {
    const group = String(row[groupColumn]);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  });
  return {
    rows: [...counts].map(([group, count]) => {
      return { group, count };
    }),
    chart: {
      kind: "bar",
      xColumn: "group",
      series: [{ column: "count", label: context.i18n.t("chart.count") }],
    },
  };
}
```

| `PluginChartSpec` field | Meaning |
| --- | --- |
| `kind` | `bar`, `line`, or `area` |
| `xColumn` | The output column on the x axis |
| `xColumnType` | Optional. `date` formats the x values as dates in the viewer's locale. Write dates as `YYYY-MM-DD` |
| `series` | One `{ column, label }` per series. `label` is plain text, so translate it with `context.i18n.t` |
| `layout` | Optional. `stack` stacks the series, and `group` sets them side by side |
| `barGap` | Optional. `none` removes the space between bars, as an epicurve or a histogram needs |

Name output columns yourself, such as `series_0`, rather than after data
values: a value such as `a.b` would be read as a nested path, and a value
could collide with another column. Avandar checks the returned spec, and that
`xColumn` and every series column exist in the returned rows. It draws at
most as many rows as its own chart of that kind: 200 for `bar`, and 500 for
`line` and `area`. When the input was truncated, a note under the chart reads
"Built from the first N rows of the result."

A **component** draws the chart itself, at the width and height Avandar
measured, from the Recharts building blocks in `@avandar/plugin-ui/charts`.
It suits charts Avandar's own charts cannot draw, such as error bars. It
receives the input plus `width` and `height`, and at most 1,000 rows:

```tsx
import { useT } from "@avandar/plugin-sdk";
import {
  ComposedChart,
  Scatter,
  useChartTheme,
  XAxis,
  YAxis,
} from "@avandar/plugin-ui/charts";
import type { PluginVizComponentProps } from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

export function DotPlot(props: PluginVizComponentProps): ReactNode {
  const t = useT();
  const theme = useChartTheme();
  return (
    <ComposedChart
      width={props.width}
      height={props.height}
      data={props.rows}
      role="img"
      title={t("chart.title")}
    >
      <XAxis type="number" dataKey={String(props.settings.xColumn)} />
      <YAxis type="number" dataKey={String(props.settings.yColumn)} />
      <Scatter fill={theme.colors[0]} />
    </ComposedChart>
  );
}
```

Inside a chart component, `useT()` works as it does in command UI.
`useAvandar()` throws an error naming the chart type, because a chart has no
workspace and no invocation: public dashboard links show charts to people
outside any workspace. Give the chart an accessible name, as `role="img"` and
`title` do above.

`@avandar/plugin-ui/charts` exports:

| Export | Purpose |
| --- | --- |
| `ComposedChart`, `Scatter`, `ErrorBar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ReferenceLine`, `Legend` | Recharts building blocks |
| `useChartTheme()` | `{ colors, textColor, gridColor }`: Avandar's chart colors, text color, and grid color for the current color scheme, dark mode included |

Recharts already ships in the app, so these exports add no bytes to its
chunks.

A saved chart renders from the plugin code this deployment bundles, wherever
it is shown: the Data Explorer, the dashboard editor, a workspace dashboard,
and a public dashboard link. Avandar does not check that the plugin is
installed. Installing only decides whether a plugin's chart types appear in
the pickers, so a chart saved before an uninstall keeps rendering. When
something goes wrong, the chart area shows what, and the rest of the page is
unaffected:

| Failure | The chart area shows |
| --- | --- |
| The plugin or chart type is not bundled | "Plugin not available", naming the plugin. The stored chart is kept |
| The stored settings fail validation | "Invalid chart settings". The stored chart is kept |
| A required setting is unset | "Choose a *setting label*", one line per unset setting, such as "Choose a Date column" |
| The plugin code fails to load | "This chart couldn't load", with a "Retry" button |
| The transform throws or returns an invalid spec, or the component throws | "*Title* couldn't render". The error is logged with the plugin and chart ids |
`````

- [ ] **Step 4: Renumber the later sections**

Change these three headings:

| Old | New |
| --- | --- |
| `## 6. Translate plugin strings` | `## 8. Translate plugin strings` |
| `## 7. Stay within the import allowlist` | `## 9. Stay within the import allowlist` |
| `## 8. Validate` | `## 10. Validate` |

- [ ] **Step 5: Update the import allowlist section**

In "## 9. Stay within the import allowlist", replace the bullet

```markdown
- `@avandar/plugin-sdk` and `@avandar/plugin-ui`
```

with

```markdown
- `@avandar/plugin-sdk`, `@avandar/plugin-ui`, and `@avandar/plugin-ui/charts`
```

Then replace the section's last paragraph (from "Build plugin UI only from" to the end
of the section) with:

```markdown
Build plugin UI only from `@avandar/plugin-ui`: `Alert`, `Badge`, `Button`,
`Divider`, `Group`, `Loader`, `NumberInput`, `Select`, `SimpleGrid`, `Stack`,
`Table`, `Text`, `TextInput`, and `Title`, and draw component charts only from
`@avandar/plugin-ui/charts`. Every API call is async or fire-and-forget and
passes serializable data, with three exceptions: the synchronous `i18n.t`, the
React `content` of `openModal` and `openDrawer`, and chart components, which
are React components too.
```

- [ ] **Step 6: Add the chart rule to "Rules to keep in mind"**

Append this bullet at the end of the file, after the "Never bundle a contract plugin"
bullet:

```markdown
- **Keep chart type ids and setting keys stable.** Dashboards and Data
  Explorer links store them. A renamed chart type id shows the missing-plugin
  placeholder wherever the old one was saved, and a renamed setting key loses
  that setting's value.
```

- [ ] **Step 7: Check the edit**

Run: `grep "^## " docs/plugin-authoring.md`
Expected:

```text
## 1. Create the plugin
## 2. Lay out the code
## 3. Write the manifest
## 4. Decide when a command shows
## 5. Write the command
## 6. Declare a chart type
## 7. Draw a chart type
## 8. Translate plugin strings
## 9. Stay within the import allowlist
## 10. Validate
## Rules to keep in mind
```

Run: `grep -c "$(printf '\342\200\224')" docs/plugin-authoring.md`
Expected: `0` (the guide has no em dashes; the `printf` writes the em dash
character, U+2014, so this plan does not have to).

Run: `grep -n "^### " docs/plugin-authoring.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add docs/plugin-authoring.md
git commit -m "$(cat <<'EOF'
docs(plugins): document plugin chart types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: Extract and compile the translation catalogs

**Files:**
- Modify: `src/i18n/locales/*/messages.po` (8 locales: `ar`, `en`, `es`, `fr`, `pt`, `sw`, `zh-Hans`, `zh-Hant`; extracted)
- Modify: `src/i18n/locales/*/messages.ts` (compiled; never hand-edited)

**Context:** Tasks 7, 10, 11, 14, 15, 18, 19, and 20 add host strings through Lingui (for
example "Plugin chart", the bar gap labels, the placeholder messages, the truncation
note, and the "Plugins" picker group). `lingui.config.ts` extracts from `src`, `shared`,
and `packages/web`, so plugin strings in `plugins/*/locales` are not part of these
catalogs. Non-English catalogs get the new ids with empty `msgstr`, which fall back to
English at runtime (`fallbackLocales.default: "en"`). Filling them is `pnpm
translations`, an LLM-backed step outside this plan. `pnpm i18n:check` runs `lingui
extract --overwrite` and then `git diff --exit-code src/i18n/locales`, so it passes only
after the extracted catalogs are committed.

- [ ] **Step 1: Extract**

Run: `pnpm i18n:extract`
Expected: `✔ Done`, then a "Catalog statistics" table in which every locale has the
same "Total count", larger than before this slice, and each non-English locale's
"Missing" count grew by the number of new messages.

- [ ] **Step 2: Confirm the new host strings were picked up**

Run: `grep -c 'msgid "Plugin chart"' src/i18n/locales/en/messages.po`
Expected: `1`.

Run: `git status --short src/i18n/locales`
Expected: the 8 `messages.po` files listed as modified.

- [ ] **Step 3: Compile**

Run: `pnpm i18n:compile`
Expected: `Compiling message catalogs…` then `Done in ...`.

Run: `git status --short src/i18n/locales`
Expected: 16 modified files, a `messages.po` and a `messages.ts` per locale.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/ar/messages.po src/i18n/locales/ar/messages.ts \
  src/i18n/locales/en/messages.po src/i18n/locales/en/messages.ts \
  src/i18n/locales/es/messages.po src/i18n/locales/es/messages.ts \
  src/i18n/locales/fr/messages.po src/i18n/locales/fr/messages.ts \
  src/i18n/locales/pt/messages.po src/i18n/locales/pt/messages.ts \
  src/i18n/locales/sw/messages.po src/i18n/locales/sw/messages.ts \
  src/i18n/locales/zh-Hans/messages.po src/i18n/locales/zh-Hans/messages.ts \
  src/i18n/locales/zh-Hant/messages.po src/i18n/locales/zh-Hant/messages.ts
git commit -m "$(cat <<'EOF'
chore(i18n): extract and compile the plugin chart strings

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Confirm the catalog check passes**

Run: `pnpm i18n:check`
Expected: the extract table, then exit 0 with no diff output.

---

### Task 27: E2E: an epicurve from the Data Explorer renders on a public dashboard link

**Files:**
- Create: `tests/e2e/plugins-epidemiology-epicurve.spec.ts`

**Context:** This spec proves acceptance item 1 end to end through the UI: the epicurve
renders in the Data Explorer, in the dashboard editor, and on the public `/d/<id>` link
opened in a fresh browser context with no session, which has no workspace layout and no
`PluginHost` (C5: the registry reads the bundled index and never checks installs). It
follows `AGENTS.md` and `docs/rules/e2e-testing.md`: every behavior under test is driven
through the UI (install in Settings → Plugins, the chart type select, "Save to
dashboard", the editor's Save, the share modal's "Anyone with the link" and "Publish
publicly"); the admin client is used only to read the workspace id, for one
precondition before the first page load, and for teardown. The precondition deletes the
owner's dashboards in the per-worker E2E workspace, as `save-to-dashboard.spec.ts` does,
so "Save to dashboard" opens on its create form (it shows the list instead whenever the
user owns a dashboard) and the free plan's single shareable dashboard is available. The
result is a literal query of 21 dates, which the default epi-week epicurve groups into 4
MMWR weeks, each with cases, so each draws exactly one bar (a zero bar draws no
rectangle). The editor's Save runs before publishing because publishing copies the
saved config and the share modal refuses to publish over unsaved changes. Teardown
deletes only what the spec created: dashboards with its unique name (and their share
rows; the query reads no dataset, so publishing uploaded no snapshot files) and the
plugin's install row. It relies on Tasks 14, 18, and 19 (renderer, "Epicurve" option in
the picker's "Plugins" group, dashboard block storage) and on Task 24's manifest title.
The locators match those tasks as written: Task 18's `VizTypeSelect` is a Mantine
`Select` with `aria-label` "Visualization Type" (matched by `/visualization type/i`), its
plugin options sit in a `role="group"` named "Plugins", and each option's label is the
localized manifest title, so the option is "Epicurve" and the input then shows
"Epicurve". Picking it builds the config with `AvaPluginVizConfigs.makeConfig` from the
result columns, which fills the required `dateColumn` with `onset_date` (type `date`).
Task 14 draws a transform chart through `PluginVizTransformChart` and Task 6's
`UiVizConfigRenderer`, which renders the built-in `BarChart` (Mantine `BarChart`,
`type="stacked"` for `layout: "stack"`), so `.recharts-bar-rectangle path` is the same
selector `save-to-dashboard-renders-in-editor.spec.ts` asserts. Before the bars appear
the chart area shows Task 14's chart loader while the plugin chunk downloads; if the
assertion fails, the failure screenshot shows which state it stopped in ("Choose a Date
column", "Plugin not available", or "Epicurve couldn't render"). Task 19 notes the
dashboard editor's chart type field is also a "Visualization Type" combobox; this spec
does not change the chart type in the editor. The local per-test timeout stays at the
config default of 45 seconds.

- [ ] **Step 1: Confirm the worktree runs on its own Supabase project**

Run: `ava supabase status`
Expected: a green first line reporting this worktree on its switched project, not the
shared `avandar` stack. If it is yellow, run `ava supabase switch` and re-check before
going on. Stop any `pnpm dev` on this worktree's Vite port: the E2E preflight requires the
port to be free.

- [ ] **Step 2: Write the spec**

`tests/e2e/plugins-epidemiology-epicurve.spec.ts`:

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { parseDashboardIdFromEditorUrl } from "./helpers/parseDashboardIdFromEditorUrl";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
} from "./helpers/seedDashboard";
import { openShareModal } from "./helpers/shareModalFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import { installDuckDbExtensionCache } from "./setup/installDuckDbExtensionCache";
import { stubFeaturebaseSdk } from "./setup/stubFeaturebaseSdk";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type {
  Browser,
  BrowserContext,
  FrameLocator,
  Locator,
  Page,
} from "@playwright/test";

/**
 * Twenty-one consecutive onset dates from Monday 2024-01-01. They fall in four
 * MMWR weeks, starting 2023-12-31 (6 dates), 2024-01-07 (7), 2024-01-14 (7),
 * and 2024-01-21 (1), so the default epi-week epicurve draws four bars.
 */
const ONSET_SQL =
  "SELECT DATE '2024-01-01' + CAST(day_offset AS INTEGER) AS onset_date " +
  "FROM range(0, 21) AS t(day_offset)";
const EPICURVE_BAR_COUNT = 4;
const PLUGIN_ID = "avandar.epidemiology";

function _getPluginCard(page: Page): Locator {
  return page.getByRole("region", { name: "Epidemiology" });
}

/** The bars a Recharts bar chart draws, on a page or in the editor canvas. */
function _getBars(scope: Page | FrameLocator): Locator {
  return scope.locator(".recharts-bar-rectangle path");
}

async function _installPlugin(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/settings/plugins`);
  const card = _getPluginCard(page);
  await expect(card.getByText("Not installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await card.getByRole("button", { name: "Install" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Install" })
    .click();
  await expect(card.getByText("Installed", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/** Runs the onset query in the Data Explorer and picks the epicurve. */
async function _pickEpicurve(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(
    `/${workspaceSlug}/data-explorer?sql=${encodeURIComponent(ONSET_SQL)}`,
  );
  await dismissBlockingOverlays(page);
  await expect(
    page.getByRole("columnheader", { name: "onset_date" }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
  await openDataExplorerDrawerTab({ page, tab: "visualizations" });
  const vizTypeSelect = page.getByRole("combobox", {
    name: /visualization type/i,
  });
  await vizTypeSelect.click();
  await page
    .getByRole("option", { name: "Epicurve", exact: true })
    .click({ timeout: MEDIUM_WAIT });
  await expect(vizTypeSelect).toHaveValue("Epicurve", { timeout: SHORT_WAIT });
}

/**
 * Saves the chart on screen to a new dashboard, then opens that dashboard's
 * editor from the confirmation.
 *
 * @returns The new dashboard's id, read from the editor's URL.
 */
async function _saveToNewDashboard(
  options: Readonly<{ page: Page; dashboardName: string }>,
): Promise<string> {
  const { page, dashboardName } = options;
  await page.getByRole("button", { name: /^save$/i }).click();
  await page.getByRole("menuitem", { name: /save to dashboard/i }).click();
  await page.getByLabel(/dashboard name/i).fill(dashboardName);
  await page.getByRole("button", { name: /create dashboard & save/i }).click();
  await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
    timeout: LONG_WAIT,
  });
  await page.getByText("Open dashboard", { exact: true }).click();
  await expect(page).toHaveURL(/\/dashboards\/edit\/[0-9a-f-]{36}/i, {
    timeout: LONG_WAIT,
  });
  const dashboardId = parseDashboardIdFromEditorUrl(page.url());
  if (dashboardId === undefined) {
    throw new Error(`Could not parse a dashboard id from ${page.url()}`);
  }
  return dashboardId;
}

/**
 * Publishes the open dashboard to the web through the share modal. Saves
 * first, because publishing copies the saved config and the modal refuses to
 * publish while the editor holds unsaved changes.
 */
async function _publishPublicly(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/dashboard saved successfully/i)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await openShareModal(page);
  const dialog = page.getByRole("dialog", { name: /^Share / });
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Anyone with the link" }).click();
  await dialog.getByRole("button", { name: "Publish publicly" }).click();
  await expect(dialog).toContainText("This dashboard is public.", {
    timeout: LONG_WAIT,
  });
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * A browser context with no session, as a visitor following a shared link
 * has. It gets the same DuckDB extension cache and Featurebase stub every
 * spec's own context gets.
 */
async function _openVisitorContext(
  options: Readonly<{ browser: Browser; baseURL: string | undefined }>,
): Promise<BrowserContext> {
  const context = await options.browser.newContext({
    baseURL: options.baseURL,
    reducedMotion: "reduce",
  });
  await installDuckDbExtensionCache(context);
  await stubFeaturebaseSdk(context);
  return context;
}

/**
 * Deletes the dashboards this spec created, found by their unique name, with
 * every share row pointing at them, which unpublishes them. Their query reads
 * no dataset, so publishing uploaded no snapshot files to remove.
 */
async function _deleteDashboardsNamed(
  options: Readonly<{
    admin: AvaSupabaseDBClient;
    workspaceId: string;
    dashboardName: string;
  }>,
): Promise<void> {
  const { admin, workspaceId, dashboardName } = options;
  const { data: dashboards } = await admin
    .from("dashboards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", dashboardName);
  const dashboardIds = (dashboards ?? []).map((dashboard) => {
    return dashboard.id;
  });
  if (dashboardIds.length === 0) {
    return;
  }
  await admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .in("resource_id", dashboardIds);
  await deleteDashboardsByIds({ admin, dashboardIds });
}

test.describe("Epidemiology plugin epicurve", () => {
  test("an epicurve saved from the Data Explorer renders on the dashboard's public link", async ({
    page,
    browser,
    baseURL,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    const dashboardName = `E2E epicurve ${crypto.randomUUID().slice(0, 8)}`;
    let visitorContext: BrowserContext | undefined;
    // "Save to dashboard" opens on its create form only for a user with no
    // dashboards, and the free plan allows one shareable dashboard.
    await deleteAllDashboardsForOwner({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
    });
    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _installPlugin({ page, workspaceSlug });
      await _pickEpicurve({ page, workspaceSlug });
      await expect(_getBars(page)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: MEDIUM_WAIT,
      });

      const dashboardId = await _saveToNewDashboard({ page, dashboardName });
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(_getBars(editorFrame)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: LONG_WAIT,
      });
      await _publishPublicly(page);

      visitorContext = await _openVisitorContext({ browser, baseURL });
      const visitorPage = await visitorContext.newPage();
      await visitorPage.goto(`/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(_getBars(visitorPage)).toHaveCount(EPICURVE_BAR_COUNT, {
        timeout: LONG_WAIT,
      });
    } finally {
      await visitorContext?.close();
      await _deleteDashboardsNamed({ admin, workspaceId, dashboardName });
      // Removes only the install this spec made through Settings.
      await admin
        .from("plugin_installations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("plugin_id", PLUGIN_ID);
    }
  });
});
```

- [ ] **Step 3: Lint and type-check the spec**

Run: `pnpm exec eslint tests/e2e/plugins-epidemiology-epicurve.spec.ts && pnpm exec tsc -p tsconfig.app.json --noEmit`
Expected: exit 0, no output (`tsconfig.app.json` includes `tests`).

- [ ] **Step 4: Run the spec on its own**

Run: `pnpm test:e2e plugins-epidemiology-epicurve.spec.ts`
Expected: `✓  1 tests/e2e/plugins-epidemiology-epicurve.spec.ts:... › Epidemiology plugin
epicurve › an epicurve saved from the Data Explorer renders on the dashboard's public
link`, then `1 passed`, in well under 45 seconds. If it times out, find the slow step in
the trace (`pnpm exec playwright show-trace` on the failure's trace, or the failure
screenshot) and fix the cause; never raise the timeout above 45 seconds locally.

- [ ] **Step 5: Confirm the teardown left nothing behind**

Run the spec a second time: `pnpm test:e2e plugins-epidemiology-epicurve.spec.ts`
Expected: `1 passed` again. A leftover install would fail the first step at "Not
installed", and a leftover dashboard would put the save modal in list mode.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/plugins-epidemiology-epicurve.spec.ts
git commit -m "$(cat <<'EOF'
test(plugins): cover an epicurve from the Data Explorer to a public link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 28: Final verification, every check on its own

**Files:**
- None, unless `pnpm format` changes files (Step 1).

**Context:** Every check CI and the spec's "Acceptance" item 5 rely on, run one at a
time so a failure names its check. Order matters in two places. `pnpm type-check` ends
with `deno check ... packages/shared`, and `deno.json` has no `dist/` exclusion, so it
fails on `packages/shared/plugin-manifest/dist/index.d.ts` once `pnpm verify:packages`
has built it: type-check runs before `verify:packages` (Step 3 also deletes a `dist`
left by an earlier run), and Step 10 deletes it again afterwards. The E2E specs, the
only checks that touch the database, run only after `ava supabase status` confirms this
worktree is on its own switched project. When a step fails, fix the cause in the task
that owns it, commit the fix there, and rerun that step before moving on. Do not run
`ava supabase restore` and do not merge: tell the user the branch is ready and that
they run `ava supabase restore` when they finish validating it.

- [ ] **Step 1: Format**

Run: `pnpm format`
Expected: `Formatting N changed file(s)...` and exit 0, with `git status --short`
showing no tracked changes afterwards. Exit 2 means the formatters changed files: review
`git diff`, then commit them by path:

```bash
git add <each file pnpm format changed>
git commit -m "$(cat <<'EOF'
chore(plugins): format the chart type changes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: exit 0. ESLint and Stylelint print no errors. The trailing React Doctor report
is informational (`|| true`) and may list pre-existing warnings.

- [ ] **Step 3: Type-check**

Run: `rm -rf packages/shared/plugin-manifest/dist && pnpm type-check`
Expected: exit 0 (`tsc -b`, the video producer check, and `deno check`; needs `deno` on
`PATH`).

- [ ] **Step 4: Frontend tests**

Run: `pnpm test:frontend`
Expected: `Test Files  N passed (N)` with no failures (the run takes several minutes).

- [ ] **Step 5: Package tests**

Run: `pnpm --filter "./packages/**" test`
Expected: every package prints `Test Files ... passed` and `Done`; no failures. Since
Task 5 gave `@avandar/plugin-ui` a `test` script, this run includes it.

- [ ] **Step 6: The plugin-ui tests on their own**

Run: `pnpm --filter @avandar/plugin-ui test`
Expected: PASS (1 file, 6 tests: `useChartTheme`).

- [ ] **Step 7: CLI tests**

Run: `pnpm test:ava-cli`
Expected: `Test Files  N passed (N)`, no failures.

- [ ] **Step 8: Catalog check**

Run: `pnpm i18n:check`
Expected: the extract table, then exit 0 with no diff.

- [ ] **Step 9: Validate the plugin**

Run: `pnpm --filter @avandar/ava-cli build && node apps/ava-cli/dist/main.cjs plugin validate epidemiology`
Expected: ends with `✅ plugins/epidemiology is valid.`

- [ ] **Step 10: Verify the packages, then remove the build output Deno would read**

Run: `pnpm verify:packages`
Expected: the publint section prints `@avandar/plugin-ui         ok`, the
arethetypeswrong section lists `avandar-plugin-manifest-0.1.0.tgz ok`,
`avandar-plugin-sdk-0.1.0.tgz ok`, and `avandar-plugin-ui-0.1.0.tgz ok`, and the run
ends with `All packages verified.`

Run: `rm -rf packages/shared/plugin-manifest/dist`
Expected: no output.

- [ ] **Step 11: Plugin bundle check**

Run: `pnpm check:plugin-bundle`
Expected: `✓ built in ...` and no line starting `Plugin bundle check failed:`.

If the only failure is the budget line ("The plugin host adds N bytes..."), Tasks 17 to
20 pushed the host past Task 16's budget, which left about 1,000 bytes of headroom.
Repeat Task 16 Steps 8 to 11 now (read N, set `HOST_BUDGET_BYTES` to N rounded up to
the next 1,000 plus 2,000, update its comment with the measured value, re-run, commit).
Any other failure is a real leak: fix the import that pulled plugin code into a host
chunk instead.

- [ ] **Step 12: Desktop SQLite migrations**

Run: `pnpm desktop:sqlite:check-migrations`
Expected: ends with `[check-sqlite-migrations] clean: no drift`.

- [ ] **Step 13: Confirm the database switch**

Run: `ava supabase status`
Expected: a green first line, this worktree on its own switched project. If yellow, run
`ava supabase switch` and re-check. Stop any `pnpm dev` on this worktree's Vite port.

- [ ] **Step 14: The regression E2E spec**

Run: `pnpm test:e2e plugins-epidemiology-regression.spec.ts`
Expected: `1 passed`.

- [ ] **Step 15: The epicurve E2E spec**

Run: `pnpm test:e2e plugins-epidemiology-epicurve.spec.ts`
Expected: `1 passed`.

- [ ] **Step 16: Confirm a clean tree**

Run: `git status --short`
Expected: no tracked changes other than the switch's own `supabase/config.toml` and
`.env.development` edits, which must never be staged or committed.

---

## Known risks

Each task was verified in a scratch copy of the repo while planning, except the E2E spec (Task 27), `ava plugin validate`, the Deno half of `pnpm type-check` for some groups, and the bundle check's final budget. Watch for these:

1. **Public publishing without a dataset (Task 27).** No existing spec publishes a dashboard publicly or opens a `/d/` link. The spec assumes a dashboard whose only block runs a literal query (no dataset) can be published and renders on the public route. If publishing or the public read path needs a dataset snapshot, seed a dataset through the existing UI helper (`tests/e2e/helpers/importDatasetViaUi.ts`) and query it instead.
2. **Bundle budget headroom (Tasks 16 and 28).** With Tasks 11 to 15 in place the host measured 35,156 bytes, so Task 16 sets the budget to 38,000. Tasks 17 to 20 add host imports to the Explorer and dashboard chunks. If Task 28's bundle check fails only on the budget line, re-measure as its Step 11 says.
3. **One Recharts copy (Task 5).** `@avandar/plugin-ui` must resolve the same Recharts as the app, or plugin chunks bundle a second copy. Task 5 Step 3 checks the lockfile and falls back to `pnpm dedupe`.
4. **Free plan limit (Task 27).** A free workspace keeps one shareable dashboard. The spec deletes the test user's dashboards in the E2E workspace before the first page load so "Save to dashboard" opens on its create form.
5. **Stale catalogs (Tasks 6 to 25).** New and moved Lingui strings fail `pnpm i18n:check` until Task 26. Non-English locales stay untranslated (English fallback) until someone runs `pnpm translations`.
6. **Flaky timing test.** `withRateLimit`'s timing test can fail under full-suite load and passes when run alone. It predates this work.
7. **Placeholder design.** `PluginVizPlaceholder` reuses the existing chart error callout pattern and was not run through the `impeccable` skill. The design detector may comment on it.
8. **Truncation note.** No caller passes `isTruncated: true` yet, so the "Built from the first N rows" note documented in Task 25 cannot appear until a caller has a truncation signal.
