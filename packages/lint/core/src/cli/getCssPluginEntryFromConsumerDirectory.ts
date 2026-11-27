/* oxlint-disable import/extensions -- Node needs source extensions. */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isRecord } from "./isRecord.ts";

const SPECIFIER: string = "@avandar/lint-css/stylelint";

function _getHostVersion(directory: string): unknown {
  const path = join(directory, "package.json");
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8")).version;
  }
  const parent = dirname(directory);
  return parent === directory ? undefined : _getHostVersion(parent);
}

function _getStaticEntry({
  origin,
  version,
}: Readonly<{ origin: string; version: string }>): string | undefined {
  const require = createRequire(origin);
  const manifestPath = require.resolve
    .paths(SPECIFIER)
    ?.map((directory) => {
      return join(directory, "@avandar/lint-css/package.json");
    })
    .find((path) => {
      return existsSync(path);
    });
  if (!manifestPath) {
    return undefined;
  }
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    !isRecord(manifest) ||
    manifest.name !== "@avandar/lint-css" ||
    manifest.version !== version ||
    !isRecord(manifest.exports)
  ) {
    return undefined;
  }
  const exported = manifest.exports["./stylelint"];
  const target =
    typeof exported === "string"
      ? exported
      : isRecord(exported) &&
          Object.keys(exported).every((key) => {
            return ["types", "default"].includes(key);
          })
        ? exported.default
        : undefined;
  if (
    typeof target !== "string" ||
    !["./src/stylelint/index.js", "./dist/stylelint.js"].includes(target)
  ) {
    return undefined;
  }
  const entry = realpathSync(require.resolve(SPECIFIER));
  return realpathSync(resolve(dirname(manifestPath), target)) === entry
    ? entry
    : undefined;
}

/**
 * Gets the compatible static CSS plugin entry shared by this installation
 * and a consuming project, or undefined when it cannot be established.
 * Use it, for example, to identify the official plugin in a CSS coverage proof.
 */
export function getCssPluginEntryFromConsumerDirectory(
  cwd: string,
): string | undefined {
  try {
    const origin = fileURLToPath(import.meta.url);
    const version = _getHostVersion(dirname(origin));
    if (typeof version !== "string") {
      return undefined;
    }
    const expected = _getStaticEntry({ origin: origin, version: version });
    return expected &&
      _getStaticEntry({
        origin: join(cwd, "package.json"),
        version: version,
      }) === expected
      ? expected
      : undefined;
  } catch {
    return undefined;
  }
}
