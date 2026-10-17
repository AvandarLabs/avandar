import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, context } from "esbuild";
import { requireLicense } from "./require-license.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
/** Build Atlas from current source and refresh theme inputs during watch mode. */
export async function buildAtlas({
  watch = false,
  onBuilt = async () => {},
  outputDirectory = path.join(root, "out/showcase/browser"),
} = {}) {
  requireLicense();
  await mkdir(outputDirectory, { recursive: true });
  const paletteFile = path.join(root, "src/gallery/theme-colors.json");
  const readPalette = async () => {
    const palette = JSON.parse(
      execFileSync(
        process.execPath,
        ["--import", "tsx", path.join(root, "scripts/read-theme.mjs")],
        { cwd: root, encoding: "utf8" },
      ),
    );
    const text = JSON.stringify(palette, null, 2) + "\n";
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
  };
  await readPalette();
  const options = {
    absWorkingDir: root,
    entryPoints: ["src/gallery/MotionGallery.tsx"],
    outfile: path.join(outputDirectory, "motion-gallery.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    minify: true,
    sourcemap: false,
    legalComments: "eof",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
    plugins: [
      {
        name: "theme-inputs",
        setup(builder) {
          builder.onStart(readPalette);
          builder.onLoad({ filter: /theme-colors\.json$/ }, async () => ({
            contents: await readFile(paletteFile, "utf8"),
            loader: "json",
            watchDirs: [path.resolve(root, "../../src/config/Theme")],
            watchFiles: [
              path.resolve(root, "../../shared/config/Theme.ts"),
              path.resolve(root, "../../src/config/Theme/Theme.ts"),
              path.resolve(root, "../../src/config/Theme/ElevationTheme.ts"),
            ],
          }));
          builder.onEnd(async (result) => {
            if (!result.errors.length) {
              await onBuilt();
            }
          });
        },
      },
    ],
  };
  if (watch) {
    const builder = await context(options);
    await builder.rebuild();
    await builder.watch();
    return builder;
  }
  await build(options);
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await buildAtlas();
}
