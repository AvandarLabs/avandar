import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
import { parseStrictYaml } from "@plugin-manifest/yaml/parseStrictYaml/parseStrictYaml.ts";
import { z } from "zod";
import type { PluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";

const BUNDLED_LIST_PATH = "plugins/bundled.yaml";

// A folder name is joined onto `plugins/`, so it must not hold a separator
// or `..`.
const FOLDER_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const BundledPluginsSchema = z.strictObject({
  // `plugins:` with every entry commented out parses as null.
  plugins: z
    .array(
      z.string().regex(FOLDER_NAME_PATTERN, {
        error: (issue) => {
          return `"${String(issue.input)}" must be a lowercase kebab-case folder name`;
        },
      }),
    )
    .nullish(),
});

/**
 * Gets the plugin folder names `plugins/bundled.yaml` lists, in order, or none
 * when the file is missing or lists nothing.
 *
 * Use it when only the folder names are needed, for example to list the
 * bundled plugins without validating each one. Throws `PluginManifestError`
 * when the file is not valid.
 */
export function readBundledPluginFolders(repoRoot: string): string[] {
  const bundledListPath = join(repoRoot, BUNDLED_LIST_PATH);
  if (!existsSync(bundledListPath)) {
    return [];
  }
  const parsed = parseStrictYaml({
    yamlText: readFileSync(bundledListPath, "utf8"),
    sourcePath: BUNDLED_LIST_PATH,
  });
  if (parsed === null) {
    return [];
  }
  const result = BundledPluginsSchema.safeParse(parsed);
  if (!result.success) {
    throw new PluginManifestError({
      sourcePath: BUNDLED_LIST_PATH,
      issues: result.error.issues.map((issue) => {
        return `${issue.path.join(".") || "(root)"}: ${issue.message}`;
      }),
    });
  }
  return result.data.plugins ?? [];
}

/**
 * Reads and validates every plugin folder listed in `plugins/bundled.yaml`,
 * so a build or a validation command can treat the whole bundled set as
 * trusted. Throws when a folder is invalid or two folders declare the same
 * plugin id.
 */
export function readBundledPlugins(repoRoot: string): PluginDirectory[] {
  const plugins = readBundledPluginFolders(repoRoot).map((folderName) => {
    return readPluginDirectory({
      directory: join(repoRoot, "plugins", folderName),
      repoRoot,
    });
  });
  const seenIds = new Set<string>();
  plugins.forEach((plugin) => {
    const pluginId = plugin.compiled.manifest.id;
    if (seenIds.has(pluginId)) {
      throw new Error(
        `${pluginId} is bundled twice (plugins/${plugin.folderName})`,
      );
    }
    seenIds.add(pluginId);
  });
  return plugins;
}
