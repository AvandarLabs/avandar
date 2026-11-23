import { createHash } from "node:crypto";
import { ProductSources } from "../lib/ProductSources";
import { PRODUCT_ROOT } from "./buildProduct.constants";
import type { ImportedFiles } from "./buildProduct.types";
/**
 * Records a product file's relative path and content hash in the set of
 * files a build read, so the build manifest can list its exact inputs.
 *
 * Called by `compileProductSource`, `compileProductCss`, and
 * `loadProductAsset` for each product file they load.
 */
export function rememberProductFile(
  options: Readonly<{
    imported: ImportedFiles;
    file: string;
    contents: Readonly<Buffer>;
  }>,
): void {
  const { imported, file, contents } = options;
  const relative = ProductSources.getProductSourcePathFromFile({
    root: PRODUCT_ROOT,
    filename: file,
  });
  imported.set(relative, {
    path: relative,
    sha256: createHash("sha256").update(contents).digest("hex"),
  });
}
