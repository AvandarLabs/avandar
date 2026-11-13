import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const FONT_REGISTRY_FILE = new URL(
  "../../src/videoTheme/videoFontRegistry/videoFontRegistry.json",
  import.meta.url,
);

/**
 * `@font-face` rules for every bundled video font, served by the showcase
 * from `public/fonts`, so every page that loads the theme CSS also gets the
 * fonts a video theme may name.
 */
export async function buildBundledFontFaceCss() {
  const registry = JSON.parse(await readFile(FONT_REGISTRY_FILE, "utf8"));
  return Object.values(registry)
    .filter((font) => font.source === "bundled")
    .map(
      (font) => `@font-face {
  font-display: swap;
  font-family: ${font.face};
  font-style: normal;
  font-weight: ${font.weight};
  src: url("/${font.file}") format("woff2");
}
`,
    )
    .join("\n");
}

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
    `${await buildBundledFontFaceCss()}\n:root {\n${tokens.join("\n")}\n  --ava-font: Figtree, ui-sans-serif, system-ui, sans-serif;\n}\n`,
  );
  if ((await readFile(paletteFile, "utf8").catch(() => "")) !== text) {
    await writeFile(paletteFile, text);
  }
}
