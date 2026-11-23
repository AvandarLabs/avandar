import path from "node:path";
import { StoryboardTimeline } from "../../../src/storyboard/schema/StoryboardTimeline";
import { MediaHelpers } from "../../lib/MediaHelpers/MediaHelpers";
import { productRequirements } from "../../lib/productRequirements/productRequirements";
import { ROOT } from "../video.constants";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

type Props = Readonly<{
  plan: Storyboard;
  directory: string;
  props: string;
  publicDir: string;
}>;
/**
 * Runs the shared render script, which renders, encodes, and gates the picture.
 */
export async function runPictureRender({
  plan,
  directory,
  props,
  publicDir,
}: Props): Promise<void> {
  const last = StoryboardTimeline.timeline(plan).at(-1)!;
  const poster = last.startFrame + Math.floor(last.durationInFrames * 0.65);
  await MediaHelpers.run({
    command: "sh",
    args: [path.join(ROOT, "scripts/render.sh"), "story-film", String(poster)],
    options: {
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
        DECLARED_CUTS: StoryboardTimeline.declaredCutFrames(plan).join(","),
        KEEP_RENDER_FRAMES: "1",
      },
    },
  });
}
