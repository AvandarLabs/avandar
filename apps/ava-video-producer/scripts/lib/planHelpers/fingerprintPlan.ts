import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  isDefined,
  promiseMapSequential,
  prop,
  sortObjList,
} from "@avandar/utils";
import { getSha256FromFile } from "../getSha256FromFile";
import { productRequirements } from "../productRequirements/productRequirements";
import { ProductSources } from "../ProductSources";
import {
  getAssetReferencesFromPlan,
  getPublicAssetPathFromAsset,
  safeInputFile,
} from "./planHelpers";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { PlanFingerprint } from "./planHelpers.types";
import type { Dirent } from "node:fs";
/** Renderer, gate, and lockfile paths a render depends on beyond `src/`. */
const RENDER_SUPPORT_FILES = [
  "remotion.config.ts",
  "themes/classic.theme.json",
  "themes/avandar.theme.json",
  "themes/starter.theme.json",
  "public/fonts/figtree-latin.woff2",
  "../../pnpm-lock.yaml",
  "../../packages/shared/utils/package.json",
  "package.json",
  "scripts/render.sh",
  "scripts/renderSequence.ts",
  "scripts/checkFrames.ts",
  "scripts/yaml/makeEsModuleFromYaml.ts",
  "scripts/requireLicense.ts",
  "scripts/showcase/ThemeStoreError.ts",
] as const;
/** Source directories a render depends on, hashed file by file. */
const RENDER_SUPPORT_DIRECTORIES = [
  "../../packages/shared/utils/src",
  "scripts/lib",
  "scripts/checkFrames",
  "scripts/runProducerCommand",
  "scripts/showcase/createThemeStore",
  "scripts/videoTheme/loadVideoThemeSnapshot",
  "scripts/video",
] as const;

/** Rejects source paths that are symlinks or pass through a symlink. */
async function _assertNoSourceSymlinks(filename: string): Promise<void> {
  const source = await fs.lstat(filename);
  if (
    source.isSymbolicLink() ||
    (await fs.realpath(filename)) !== path.resolve(filename)
  ) {
    throw new Error("Renderer source cannot contain symlinks");
  }
}

