import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chromeStylesheetGlobs from "../chromeStylesheetGlobs.json";
import rendererGlobs from "../rendererGlobs.json";

/** The app directory every glob and file path is relative to. */
export const APP_ROOT: string = fileURLToPath(
  new URL("../../../../", import.meta.url),
);

/**
 * The renderer directories: every file that draws a video, which must read
 * its values from the video theme. The list lives in `rendererGlobs.json`
 * because the root ESLint config reads it too. A glob starting with `!`
 * removes files a previous glob matched.
 */
const RENDERER_GLOBS: readonly string[] = rendererGlobs;
/**
 * The Atlas chrome stylesheets, which read the chrome's own `--atlas-*`
 * scale rather than the video theme. The literal scan holds them to that
 * scale.
 */
const CHROME_STYLESHEET_GLOBS: readonly string[] = chromeStylesheetGlobs;
const SOURCE_DIRECTORIES = ["src", "showcase"];
const SOURCE_EXTENSION = /\.(?:tsx?|css)$/;
/**
 * Not renderer code: tests, test helpers, and the content and contract files
 * a stock preset declares beside its renderer.
 */
const EXCLUDED_FILE =
  /(?:^|\/)__tests__\/|\.test\.|TestHelpers|\.(?:schema|fixtures|metadata|contract|controls|types)\.ts$/;

/** Whether an app-relative file path is matched by an ordered glob list. */
export function isFileMatchedByGlobs(
  globs: readonly string[],
  file: string,
): boolean {
  return globs.reduce((isMatched, glob) => {
    if (glob.startsWith("!")) {
      return isMatched && !path.matchesGlob(file, glob.slice(1));
    }
    return isMatched || path.matchesGlob(file, glob);
  }, false);
}

function _listSourceFiles(): string[] {
  return SOURCE_DIRECTORIES.flatMap((directory) => {
    return fs
      .readdirSync(path.join(APP_ROOT, directory), {
        recursive: true,
        encoding: "utf8",
      })
      .map((file) => {
        return path.posix.join(directory, file.split(path.sep).join("/"));
      });
  })
    .filter((file) => {
      return SOURCE_EXTENSION.test(file) && !EXCLUDED_FILE.test(file);
    })
    .sort();
}

/**
 * Every app-relative source file in the renderer directories, for guards
 * that check renderer code or stage stylesheets.
 */
export function listRendererFiles(): string[] {
  return _listSourceFiles().filter((file) => {
    return isFileMatchedByGlobs(RENDERER_GLOBS, file);
  });
}

/**
 * Every app-relative source file the literal scan checks: the renderer
 * files and the Atlas chrome stylesheets.
 */
export function listScannedFiles(): string[] {
  return _listSourceFiles().filter((file) => {
    return (
      isFileMatchedByGlobs(RENDERER_GLOBS, file) ||
      isFileMatchedByGlobs(CHROME_STYLESHEET_GLOBS, file)
    );
  });
}
