import { parse } from "yaml";

/**
 * Compiles authored YAML into an ES module whose default export is the
 * parsed value. The Node import hook `load`, the esbuild `yamlPlugin`, and
 * the Vite `yamlVitePlugin` all use it, so every runtime sees the same
 * values.
 */
export function makeEsModuleFromYaml(source: string): string {
  return `export default JSON.parse(${JSON.stringify(JSON.stringify(parse(source)))});\n`;
}
