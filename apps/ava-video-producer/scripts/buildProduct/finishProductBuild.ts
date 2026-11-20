import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { prop, sortObjList } from "@avandar/utils";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { PRODUCT_ROOT } from "./buildProduct.constants";
import type { ImportedFiles } from "./buildProduct.types";
import type { BuildResult } from "esbuild";

type FinishedBuild = {
  result: BuildResult;
  imported: ImportedFiles;
  outputDirectory: string;
  onBuilt: () => Promise<void>;
};

/** Appends the Tailwind utilities the imported product sources use. */
async function _appendTailwindUtilities(
  imported: ReadonlyMap<string, { path: string; sha256: string }>,
  outputDirectory: string,
): Promise<void> {
  const content = [
    "avandar-adapter/**/*.{ts,tsx}",
    ...Array.from(imported.keys())
      .filter((file) => {
        return /\.tsx?$/.test(file);
      })
      .map((file) => {
        return path.join(PRODUCT_ROOT, file);
      }),
  ];
  const utilities = await postcss([
    tailwind({ content, corePlugins: { preflight: false } }),
  ]).process("@tailwind utilities;", { from: undefined });
  await fs.appendFile(path.join(outputDirectory, "product.css"), utilities.css);
}

/**
 * Completes a successful product build: adds the Tailwind utilities to the
 * stylesheet, writes `build.json` listing every product source file and the
 * git revision, then runs the caller's `onBuilt`. Does nothing after a build
 * with errors.
 *
 * Used by the product build's end hook on every build and rebuild.
 */
export async function finishProductBuild(
  options: Readonly<FinishedBuild>,
): Promise<void> {
  const { result, imported, outputDirectory } = options;
  if (result.errors.length) {
    return;
  }
  await _appendTailwindUtilities(imported, outputDirectory);
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: PRODUCT_ROOT,
    encoding: "utf8",
  }).trim();
  const files = sortObjList([...imported.values()], { sortBy: prop("path") });
  const manifest = {
    repository: "AvandarLabs/avandar",
    revision,
    files,
    sourceFiles: files.length,
    inputs: Object.keys(result.metafile?.inputs ?? {}).length,
    jsSha256: await getSha256FromFile(path.join(outputDirectory, "product.js")),
  };
  await fs.writeFile(
    path.join(outputDirectory, "build.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    `Built Avandar components directly from ${files.length} worktree source files at ${revision}.`,
  );
  await options.onBuilt();
}
