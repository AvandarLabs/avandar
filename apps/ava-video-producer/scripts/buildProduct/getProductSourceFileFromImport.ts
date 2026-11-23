import fs from "node:fs/promises";
import path from "node:path";
import {
  ADAPTER_ROOT,
  PRODUCER_ROOT,
  PRODUCT_ROOT,
} from "./buildProduct.constants";
import { isProductFile } from "./isProductFile";
import type { Aliases } from "./buildProduct.types";
import type { OnResolveArgs } from "esbuild";
/** Workspace package names and the source folder each one compiles from. */
const WORKSPACE_PACKAGES: Readonly<Record<string, string>> = {
  ui: "packages/web/ui/src",
  hooks: "packages/web/hooks/src",
  "browser-utils": "packages/web/browser-utils/src",
  utils: "packages/shared/utils/src",
  models: "packages/shared/models/src",
  modules: "packages/shared/modules/src",
  logger: "packages/shared/logger/src",
  "query-hooks": "packages/web/query-hooks/src",
  clients: "packages/shared/clients/src",
};
/** Import prefixes that map straight onto a folder of the product. */
const PRODUCT_IMPORT_PREFIXES = [
  { prefix: "@/", folder: "src" },
  { prefix: "$/", folder: "shared" },
  { prefix: "@product-assets/", folder: "public" },
] as const;
/** The first existing file for a module path, trying TS and index files. */
async function _locate(base: string): Promise<string> {
  const candidates = [
    base,
    ...[".tsx", ".ts", ".jsx", ".js", ".json"].map((extension) => {
      return `${base}${extension}`;
    }),
    ...["index.tsx", "index.ts", "index.js"].map((file) => {
      return path.join(base, file);
    }),
  ];
  const isFileList = await Promise.all(
    candidates.map(async (candidate) => {
      return (
        await fs.stat(candidate).catch(() => {
          return undefined;
        })
      )?.isFile();
    }),
  );
  const found = candidates.find((_, index) => {
    return isFileList[index];
  });
  if (!found) {
    throw new Error(`Source import not found: ${base}`);
  }
  return found;
}
/** The workspace package folder a `@name` or `@avandar/name` import maps to. */
async function _getWorkspacePackageFile(
  importPath: string,
): Promise<string | undefined> {
  const match = Object.entries(WORKSPACE_PACKAGES)
    .flatMap(([name, folder]) => {
      return [`@${name}`, `@avandar/${name}`].map((prefix) => {
        return {
          prefix,
          folder,
        };
      });
    })
    .find(({ prefix }) => {
      return importPath === prefix || importPath.startsWith(`${prefix}/`);
    });
  if (!match) {
    return undefined;
  }
  const subpath =
    importPath === match.prefix
      ? "index.ts"
      : importPath.slice(match.prefix.length + 1);
  return _locate(path.join(PRODUCT_ROOT, match.folder, subpath));
}
/**
 * Gets the product, alias, or shim file an esbuild import resolves to, or
 * undefined when the import is not ours and esbuild should resolve it.
 *
 * Used by the product build's resolve hook, so every product import lands on
 * the worktree's own source.
 */
export async function getProductSourceFileFromImport({
  args,
  aliases,
}: Readonly<{
  args: Readonly<OnResolveArgs>;
  aliases: Readonly<Aliases>;
}>): Promise<string | undefined> {
  if (args.path === "@tanstack/react-router") {
    return path.join(ADAPTER_ROOT, "shims/router.ts");
  }
  if (aliases[args.path]) {
    return _locate(path.resolve(PRODUCER_ROOT, aliases[args.path]));
  }
  const productPrefix = PRODUCT_IMPORT_PREFIXES.find(({ prefix }) => {
    return args.path.startsWith(prefix);
  });
  if (productPrefix) {
    const subpath = args.path.slice(productPrefix.prefix.length);
    return _locate(path.join(PRODUCT_ROOT, productPrefix.folder, subpath));
  }
  const workspaceFile = await _getWorkspacePackageFile(args.path);
  if (workspaceFile) {
    return workspaceFile;
  }
  return isProductFile(args.importer) && args.path.startsWith(".")
    ? _locate(path.resolve(path.dirname(args.importer), args.path))
    : undefined;
}
