import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { prop } from "@avandar/utils";
import ffmpegStatic from "ffmpeg-static";
import { STAGE } from "./measureAvandar.constants";
import type { Rect } from "./measureAvandar.types";

const ffmpeg =
  process.env.FFMPEG_BIN ||
  (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg");

function _decodeRgba(input: Readonly<Buffer>): Buffer {
  return execFileSync(
    ffmpeg,
    [
      "-v",
      "error",
      "-i",
      "pipe:0",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "pipe:1",
    ],
    { input, maxBuffer: 16 * 1024 * 1024 },
  );
}

/**
 * Compares two screenshots of the film stage pixel by pixel, counting every
 * difference, including compositor antialiasing at rounded edges. Use it to
 * decide whether two renders of the same frame are identical.
 */
export function getPixelComparisonFromScreenshots(
  first: Readonly<Buffer>,
  second: Readonly<Buffer>,
): {
  changedPixels: number;
  maxChannelDelta: number;
  bounds: Rect | undefined;
} {
  if (first.equals(second)) {
    return { changedPixels: 0, maxChannelDelta: 0, bounds: undefined };
  }
  const left = _decodeRgba(first);
  const right = _decodeRgba(second);
  if (left.length !== right.length) {
    throw new Error("Determinism images have different dimensions.");
  }
  const changed = Array.from({ length: left.length / 4 }, (_, pixel) => {
    const offset = pixel * 4;
    const delta = Math.max(
      ...[0, 1, 2, 3].map((channel) =>
        Math.abs(left[offset + channel] - right[offset + channel]),
      ),
    );
    return { pixel, delta };
  }).filter(({ delta }) => delta > 0);
  if (!changed.length) {
    return { changedPixels: 0, maxChannelDelta: 0, bounds: undefined };
  }
  const xs = changed.map(({ pixel }) => pixel % STAGE.width);
  const ys = changed.map(({ pixel }) => Math.floor(pixel / STAGE.width));
  const bounds = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
  return {
    changedPixels: changed.length,
    maxChannelDelta: Math.max(...changed.map(prop("delta"))),
    bounds,
  };
}
