import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { PluginManifestSchema } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import { getLocalizedKey } from "@plugin-manifest/strings/resolveManifestString.ts";
import { parseDocument } from "yaml";
import type { PluginManifest } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/resolveManifestString.ts";

/** A validated manifest plus the locale strings its `%key%` references need. */
export type CompiledPluginManifest = Readonly<{
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
}>;

function _parseYaml(options: {
  yamlText: string;
  sourcePath: string;
}): unknown {
  const document = parseDocument(options.yamlText, {
    version: "1.2",
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: document.errors.map((error) => {
        return error.message;
      }),
    });
  }
  try {
    // `maxAliasCount: 0` rejects every alias: manifests have no use for
    // them, and they enable exponential expansion.
    return document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: [error instanceof Error ? error.message : String(error)],
    });
  }
}

function _pickReferencedStrings(options: {
  locales: PluginLocaleMessages;
  keys: readonly string[];
}): PluginLocaleMessages {
  return Object.fromEntries(
    Object.entries(options.locales).map(([locale, messages]) => {
      const picked = options.keys.flatMap((key) => {
        const text = messages[key];
        return text === undefined ? [] : [[key, text] as const];
      });
      return [locale, Object.fromEntries(picked)];
    }),
  );
}

/** Every message key the manifest's user-facing strings reference. */
export function getManifestStringKeys(manifest: PluginManifest): string[] {
  const values = [
    manifest.name,
    manifest.description,
    ...manifest.contributes.commands.map((command) => {
      return command.title;
    }),
  ];
  return values.flatMap((value) => {
    const key = getLocalizedKey(value);
    return key === undefined ? [] : [key];
  });
}

/**
 * Parses an `ava.yaml` as strict YAML 1.2, validates it, and resolves its
 * `%key%` strings against the plugin's locale files. Throws
 * `PluginManifestError` listing every problem.
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
  const englishMessages = locales.en;
  if (englishMessages === undefined) {
    throw new PluginManifestError({
      sourcePath,
      issues: ["locales/en.json is required"],
    });
  }
  const keys = getManifestStringKeys(result.data);
  const missingKeys = keys.filter((key) => {
    return englishMessages[key] === undefined;
  });
  if (missingKeys.length > 0) {
    throw new PluginManifestError({
      sourcePath,
      issues: missingKeys.map((key) => {
        return `"${key}" is referenced but missing from locales/en.json`;
      }),
    });
  }
  return {
    manifest: result.data,
    strings: _pickReferencedStrings({ locales, keys }),
  };
}
