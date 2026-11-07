import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
import { parse } from "yaml";
import { z } from "zod";
import type { PluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";

const BundledPluginsSchema = z.strictObject({
  plugins: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
});

/** The plugin folders `plugins/bundled.yaml` lists, in order. */
export function readBundledPluginFolders(repoRoot: string): string[] {
  const bundledListPath = join(repoRoot, "plugins/bundled.yaml");
  if (!existsSync(bundledListPath)) {
    return [];
  }
  const parsed: unknown = parse(readFileSync(bundledListPath, "utf8")) ?? {};
  return BundledPluginsSchema.parse(parsed).plugins;
}

/**
 * Reads and validates every plugin this deployment bundles. Throws when two
 * folders declare the same plugin id.
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
