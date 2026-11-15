import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
/** Refreshes browser theme CSS and palette data from the workspace theme. */
export async function refreshPalette({ root, outputDirectory, paletteFile }) {
  const palette = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", path.join(root, "scripts/read-theme.mjs")],
      {
        cwd: root,
        encoding: "utf8",
      },
    ),
  );
  const text = `${JSON.stringify(palette, null, 2)}\n`;
  const tokens = ["primary", "neutral"].flatMap((scale) =>
    palette[scale].map(
      (color, index) => `  --ava-${scale}-${index}: ${color};`,
    ),
  );
  await writeFile(
    path.join(outputDirectory, "showcase-theme.css"),
    `:root {\n${tokens.join("\n")}\n}\n`,
  );
  if ((await readFile(paletteFile, "utf8").catch(() => "")) !== text) {
    await writeFile(paletteFile, text);
  }
}
