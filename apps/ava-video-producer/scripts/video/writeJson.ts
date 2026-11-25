import fs from "node:fs/promises";
/** Writes a new JSON file, refusing to replace an existing one. */
export function writeJson({
  filename,
  value,
}: Readonly<{
  filename: string;
  value: unknown;
}>): Promise<void> {
  return fs.writeFile(filename, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
  });
}
