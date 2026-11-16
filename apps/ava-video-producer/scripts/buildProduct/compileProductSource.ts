import fs from "node:fs/promises";
import path from "node:path";
import { transformAsync } from "@babel/core";
import { transform } from "esbuild";
import {
  ADAPTER_ROOT,
  PRODUCER_ROOT,
  PRODUCT_ROOT,
} from "./buildProduct.constants";
import { isProductFile } from "./isProductFile";
import { rememberProductFile } from "./rememberProductFile";
import type { Aliases, ImportedFiles } from "./buildProduct.types";
import type { OnLoadArgs, OnLoadResult } from "esbuild";

/** An adapter alias whose product path matches the file being loaded. */
function _getAliasTarget(
  file: string,
  aliases: Readonly<Aliases>,
): string | undefined {
  const match = Object.entries(aliases).find(([key]) => {
    const relative = key.startsWith("@/")
      ? `src/${key.slice(2)}`
      : key.startsWith("$/")
        ? `shared/${key.slice(2)}`
        : undefined;
    return (
      relative !== undefined &&
      file.replace(/\.[jt]sx?$/, "") === path.join(PRODUCT_ROOT, relative)
    );
  });
  return match?.[1];
}

/** One source file as JSX-preserving JavaScript with its macros expanded. */
async function _compileWithMacros(
  file: string,
  bytes: Readonly<Buffer>,
): Promise<string> {
  // Strip types with esbuild first, then expand Lingui macros with Babel.
  const typed = await transform(bytes.toString(), {
    loader: file.endsWith("x") ? "tsx" : "ts",
    jsx: "preserve",
    target: "esnext",
  });
  const compiled = await transformAsync(typed.code, {
    filename: file,
    configFile: false,
    babelrc: false,
    parserOpts: { plugins: ["jsx"] },
    plugins: [
      ["@lingui/babel-plugin-lingui-macro", { descriptorFields: "message" }],
    ],
  });
  return compiled?.code ?? "";
}

/**
 * Loads one product or adapter source file for the esbuild bundle, with its
 * TypeScript compiled and its Lingui macros expanded. Undefined when the
 * file is neither product nor adapter code.
 *
 * Used by the product build's load hook for every script file it bundles.
 */
export async function compileProductSource(
  args: Readonly<OnLoadArgs>,
  options: Readonly<{ aliases: Aliases; imported: ImportedFiles }>,
): Promise<OnLoadResult | undefined> {
  const { aliases, imported } = options;
  if (
    !isProductFile(args.path) &&
    !args.path.startsWith(`${ADAPTER_ROOT}${path.sep}`)
  ) {
    return undefined;
  }
  const bytes = await fs.readFile(args.path);
  if (isProductFile(args.path)) {
    rememberProductFile({ imported, file: args.path, contents: bytes });
  }
  const aliasTarget = _getAliasTarget(args.path, aliases);
  if (aliasTarget) {
    return {
      contents: `export * from ${JSON.stringify(path.join(PRODUCER_ROOT, aliasTarget))};`,
      loader: "js",
      resolveDir: PRODUCER_ROOT,
    };
  }
  return {
    contents: await _compileWithMacros(args.path, bytes),
    loader: "jsx",
    resolveDir: path.dirname(args.path),
  };
}
