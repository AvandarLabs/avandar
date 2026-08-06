import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT_DIR = fileURLToPath(new URL("..", import.meta.url));
const RUNTIME_DIR_NAMES = ["main", "preload"] as const;
const UNSUPPORTED_RUNTIME_ALIAS_IMPORT_PATTERN =
  /^import\s+(?!type\b).*from\s+["'](\$\/[^"']+)["'];?$/gm;

function _listRuntimeSourceFiles(dirPath: string): string[] {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return _listRuntimeSourceFiles(entryPath);
    }
    if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".integration.test.ts")
    ) {
      return [entryPath];
    }
    return [];
  });
}

function _findUnsupportedRuntimeAliasImports(filePath: string): string[] {
  const sourceText = readFileSync(filePath, "utf8");
  return [...sourceText.matchAll(UNSUPPORTED_RUNTIME_ALIAS_IMPORT_PATTERN)].map(
    (match) => {
      return `${relative(PACKAGE_ROOT_DIR, filePath)}:${match[1]}`;
    },
  );
}

describe("desktop runtime source", () => {
  it("does not use runtime $ alias imports in Electrobun bundles", () => {
    const runtimeSourceFiles = RUNTIME_DIR_NAMES.flatMap((dirName) => {
      return _listRuntimeSourceFiles(join(PACKAGE_ROOT_DIR, dirName));
    });
    const unsupportedImports = runtimeSourceFiles.flatMap(
      _findUnsupportedRuntimeAliasImports,
    );

    expect(unsupportedImports).toEqual([]);
  });
});
