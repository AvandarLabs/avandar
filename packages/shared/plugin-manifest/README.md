# @avandar/plugin-manifest

The Avandar plugin manifest: its Zod schema, the `ava.yaml` compiler, the
`when` condition evaluator, and the Node-side reader for plugin folders.

| Entry | Use it for |
| --- | --- |
| `@avandar/plugin-manifest` | Everything below, for build tools and the CLI |
| `@avandar/plugin-manifest/runtime` | Browser code: types, `evaluateWhenCondition`, `getLocalizedTextFromManifestStrings`, `SlotFactRegistry`. No Zod or YAML |
| `@avandar/plugin-manifest/node` | Node only: `readPluginDirectory`, `readBundledPlugins`, `readBundledPluginFolders` |

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
