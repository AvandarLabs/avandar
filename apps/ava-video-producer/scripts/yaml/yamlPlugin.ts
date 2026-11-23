import { readFile } from "node:fs/promises";
import { makeEsModuleFromYaml } from "./makeEsModuleFromYaml";
import type { Plugin } from "esbuild";

/**
 * esbuild plugin that compiles authored YAML imports and watches each YAML
 * file, so a watched build picks up edits. Use it in any esbuild bundle that
 * imports YAML, for example a product or test probe bundle.
 */
export const yamlPlugin: Plugin = {
  name: "authored-yaml",
  setup: (builder) => {
    builder.onLoad({ filter: /\.ya?ml$/ }, async ({ path: filename }) => {
      return {
        contents: makeEsModuleFromYaml(await readFile(filename, "utf8")),
        loader: "js",
        watchFiles: [filename],
      };
    });
  },
};
