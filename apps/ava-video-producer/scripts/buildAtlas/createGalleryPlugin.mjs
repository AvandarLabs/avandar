import { readFile } from "node:fs/promises";
import path from "node:path";
import { refreshPalette } from "./refreshPalette.mjs";
/** A bundler plugin that refreshes theme inputs on rebuild. */
export function createGalleryPlugin({
  root,
  outputDirectory,
  paletteFile,
  onBuilt,
}) {
  return {
    name: "theme-inputs",
    setup(builder) {
      builder.onStart(async () => {
        await refreshPalette({ root, outputDirectory, paletteFile });
      });
      builder.onLoad(
        {
          filter: /theme-colors\.json$/,
        },
        async () => ({
          contents: await readFile(paletteFile, "utf8"),
          loader: "json",
          watchDirs: [path.resolve(root, "../../src/config/Theme")],
          watchFiles: [
            path.resolve(root, "../../shared/config/Theme.ts"),
            path.resolve(root, "../../src/config/Theme/Theme.ts"),
            path.resolve(root, "../../src/config/Theme/ElevationTheme.ts"),
          ],
        }),
      );
      builder.onEnd(async (result) => {
        if (!result.errors.length) {
          await onBuilt();
        }
      });
    },
  };
}
