import { readFile } from "node:fs/promises";
import { compileYaml } from "./compileYaml.cjs";

/** Supply YAML imports as ordinary ESM default exports to Node tooling. */
export async function load(url, context, nextLoad) {
  const sourceUrl = new URL(url);
  if (sourceUrl.protocol !== "file:" || !/\.ya?ml$/.test(sourceUrl.pathname)) {
    return nextLoad(url, context);
  }
  return {
    format: "module",
    shortCircuit: true,
    source: compileYaml(await readFile(sourceUrl, "utf8")),
  };
}
