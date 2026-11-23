import { MediaBinaries } from "./MediaBinaries";
import { run } from "./run";
import type { MediaProbe, MediaStream } from "./MediaHelpers.types";
/** Probe the actual media container, independent of its filename extension. */
export async function probe(filename: string): Promise<MediaProbe> {
  const result: { format?: { duration?: string }; streams: MediaStream[] } =
    JSON.parse(
      await run({
        command: MediaBinaries.ffprobe,
        args: [
          "-v",
          "error",
          "-show_streams",
          "-show_format",
          "-of",
          "json",
          filename,
        ],
        options: { quiet: true },
      }),
    );
  return {
    duration: Number(result.format?.duration),
    streams: result.streams,
  };
}
