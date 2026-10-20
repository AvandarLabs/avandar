import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { transformAsync } from "@babel/core";
const require = createRequire(import.meta.url);
/** Expands gallery translation macros before the browser bundle is built. */
export async function transformGallerySource(filename) {
  const result = await transformAsync(await readFile(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve("@babel/preset-typescript"),
        {
          allExtensions: true,
          isTSX: filename.endsWith("tsx"),
        },
      ],
    ],
    plugins: [
      [
        require.resolve("@lingui/babel-plugin-lingui-macro"),
        {
          descriptorFields: "message",
        },
      ],
    ],
  });
  return {
    contents: result.code,
    loader: filename.endsWith("tsx") ? "tsx" : "ts",
  };
}
