import path from "node:path";
import { durationInFrames } from "../../../src/storyboard/schema/schema";
import { writeJson } from "../writeJson";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

/**
 * Records a finished render: its fingerprint, final file, and what the gate
 * decided.
 */
export function writeRenderManifest({
  plan,
  directory,
  fingerprint,
  hasAudio,
}: Readonly<{
  plan: Storyboard;
  directory: string;
  fingerprint: unknown;
  hasAudio: boolean;
}>): Promise<void> {
  return writeJson(path.join(directory, "manifest.json"), {
    version: 1,
    complete: true,
    fingerprint,
    generatedAt: new Date().toISOString(),
    final: "final.mp4",
    poster: `${plan.id}-poster.jpg`,
    hasAudio,
    durationInFrames: durationInFrames(plan),
    fps: plan.fps,
    pictureGate: "passed",
    videoStream: "copied without re-encoding during audio assembly",
  });
}
