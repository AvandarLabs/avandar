import fs from "node:fs/promises";
import path from "node:path";
import { isProductFile } from "./isProductFile";
import { rememberProductFile } from "./rememberProductFile";
import type { ImportedFiles } from "./buildProduct.types";
import type { OnLoadArgs, OnLoadResult } from "esbuild";
/**
 * Loads one product JSON or image file for the esbuild bundle, as parsed
 * JSON or an inlined data URL. Undefined for a file outside product code.
 *
 * Used by the product build's load hook for each asset it bundles.
 */
export async function loadProductAsset({
  args,
  imported,
}: Readonly<{
  args: Readonly<OnLoadArgs>;
  imported: ImportedFiles;
}>): Promise<OnLoadResult | undefined> {
  if (!isProductFile(args.path)) {
    return undefined;
  }
  const bytes = await fs.readFile(args.path);
  rememberProductFile({ imported, file: args.path, contents: bytes });
  return {
    contents: bytes,
    loader: args.path.endsWith(".json") ? "json" : "dataurl",
    resolveDir: path.dirname(args.path),
  };
}
