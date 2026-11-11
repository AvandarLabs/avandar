import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HELPER_CATALOG } from "../../../src/gallery/HelperGallery/helperCatalog";
import { buildHelperDescriptorsSource } from "../../../src/gallery/HelperGallery/i18n/buildHelperDescriptorsSource";
import { requireLicense } from "../../require-license.mjs";

/** Where the extractable helper descriptors live, relative to the app. */
const DESCRIPTORS_FILE =
  "src/gallery/HelperGallery/i18n/helperDescriptors.generated.ts";

/**
 * Writes the helper catalog's display copy as Lingui descriptors, so the
 * gallery extraction that follows adds it to the gallery catalog. Leaves the
 * file untouched when nothing changed.
 */
export async function buildHelperMessages(root: string): Promise<void> {
  const filename = path.join(root, DESCRIPTORS_FILE);
  const source = buildHelperDescriptorsSource(HELPER_CATALOG);
  if ((await fs.readFile(filename, "utf8").catch(() => "")) !== source) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, source);
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  requireLicense();
  await buildHelperMessages(process.cwd());
}
