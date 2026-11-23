import { existsSync } from "node:fs";
import ffmpegStatic from "ffmpeg-static";
/** The configured media binaries, with the bundled ffmpeg as fallback. */
export const MediaBinaries = {
  /** Configured ffmpeg executable, using the bundled binary when available. */
  ffmpeg:
    process.env.FFMPEG_BIN ||
    (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg"),
  /** Configured ffprobe executable, defaulting to the system command. */
  ffprobe: process.env.FFPROBE_BIN || "ffprobe",
};
