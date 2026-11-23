import { makeEsModuleFromYaml } from "./makeEsModuleFromYaml";
import type { Plugin } from "vite";

/**
 * Vite plugin transforming authored `.yaml` and `.yml` imports into ES
 * modules with the parsed value as the default export, matching Node tooling.
 * Registered by `makeShowcaseViteConfigFromAppRoot` for the showcase build.
 */
export const yamlVitePlugin: Plugin = {
  name: "authored-yaml",
  transform: (source, id) => {
    return /\.ya?ml$/.test(id)
      ? { code: makeEsModuleFromYaml(source), map: null }
      : undefined;
  },
};
