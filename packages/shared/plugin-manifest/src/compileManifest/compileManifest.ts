import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
import { PluginManifestSchema } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import { getMessageKeyFromManifestString } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";
import { parseStrictYaml } from "@plugin-manifest/yaml/parseStrictYaml/parseStrictYaml.ts";
import type {
  PluginManifest,
  PluginVizSettingControl,
  PluginVizType,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";

/** A validated manifest plus the locale strings its `%key%` references need. */
export type CompiledPluginManifest = Readonly<{
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
}>;

type RawLocales = Readonly<Record<string, unknown>>;

function _isPlainObject(value: unknown): value is RawLocales {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _parseYaml(options: {
  yamlText: string;
  sourcePath: string;
}): unknown {
  const value = parseStrictYaml(options);
  if (value === null) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: ["ava.yaml is empty"],
    });
  }
  return value;
}

function _getLocaleShapeIssues(locales: RawLocales): string[] {
  const requiredIssues = Object.hasOwn(locales, "en")
    ? []
    : ["locales/en.json is required"];
  const objectIssues = Object.entries(locales).flatMap(
    ([language, messages]) => {
      return _isPlainObject(messages)
        ? []
        : [
            `locales/${language}.json must be a JSON object of message keys to strings`,
          ];
    },
  );
  return [...requiredIssues, ...objectIssues];
}

function _getReferencedKeyIssues(options: {
  locales: RawLocales;
  keys: readonly string[];
}): string[] {
  return Object.entries(options.locales).flatMap(([language, messages]) => {
    if (!_isPlainObject(messages)) {
      return [];
    }
    return options.keys.flatMap((key) => {
      if (!Object.hasOwn(messages, key)) {
        // Only English is required to be complete. Other locales fall back.
        return language === "en"
          ? [`"${key}" is referenced but missing from locales/en.json`]
          : [];
      }
      return typeof messages[key] === "string"
        ? []
        : [`"${key}" in locales/${language}.json must be a string`];
    });
  });
}

function _pickReferencedStrings(options: {
  locales: RawLocales;
  keys: readonly string[];
}): PluginLocaleMessages {
  return Object.fromEntries(
    Object.entries(options.locales).map(([locale, messages]) => {
      const picked = options.keys.flatMap((key) => {
        const text =
          _isPlainObject(messages) && Object.hasOwn(messages, key)
            ? messages[key]
            : undefined;
        return typeof text === "string" ? [[key, text] as const] : [];
      });
      return [locale, Object.fromEntries(picked)];
    }),
  );
}

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

/**
 * Turns the text of a plugin's `ava.yaml` and its locale files into a
 * validated manifest plus only the strings that manifest references, ready
 * for a build to bundle.
 *
 * Throws `PluginManifestError` listing every problem within the first stage
 * that fails: YAML parsing, then schema validation, then locale files.
 */
export function compileManifest(options: {
  yamlText: string;
  sourcePath: string;
  locales: PluginLocaleMessages;
}): CompiledPluginManifest {
  const { sourcePath, locales } = options;
  const result = PluginManifestSchema.safeParse(_parseYaml(options));
  if (!result.success) {
    throw new PluginManifestError({
      sourcePath,
      issues: result.error.issues.map((issue) => {
        return `${issue.path.join(".") || "(root)"}: ${issue.message}`;
      }),
    });
  }
  const keys = getMessageKeysFromManifest(result.data);
  const localeIssues = [
    ..._getLocaleShapeIssues(locales),
    ..._getReferencedKeyIssues({ locales, keys }),
  ];
  if (localeIssues.length > 0) {
    throw new PluginManifestError({ sourcePath, issues: localeIssues });
  }
  return {
    manifest: result.data,
    strings: _pickReferencedStrings({ locales, keys }),
  };
}
