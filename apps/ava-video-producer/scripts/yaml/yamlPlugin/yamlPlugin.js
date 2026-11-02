import { readFile } from "node:fs/promises";
import { compileYaml } from "../compileYaml.cjs";

/** Parse authored YAML for esbuild while retaining source watch dependencies. */
export const yamlPlugin = {
  name: "authored-yaml",
  setup(builder) {
    builder.onLoad({ filter: /\.ya?ml$/ }, async ({ path: filename }) => ({
      contents: compileYaml(await readFile(filename, "utf8")),
      loader: "js",
      watchFiles: [filename],
    }));
  },
};
