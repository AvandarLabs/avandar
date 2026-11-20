import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import mantine from "postcss-preset-mantine";
import simpleVars from "postcss-simple-vars";
import { isProductFile } from "./isProductFile";
import { rememberProductFile } from "./rememberProductFile";
import type { ImportedFiles } from "./buildProduct.types";
import type { OnLoadArgs, OnLoadResult } from "esbuild";

/**
 * Loads one stylesheet for the esbuild bundle, with Mantine's breakpoint
 * variables and mixins processed, as a global or local (module) CSS file.
 *
 * Used by the product build's load hook for each `.css` file it bundles.
 */
export async function compileProductCss(
  args: Readonly<OnLoadArgs>,
  imported: ImportedFiles,
): Promise<OnLoadResult> {
  const bytes = await fs.readFile(args.path);
  if (isProductFile(args.path)) {
    rememberProductFile({ imported, file: args.path, contents: bytes });
  }
  const variables = {
    "mantine-breakpoint-xs": "36em",
    "mantine-breakpoint-sm": "48em",
    "mantine-breakpoint-md": "62em",
    "mantine-breakpoint-lg": "75em",
    "mantine-breakpoint-xl": "88em",
  };
  const processed = await postcss([
    simpleVars({ variables }),
    mantine(),
  ]).process(bytes.toString(), { from: args.path });
  return {
    contents: processed.css,
    loader: args.path.endsWith(".module.css") ? "local-css" : "css",
    resolveDir: path.dirname(args.path),
  };
}
