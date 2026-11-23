import { audioPeak } from "./audioPeak";
import { MediaBinaries } from "./MediaBinaries";
import { mixAudio } from "./mixAudio";
import { probe } from "./probe";
import { run } from "./run";
import { runProcess } from "./runProcess";
import { validateMedia } from "./validateMedia";
import { videoHash } from "./videoHash";
/** Media process, inspection and verified audio assembly operations. */
export const MediaHelpers = {
  /** Executable used to encode and assemble media. */
  ffmpeg: MediaBinaries.ffmpeg,
  /** Executable used to inspect encoded media streams. */
  ffprobe: MediaBinaries.ffprobe,
  /** Executes without a shell and retains diagnostic output. */
  runProcess,
  /** Executes without a shell and returns standard output. */
  run,
  /** Inspects the actual container rather than its filename extension. */
  probe,
  /** Verifies media timing before rendering. */
  validateMedia,
  /** Verifies encoded video packets remain unchanged. */
  videoHash,
  /** Measures a track's peak signal in dBFS. */
  audioPeak,
  /** Assembles approved audio without re-encoding the picture. */
  mixAudio,
};
