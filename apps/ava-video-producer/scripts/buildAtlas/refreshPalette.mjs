import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
/**
 * Avandar's brand typeface, served by the showcase from `public/fonts`, so
 * every page that loads the theme also gets the brand font.
 */
const BRAND_FONT_FACE = `@font-face {
  font-display: swap;
  font-family: Figtree;
  font-style: normal;
  font-weight: 300 900;
  src: url("/fonts/figtree-latin.woff2") format("woff2");
}
`;

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
    `${BRAND_FONT_FACE}\n:root {\n${tokens.join("\n")}\n  --ava-font: Figtree, ui-sans-serif, system-ui, sans-serif;\n}\n`,
  );
  if ((await readFile(paletteFile, "utf8").catch(() => "")) !== text) {
    await writeFile(paletteFile, text);
  }
}
