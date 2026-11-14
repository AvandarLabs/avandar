import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildTokenDescriptorsSource } from "../../../src/videoThemeEditor/tokenCopy/buildTokenDescriptorsSource";
import { requireLicense } from "../../require-license.mjs";

/** Where the extractable token descriptors live, relative to the app. */
const DESCRIPTORS_FILE =
  "src/videoThemeEditor/tokenCopy/tokenDescriptors.generated.ts";

/**
 * Writes the token catalog's display copy as Lingui descriptors, so the
 * gallery extraction that follows adds it to the gallery catalog. Leaves the
 * file untouched when nothing changed.
 */
export async function buildTokenMessages(root: string): Promise<void> {
  const filename = path.join(root, DESCRIPTORS_FILE);
  const source = buildTokenDescriptorsSource();
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
  await buildTokenMessages(process.cwd());
}
