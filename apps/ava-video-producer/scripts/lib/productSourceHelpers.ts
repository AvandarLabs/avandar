import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** The provenance manifest a product build writes beside its bundle. */
export type ProductBuildManifest = {
  files: Array<{ path: string; sha256: string }>;
  [key: string]: unknown;
};

/**
 * Returns the Avandar checkout that contains this workspace app. Use it to
 * reach product source or workspace-root files, for example the root env
 * file or the theme sources.
 */
export function getProductRootFromProducerRoot(producerRoot: string): string {
  return path.resolve(producerRoot, "../..");
}

/**
 * Returns a product file's path relative to the product root, with `/`
 * separators, and throws for anything outside product code and public
 * assets. Use it to keep build provenance limited to product sources.
 */
export function getProductSourcePathFromFile(
  root: string,
  filename: string,
): string {
  const relativePath = path.relative(root, filename);
  const parts = relativePath.split(path.sep);
  if (
    !["src", "shared", "packages", "public"].includes(parts[0]) ||
    parts.some((part) => {
      return !part || part.startsWith(".");
    }) ||
    !/\.(tsx?|jsx?|css|json|svg|png|woff2?)$/.test(relativePath)
  ) {
    throw new Error(`Refusing non-product source: ${relativePath}`);
  }
  return relativePath.split(path.sep).join("/");
}

/**
 * Reads the Remotion bridge's provenance manifest and throws when any
 * recorded product source changed since the build. Previews and renders call
 * it so they never use stale compiled components.
 */
export async function verifyProductBuild(
  producerRoot: string,
): Promise<ProductBuildManifest> {
  const manifest: ProductBuildManifest = JSON.parse(
    await fs.readFile(
      path.join(producerRoot, "src/avandar/generated/build.json"),
      "utf8",
    ),
  );
  const root = getProductRootFromProducerRoot(producerRoot);
  await Promise.all(
    manifest.files.map(async (file) => {
      const filename = path.join(root, file.path);
      getProductSourcePathFromFile(root, filename);
      const bytes = await fs.readFile(filename);
      if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) {
        throw new Error(
          `Product source changed: ${file.path}. Rebuild components and regenerate the preview.`,
        );
      }
    }),
  );
  return manifest;
}
