import { makeEsModuleFromYaml } from "./makeEsModuleFromYaml";
import type { Plugin } from "vite";

/**
 * Parse authored YAML for Vite as the same default export Node tooling
 * sees.
 */
export const yamlVitePlugin: Plugin = {
  name: "authored-yaml",
  transform: (source, id) => {
    return /\.ya?ml$/.test(id)
      ? { code: makeEsModuleFromYaml(source), map: null }
      : undefined;
  },
};
