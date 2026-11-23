import { MediaBinaries } from "./MediaBinaries";
import { run } from "./run";
/**
 * Hash encoded video packets to prove audio assembly did not re-encode picture.
 */
export async function videoHash(filename: string): Promise<string> {
  return (
    await run({
      command: MediaBinaries.ffmpeg,
      args: [
        "-v",
        "error",
        "-i",
        filename,
        "-map",
        "0:v:0",
        "-c:v",
        "copy",
        "-f",
        "hash",
        "-hash",
        "sha256",
        "-",
      ],
      options: { quiet: true },
    })
  ).trim();
}
