import path from "node:path";
import { ffmpeg, run } from "../../lib/mediaHelpers";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

/** Tiles the preview stills into one contact sheet image. */
export async function buildContactSheet({
  plan,
  directory,
  sampleCount,
}: Readonly<{ plan: Storyboard; directory: string; sampleCount: number }>) {
  const tileHeight = Math.round((320 * plan.height) / plan.width);
  await run(
    ffmpeg,
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      "1",
      "-i",
      path.join(directory, "still-%03d.jpg"),
      "-vf",
      `scale=320:${tileHeight},tile=4x${Math.ceil(sampleCount / 4)}:padding=8:margin=8:color=0x151719`,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      path.join(directory, "contact-sheet.jpg"),
    ],
    { quiet: true },
  );
}
