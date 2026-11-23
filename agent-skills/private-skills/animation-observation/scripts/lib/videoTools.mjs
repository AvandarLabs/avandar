/**
 * Video helpers shared by the skill's scripts.
 *
 * They use only tools this repository ships: the producer's `ffmpeg-static`
 * binary when its install step downloaded it, otherwise Remotion's bundled
 * ffmpeg and ffprobe (`pnpm exec remotion ffmpeg|ffprobe`). Remotion's
 * build has few filters (no `tile`, `setpts`, or `drawtext`), so these
 * helpers stick to input/output options that both builds support.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const PRODUCER_DIR = "apps/ava-video-producer";

/** Absolute path of the main checkout or worktree root. */
export const workspaceRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

/** The video producer app, whose dependencies the scripts borrow. */
export const producerDir = path.join(workspaceRoot, PRODUCER_DIR);

/** `require` that resolves packages from the producer's dependencies. */
export const requireFromProducer = createRequire(path.join(producerDir, "package.json"));

/** Runs ffmpeg or ffprobe with arguments whose paths are absolute. */
export function runVideoTool(toolName, args) {
  if (toolName === "ffmpeg") {
    const staticPath = requireFromProducer("ffmpeg-static");
    if (staticPath && existsSync(staticPath)) {
      return execFileSync(staticPath, args, { encoding: "utf8" });
    }
  }
  return execFileSync("pnpm", ["exec", "remotion", toolName, ...args], {
    cwd: producerDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Reads a video's duration in seconds, frame rate, and frame count. */
export function probeVideo(videoPath) {
  const [rateLine, durationLine] = runVideoTool("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=r_frame_rate:format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", path.resolve(videoPath),
  ])
    .trim()
    .split("\n");
  const [numerator, denominator] = rateLine.split("/").map(Number);
  const fps = numerator / (denominator || 1);
  const durationSeconds = Number(durationLine);
  return { fps, durationSeconds, numFrames: Math.round(durationSeconds * fps) };
}

/** Writes one frame of a video as a JPEG. */
export function extractFrameJpeg(videoPath, frame, fps, outPath, width) {
  const scaleArgs = width ? ["-vf", `scale=${width}:-2`] : [];
  runVideoTool("ffmpeg", [
    "-v", "error", "-y", "-ss", String(frame / fps), "-i", path.resolve(videoPath),
    ...scaleArgs, "-frames:v", "1", "-f", "image2", "-c:v", "mjpeg", "-q:v", "2",
    path.resolve(outPath),
  ]);
}

/**
 * Writes a slowed copy of `[startFrame, endFrame)` that plays at
 * `sampleFps`, one source frame per output frame. A viewer sampling the copy
 * at `sampleFps` then sees every source frame: output frame k is source
 * frame `startFrame + k`.
 */
export function writeFrameAccurateClip(videoPath, startFrame, endFrame, sourceFps, sampleFps, outPath) {
  const slowdown = sourceFps / sampleFps;
  runVideoTool("ffmpeg", [
    "-v", "error", "-y", "-ss", String(startFrame / sourceFps),
    "-itsscale", String(slowdown), "-i", path.resolve(videoPath),
    "-t", String(((endFrame - startFrame) * slowdown) / sourceFps),
    "-an", "-c:v", "libx264", "-r", String(sampleFps), "-pix_fmt", "yuv420p",
    path.resolve(outPath),
  ]);
}
