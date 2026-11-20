import path from "node:path";
import { PRODUCT_ROOT } from "./buildProduct.constants";

/**
 * Whether a file lives in product code or public assets, as opposed to the
 * adapter or an installed dependency.
 *
 * Used by `getProductSourceFileFromImport`, `compileProductSource`,
 * `compileProductCss`, and `loadProductAsset` to decide what a build owns.
 */
export function isProductFile(file: string): boolean {
  return ["src", "shared", "packages", "public"].some((folder) => {
    return file.startsWith(`${path.join(PRODUCT_ROOT, folder)}${path.sep}`);
  });
}
