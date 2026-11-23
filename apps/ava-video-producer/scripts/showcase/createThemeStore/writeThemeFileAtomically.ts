import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
/** Writes a complete theme file exclusively or by atomic replacement. */
export async function writeThemeFileAtomically({
  file,
  text,
  mode,
}: Readonly<{
  file: string;
  text: string;
  mode: "replace" | "create";
}>): Promise<void> {
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  try {
    await fs.writeFile(temporary, text);
    await (mode === "create"
      ? fs.link(temporary, file)
      : fs.rename(temporary, file));
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
