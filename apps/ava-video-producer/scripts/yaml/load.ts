import { readFile } from "node:fs/promises";
import { makeEsModuleFromYaml } from "./makeEsModuleFromYaml";
import type { LoadFnOutput, LoadHook, LoadHookContext } from "node:module";

/**
 * Node module hook that supplies authored YAML imports as ES modules with
 * the parsed value as their default export. `registerYaml` registers it, so
 * scripts and tests run with `--import ./scripts/yaml/registerYaml.ts`.
 */
export async function load(
  url: string,
  context: LoadHookContext,
  nextLoad: Parameters<LoadHook>[2],
): Promise<LoadFnOutput> {
  const sourceUrl = new URL(url);
  if (sourceUrl.protocol !== "file:" || !/\.ya?ml$/.test(sourceUrl.pathname)) {
    return nextLoad(url, context);
  }
  return {
    format: "module",
    shortCircuit: true,
    source: makeEsModuleFromYaml(await readFile(sourceUrl, "utf8")),
  };
}
