import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeFontFaceCssFromRegistry } from "./makeFontFaceCssFromRegistry/makeFontFaceCssFromRegistry";

/**
 * Rewrites the showcase theme stylesheet and the gallery palette JSON from
 * the workspace's Avandar theme. The showcase theme plugin runs it at the
 * start of every build. The palette file is written only when it changes,
 * so a watched build does not rebuild itself.
 */
export async function refreshPalette(
  options: Readonly<{
    root: string;
    outputDirectory: string;
    paletteFile: string;
  }>,
): Promise<void> {
  // The palette `readTheme.ts` prints: Avandar colour scales and surfaces.
  const palette: Record<"primary" | "neutral", string[]> &
    Record<string, unknown> = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", path.join(options.root, "scripts/readTheme.ts")],
      { cwd: options.root, encoding: "utf8" },
    ),
  );
  const text = `${JSON.stringify(palette, null, 2)}\n`;
  const tokens = (["primary", "neutral"] as const).flatMap((scale) =>
    palette[scale].map(
      (color, index) => `  --ava-${scale}-${index}: ${color};`,
    ),
  );
  await writeFile(
    path.join(options.outputDirectory, "showcase-theme.css"),
    `${await makeFontFaceCssFromRegistry()}\n:root {\n${tokens.join("\n")}\n  --ava-font: Figtree, ui-sans-serif, system-ui, sans-serif;\n}\n`,
  );
  if ((await readFile(options.paletteFile, "utf8").catch(() => "")) !== text) {
    await writeFile(options.paletteFile, text);
  }
}
