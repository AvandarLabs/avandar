import path from "node:path";
import { bundle } from "@remotion/bundler";
import { productRequirements } from "../../lib/productRequirements/productRequirements";
import { withWorkspaceAliases } from "../../lib/withWorkspaceAliases.mjs";
import { ROOT } from "../video.constants";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

/** Bundles the composition site a preview renders its stills from. */
export function bundlePreviewSite({
  plan,
  directory,
  publicDir,
}: Readonly<{ plan: Storyboard; directory: string; publicDir: string }>) {
  return bundle({
    webpackOverride: withWorkspaceAliases,
    entryPoint: path.join(
      ROOT,
      productRequirements(plan).needsProduct
        ? "src/avandar-entry.tsx"
        : "src/index.ts",
    ),
    outDir: path.join(directory, "bundle"),
    publicDir,
    rootDir: ROOT,
  });
}
