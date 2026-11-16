import { readFile } from "node:fs/promises";
import { propEq } from "@avandar/utils";

const FONT_REGISTRY_FILE = new URL(
  "../../../src/videoTheme/videoFontRegistry/videoFontRegistry.json",
  import.meta.url,
);

type FontRegistryEntry = {
  source: string;
  face: string;
  weight: string;
  file: string;
};

/**
 * `@font-face` rules for every bundled video font, served by the showcase
 * from `public/fonts`, so every page that loads the theme CSS also gets the
 * fonts a video theme may name. `refreshPalette` writes them into the
 * showcase theme stylesheet.
 */
export async function makeFontFaceCssFromRegistry(): Promise<string> {
  const registry: Record<string, FontRegistryEntry> = JSON.parse(
    await readFile(FONT_REGISTRY_FILE, "utf8"),
  );
  return Object.values(registry)
    .filter(propEq("source", "bundled"))
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
