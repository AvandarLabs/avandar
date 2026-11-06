import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Return the product checkout containing this workspace app. */
export function productRoot(producerRoot) {
  return path.resolve(producerRoot, "../..");
}

/** Limit provenance to product code and public assets. */
export function productSourcePath(root, filename) {
  const relative = path.relative(root, filename);
  const parts = relative.split(path.sep);
  if (
    !["src", "shared", "packages", "public"].includes(parts[0]) ||
    parts.some((part) => !part || part.startsWith(".")) ||
    !/\.(tsx?|jsx?|css|json|svg|png|woff2?)$/.test(relative)
  ) {
    throw new Error(`Refusing non-product source: ${relative}`);
  }
  return relative.split(path.sep).join("/");
}

/** Reject stale compiled components before previewing or rendering. */
export async function verifyProductBuild(producerRoot) {
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(producerRoot, "src/avandar/generated/build.json"),
      "utf8",
    ),
  );
  const root = productRoot(producerRoot);
  for (const file of manifest.files) {
    const filename = path.join(root, file.path);
    productSourcePath(root, filename);
    const bytes = await fs.readFile(filename);
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) {
      throw new Error(
        `Product source changed: ${file.path}. Rebuild components and regenerate the preview.`,
      );
    }
  }
  return manifest;
}
