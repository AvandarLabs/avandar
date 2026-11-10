# @avandar/plugin-manifest

The Avandar plugin manifest: its Zod schema, the `ava.yaml` compiler, the
`when` condition evaluator, and the Node-side reader for plugin folders.

| Entry | Use it for |
| --- | --- |
| `@avandar/plugin-manifest` | Everything in `runtime` plus the schema, compiler, error class, and helpers, for build tools and the CLI. Pulls in Zod and YAML, but no Node-only modules |
| `@avandar/plugin-manifest/runtime` | Browser code: types, `evaluateWhenCondition`, `getLocalizedTextFromManifestStrings`, `SlotFactRegistry`, `SLOT_IDS`. No Zod or YAML at runtime |
| `@avandar/plugin-manifest/node` | Node only: `readPluginDirectory`, `readBundledPlugins`, `readBundledPluginFolders`, `emitPluginAiToolsFile`, `assertUniquePluginAiToolNames` |

## Exports

| Export | Kind | Entries | Purpose |
| --- | --- | --- | --- |
| `evaluateWhenCondition` | Function | main, runtime | Evaluates a `when` condition against slot facts |
| `getLocalizedTextFromManifestStrings` | Function | main, runtime | Gets the text for a `%key%` string in a locale, falling back to the base language, then English |
| `SlotFactRegistry` | Constant | main, runtime | Every slot and the facts it exposes to `when` conditions |
| `SLOT_IDS` | Constant | main, runtime | Every slot ID, as a non-empty tuple |
| `compileManifest` | Function | main | Parses and validates `ava.yaml`, and picks the strings it references |
| `getMessageKeysFromManifest` | Function | main | Gets the message keys a manifest references |
| `PluginManifestError` | Class | main | Error listing every manifest problem in the stage that failed |
| `PluginManifestSchema` | Schema | main | The strict Zod schema for `ava.yaml` |
| `PLUGIN_PERMISSIONS` | Constant | main | The permissions a manifest may request |
| `APPROVED_PLUGIN_DEPENDENCIES` | Constant | main | The npm allowlist for plugins |
| `getUnapprovedDependenciesFromPackageJson` | Function | main | Gets the `package.json` dependencies a plugin may not use |
| `makeTablerComponentNameFromIconName` | Function | main | Makes the Tabler component name for an icon name, such as `trending-up` to `IconTrendingUp` |
| `readPluginDirectory` | Function | node | Reads and validates one plugin folder |
| `readBundledPlugins` | Function | node | Reads and validates every plugin folder listed in `plugins/bundled.yaml` |
| `readBundledPluginFolders` | Function | node | Gets the folder names listed in `plugins/bundled.yaml` |
| `emitPluginAiToolsFile` | Function | node | Makes the text of `pluginAiTools.gen.ts`: the data-agent tools every bundled plugin declares. Run it with `pnpm vite-script packages/shared/plugin-manifest/src/node/emitPluginAiTools.ts` |
| `assertUniquePluginAiToolNames` | Function | node | Throws when two plugins declare a data-agent tool with the same name, naming both plugins |
| `PluginManifest` | Type | main, runtime | A manifest that passed the schema, with omitted lists defaulted to empty |
| `PluginCommand` | Type | main, runtime | A command declared under `contributes.commands` |
| `PluginMenuEntry` | Type | main, runtime | One entry in a slot's menu list: a command and an optional `when` |
| `PluginAiTool` | Type | main | A tool declared under `contributes.aiTools`: a name, description, and JSON Schema parameters |
| `PluginVizType` | Type | main, runtime | A chart type declared under `contributes.vizTypes` |
| `PluginVizSetting` | Type | main, runtime | One setting of a chart type, edited in the chart's settings form |
| `PluginVizSettingControl` | Type | main, runtime | The control a chart setting uses, such as `columnPicker` or `segmented` |
| `PluginPermission` | Type | main, runtime | A permission a plugin may request |
| `CompiledPluginManifest` | Type | main, runtime | A validated manifest plus the locale strings it references |
| `PluginLocaleMessages` | Type | main, runtime | Locale code to message key to text |
| `PluginDirectory` | Type | node | A plugin folder read from disk and fully validated |
| `SlotId` | Type | main, runtime | A contribution slot, such as `dataExplorer.toolbar` |
| `FactType` | Type | main, runtime | The value type of a slot fact: `boolean`, `number`, or `string` |
| `FactValue` | Type | main, runtime | A value a slot exposes as a fact |
| `WhenCondition` | Type | main, runtime | A declarative condition deciding whether a contribution is shown |
| `WhenFacts` | Type | main, runtime | The facts a slot exposes to `when` conditions, keyed by fact name |
