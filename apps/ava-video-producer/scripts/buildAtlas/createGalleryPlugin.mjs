import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateGalleryCopy } from "./generateGalleryCopy.mjs";
import { refreshPalette } from "./refreshPalette.mjs";
import { transformGallerySource } from "./transformGallerySource.mjs";
/** A bundler plugin that refreshes theme and copy inputs on rebuild. */
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
        await generateGalleryCopy(root);
      });
      builder.onLoad(
        {
          filter: /\.[tj]sx?$/,
          namespace: "file",
        },
        async ({ path: filename }) => {
          if (
            !["src/gallery/", "src/continuity/gallery/"].some((directory) =>
              filename.startsWith(path.join(root, directory)),
            )
          ) {
            return undefined;
          }
          return transformGallerySource(filename);
        },
      );
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