/** Excludes private files, dependencies, tests and generated source outputs. */
function _isRendererSourceEntry(entry: Readonly<Dirent>): boolean {
  return (
    !entry.name.startsWith(".") &&
    ![
      "out",
      "node_modules",
      "__tests__",
      "dist",
      "build",
      "coverage",
      "__pycache__",
    ].includes(entry.name) &&
    !/\.(?:test|spec)\./.test(entry.name)
  );
}
async function _rendererFiles({
  root,
  directory = "src",
}: Readonly<{
  root: string;
  directory?: string;
}>): Promise<string[]> {
  await _assertNoSourceSymlinks(path.join(root, directory));
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const nestedGroups = await promiseMapSequential(
    sortObjList(entries.filter(_isRendererSourceEntry), {
      sortBy: prop("name"),
    }),
    async (entry): Promise<string[]> => {
      const relative = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new Error("Renderer source cannot contain symlinks");
      }
      if (entry.isDirectory()) {
        return _rendererFiles({
          root,
          directory: relative,
        });
      }
      return /\.(tsx?|[cm]?jsx?|css|json|ya?ml)$/.test(entry.name)
        ? [relative]
        : [];
    },
  );
  return nestedGroups.flat();
}
/** Each referenced public asset's path and hash, in path order. */
async function _hashPlanAssets({
  plan,
  assetRoot,
}: Readonly<{
  plan: Readonly<Storyboard>;
  assetRoot: string;
}>): Promise<PlanFingerprint["assets"]> {
  return promiseMapSequential(
    getAssetReferencesFromPlan(plan).sort(),
    async (asset) => {
      return {
        path: asset,
        sha256: await getSha256FromFile(
          await getPublicAssetPathFromAsset({
            root: assetRoot,
            asset,
          }),
        ),
      };
    },
  );
}
/** The render support files present under `root`. */
async function _listSupportFiles(root: string): Promise<string[]> {
  const supportFiles = await promiseMapSequential(
    RENDER_SUPPORT_FILES,
    (supportFile: string) => {
      // Optional in isolated tests, which copy only part of the app.
      return fs.lstat(path.join(root, supportFile)).then(
        () => {
          return supportFile;
        },
        () => {
          return undefined;
        },
      );
    },
  );
  return supportFiles.filter(isDefined);
}
/** Every renderer file inside the render support directories. */
async function _listSupportDirectoryFiles(root: string): Promise<string[]> {
  const directoryFiles = await promiseMapSequential(
    RENDER_SUPPORT_DIRECTORIES,
    (directory: string) => {
      return _rendererFiles({
        root,
        directory,
      }).catch((error: unknown) => {
        // Optional in isolated tests, which copy only part of the app.
        if (error instanceof Error && "code" in error) {
          if (error.code === "ENOENT") {
            return [];
          }
        }
        throw error;
      });
    },
  );
  return directoryFiles.flat();
}
/** Product adapter and build inputs when the plan renders product beats. */
async function _listProductFiles({
  root,
  plan,
}: Readonly<{
  root: string;
  plan: Readonly<Storyboard>;
}>): Promise<string[]> {
  if (!productRequirements(plan).needsProduct) {
    return [];
  }
  const adapterFiles = await _rendererFiles({
    root,
    directory: "avandar-adapter",
  });
  await ProductSources.verifyProductBuild(root);
  const buildProductFiles = await _rendererFiles({
    root,
    directory: "scripts/buildProduct",
  });
  return [
    ...adapterFiles,
    "src/avandar/generated/build.json",
    ...buildProductFiles,
  ];
}
/** Every source file whose edit must invalidate the plan's preview. */
async function _listRendererFiles({
  root,
  plan,
}: Readonly<{
  root: string;
  plan: Readonly<Storyboard>;
}>): Promise<string[]> {
  const [sourceFiles, productFiles, supportFiles, directoryFiles] =
    await Promise.all([
      _rendererFiles({ root }),
      _listProductFiles({
        root,
        plan,
      }),
      _listSupportFiles(root),
      _listSupportDirectoryFiles(root),
    ]);
  return [...sourceFiles, ...productFiles, ...supportFiles, ...directoryFiles];
}
/** One hash over each file's path and contents, in path order. */
async function _hashFiles({
  root,
  files,
}: Readonly<{
  root: string;
  files: readonly string[];
}>): Promise<string> {
  const hash = createHash("sha256");
  // One file at a time: the list includes full-length videos, and the hash
  // must absorb them in path order.
  await promiseMapSequential([...files].sort(), async (file) => {
    const filename = path.join(root, file);
    await _assertNoSourceSymlinks(filename);
    const fileSha256 = await getSha256FromFile(filename);
    hash.update(`${file}\0${fileSha256}\n`);
  });
  return hash.digest("hex");
}
/**
 * Computes a `PlanFingerprint` hashing the source JSON, parsed plan, every
 * referenced public asset, and renderer/support source files. Used by
 * `fingerprintThemedPlan` and preview/render verification tests.
 */
export async function fingerprintPlan({
  root,
  filename,
  plan,
  assetRoot = root,
}: Readonly<{
  root: string;
  filename: string;
  plan: Readonly<Storyboard>;
  assetRoot?: string;
}>): Promise<PlanFingerprint> {
  root = await fs.realpath(root);
  const sourcePlanSha256 = await getSha256FromFile(
    await safeInputFile({
      filename,
      extensions: [".json"],
    }),
  );
  const parsedPlanSha256 = createHash("sha256")
    .update(JSON.stringify(plan))
    .digest("hex");
  const [assets, files] = await Promise.all([
    _hashPlanAssets({
      plan,
      assetRoot,
    }),
    _listRendererFiles({
      root,
      plan,
    }),
  ]);
  return {
    sourcePlanSha256,
    parsedPlanSha256,
    assets,
    rendererSha256: await _hashFiles({
      root,
      files,
    }),
  };
}
