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
import { verifyProductBuild } from "../productSourceHelpers";
import {
  getAssetReferencesFromPlan,
  getPublicAssetPathFromAsset,
  safeInputFile,
} from "./planHelpers";
import type { Storyboard } from "../../../src/storyboard/schema/schema";
import type { PlanFingerprint } from "./planHelpers.types";

/** Renderer, gate, and lockfile paths a render depends on beyond `src/`. */
const RENDER_SUPPORT_FILES = [
  "remotion.config.ts",
  "public/fonts/figtree-latin.woff2",
  "../../pnpm-lock.yaml",
  "package.json",
  "scripts/render.sh",
  "scripts/renderSequence.ts",
  "scripts/checkFrames.ts",
  "scripts/lib/mediaHelpers.ts",
  "scripts/yaml/makeEsModuleFromYaml.ts",
  "scripts/lib/makeWorkspaceWebpackConfigFromConfig.ts",
  "scripts/lib/getAvandarUtilsDirectoryFromRoot.ts",
] as const;

/** Source directories a render depends on, hashed file by file. */
const RENDER_SUPPORT_DIRECTORIES = [
  "scripts/lib/frameGateHelpers",
  "scripts/lib/planHelpers",
  "scripts/video",
] as const;

async function _rendererFiles(
  root: string,
  directory = "src",
): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const nestedGroups = await promiseMapSequential(
    sortObjList(entries, { sortBy: prop("name") }),
    async (entry): Promise<string[]> => {
      const relative = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new Error("Renderer source cannot contain symlinks");
      }
      if (entry.isDirectory()) {
        return _rendererFiles(root, relative);
      }
      if (
        /\.(tsx?|[cm]?jsx?|css|json|ya?ml)$/.test(entry.name) &&
        !entry.name.startsWith(".")
      ) {
        return [relative];
      }
      return [];
    },
  );
  return nestedGroups.flat();
}

/** Each referenced public asset's path and hash, in path order. */
async function _hashPlanAssets(
  plan: Readonly<Storyboard>,
  assetRoot: string,
): Promise<PlanFingerprint["assets"]> {
  return promiseMapSequential(
    getAssetReferencesFromPlan(plan).sort(),
    async (asset) => {
      return {
        path: asset,
        sha256: await getSha256FromFile(
          await getPublicAssetPathFromAsset(assetRoot, asset),
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
      return fs.access(path.join(root, supportFile)).then(
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
      return _rendererFiles(root, directory).catch((error: unknown) => {
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
async function _listProductFiles(
  root: string,
  plan: Readonly<Storyboard>,
): Promise<string[]> {
  if (!productRequirements(plan).needsProduct) {
    return [];
  }
  const adapterFiles = await _rendererFiles(root, "avandar-adapter");
  await verifyProductBuild(root);
  const buildProductFiles = await _rendererFiles(root, "scripts/buildProduct");
  return [
    ...adapterFiles,
    "src/avandar/generated/build.json",
    ...buildProductFiles,
    "scripts/lib/productSourceHelpers.ts",
  ];
}

/** Every source file whose edit must invalidate the plan's preview. */
async function _listRendererFiles(
  root: string,
  plan: Readonly<Storyboard>,
): Promise<string[]> {
  const [sourceFiles, productFiles, supportFiles, directoryFiles] =
    await Promise.all([
      _rendererFiles(root),
      _listProductFiles(root, plan),
      _listSupportFiles(root),
      _listSupportDirectoryFiles(root),
    ]);
  return [...sourceFiles, ...productFiles, ...supportFiles, ...directoryFiles];
}

/** One hash over each file's path and contents, in path order. */
async function _hashFiles(
  root: string,
  files: readonly string[],
): Promise<string> {
  const hash = createHash("sha256");
  // One file at a time: the list includes full-length videos, and the hash
  // must absorb them in path order.
  await promiseMapSequential([...files].sort(), async (file) => {
    const fileSha256 = await getSha256FromFile(path.join(root, file));
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
  const sourcePlanSha256 = await getSha256FromFile(
    await safeInputFile(filename, [".json"]),
  );
  const parsedPlanSha256 = createHash("sha256")
    .update(JSON.stringify(plan))
    .digest("hex");
  const [assets, files] = await Promise.all([
    _hashPlanAssets(plan, assetRoot),
    _listRendererFiles(root, plan),
  ]);
  return {
    sourcePlanSha256,
    parsedPlanSha256,
    assets,
    rendererSha256: await _hashFiles(root, files),
  };
}
