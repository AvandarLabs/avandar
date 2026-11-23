import fs from "node:fs/promises";
import type { PluginBuild } from "esbuild";

/**
 * Makes `?raw` imports in the product bundle return a file's text, matching
 * Vite's query of the same name.
 *
 * Used by the product build so the MapLibre worker source can be inlined.
 */
export function registerRawTextLoader(builder: PluginBuild): void {
  builder.onResolve({ filter: /\?raw$/ }, async (args) => {
    const resolved = await builder.resolve(args.path.slice(0, -4), {
      importer: args.importer,
      kind: args.kind,
      resolveDir: args.resolveDir,
    });
    return {
      path: resolved.path,
      namespace: "raw",
      errors: resolved.errors,
    };
  });
  builder.onLoad({ filter: /.*/, namespace: "raw" }, async (args) => {
    return {
      contents: await fs.readFile(args.path, "utf8"),
      loader: "text",
    };
  });
}
