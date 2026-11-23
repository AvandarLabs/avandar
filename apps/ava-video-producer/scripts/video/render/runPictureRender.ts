import path from "node:path";
import {
  declaredCutFrames,
  timeline,
} from "../../../src/storyboard/schema/schema";
import { run } from "../../lib/mediaHelpers";
import { productRequirements } from "../../lib/productRequirements/productRequirements";
import { ROOT } from "../video.constants";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

type Props = Readonly<{
  plan: Storyboard;
  directory: string;
  props: string;
  publicDir: string;
}>;

/** Runs the shared render script, which renders, encodes, and gates the picture. */
export async function runPictureRender({
  plan,
  directory,
  props,
  publicDir,
}: Props) {
  const last = timeline(plan).at(-1)!;
  const poster = last.startFrame + Math.floor(last.durationInFrames * 0.65);
  await run(
    "sh",
    [path.join(ROOT, "scripts/render.sh"), "story-film", String(poster)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        RENDER_OUT_DIR: directory,
        RENDER_OUTPUT_ID: plan.id,
        RENDER_ENTRY_POINT: productRequirements(plan).needsProduct
          ? "src/avandar-entry.tsx"
          : "src/index.ts",
        RENDER_PUBLIC_DIR: publicDir,
        RENDER_GL: productRequirements(plan).needsMap ? "angle" : "",
        REMOTION_PROPS_FILE: props,
        DELIVER: `${plan.delivery.width}:${plan.delivery.height}`,
        STANDALONE: plan.purpose === "standalone" ? "1" : "0",
        // Always set, even empty, so an exported value never leaks in.
        DECLARED_CUTS: declaredCutFrames(plan).join(","),
        KEEP_RENDER_FRAMES: "1",
      },
    },
  );
}
