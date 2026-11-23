import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FrameMeasurements } from "./FrameGateMeasurements.types";

/**
 * The ffmpeg binary: the bundled one when installed, otherwise the PATH one.
 */
function _findFfmpeg(): string {
  const bundledFfmpegPath = new URL(
    "../../../node_modules/ffmpeg-static/ffmpeg",
    import.meta.url,
  ).pathname;
  return existsSync(bundledFfmpegPath) ? bundledFfmpegPath : "ffmpeg";
}

// ffmpeg reports stream info and filter results on stderr, so both streams
// have to be read back.
function _runFfmpeg(args: readonly string[]): string {
  const result = spawnSync(_findFfmpeg(), args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (result.error) {
    throw result.error;
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Each frame's left-half against right-half PSNR in dB, a perfect match as 99.
 */
function _measureHalves(options: {
  file: string;
  width: number;
  height: number;
}): number[] {
  const { file, width, height } = options;
  const directory = mkdtempSync(join(tmpdir(), "checkframes-"));
  const tileLog = join(directory, "tile.log");
  const half = Math.floor(width / 2);
  try {
    _runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      file,
      "-lavfi",
      `[0:v]split[x][y];[x]crop=${half}:${height}:0:0[l];[y]crop=${half}:${height}:${width - half}:0[r];[l][r]psnr=stats_file=${tileLog}`,
      "-f",
      "null",
      "-",
    ]);
    const halves: number[] = [];
    readFileSync(tileLog, "utf8")
      .split("\n")
      .forEach((line) => {
        const frameMatch = /(?:^|\s)n:(\d+)/.exec(line);
        const psnrMatch = /psnr_avg:([0-9.]+|inf)/.exec(line);
        if (frameMatch && psnrMatch) {
          halves[Number(frameMatch[1]) - 1] =
            psnrMatch[1] === "inf" ? 99 : Number(psnrMatch[1]);
        }
      });
    return halves;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Each frame's average luma and luma contrast (max minus min). */
function _measureLuma(file: string): { luma: number[]; contrast: number[] } {
  const stats = _runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "info",
    "-i",
    file,
    "-vf",
    "signalstats,metadata=print",
    "-f",
    "null",
    "-",
  ]);
  const readAll = (name: string) => {
    return Array.from(
      stats.matchAll(
        new RegExp(`lavfi\\.signalstats\\.${name}=([0-9.]+)`, "g"),
      ),
      (match) => {
        return Number(match[1]);
      },
    );
  };
  const minimums = readAll("YMIN");
  const contrast = readAll("YMAX").map((maximum, index) => {
    return maximum - (minimums[index] ?? 0);
  });
  return { luma: readAll("YAVG"), contrast };
}

/**
 * Measures a video for the gate: its size, each frame's half match, and its
 * luma and contrast. `checkFrames` feeds the result to the verdict helpers.
 */
export function getFrameMeasurementsFromVideo(file: string): FrameMeasurements {
  const probe = _runFfmpeg(["-hide_banner", "-i", file, "-f", "null", "-"]);
  const dimensions = /,\s(\d{2,5})x(\d{2,5})[\s,]/.exec(probe);
  if (!dimensions) {
    throw new Error(`could not read dimensions of ${file}`);
  }
  const width = Number(dimensions[1]);
  const height = Number(dimensions[2]);
  return {
    width,
    height,
    halves: _measureHalves({ file, width, height }),
    ..._measureLuma(file),
  };
}
