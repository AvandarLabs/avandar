export {
  evaluateWhenCondition,
  getLocalizedTextFromManifestStrings,
  SLOT_IDS,
  SlotFactRegistry,
} from "@plugin-manifest/runtime.ts";
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
export {
  compileManifest,
  getMessageKeysFromManifest,
} from "@plugin-manifest/compileManifest/compileManifest.ts";
export { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
export {
  APPROVED_PLUGIN_DEPENDENCIES,
  getUnapprovedDependenciesFromPackageJson,
} from "@plugin-manifest/dependencies/getUnapprovedDependenciesFromPackageJson.ts";
export { makeTablerComponentNameFromIconName } from "@plugin-manifest/icons/makeTablerComponentNameFromIconName.ts";
export {
  PLUGIN_PERMISSIONS,
  PluginManifestSchema,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
export type { PluginAiTool } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
