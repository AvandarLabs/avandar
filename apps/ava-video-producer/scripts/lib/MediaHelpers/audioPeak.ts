import { MediaBinaries } from "./MediaBinaries";
import { runProcess } from "./runProcess";
/** Measure a whole track or a selected listening window in dBFS. */
export async function audioPeak({
  filename,
  start,
  duration,
}: Readonly<{
  filename: string;
  start?: number;
  duration?: number;
}>): Promise<number> {
  const args = [
    "-hide_banner",
    "-nostats",
    ...(start === undefined ? [] : ["-ss", String(start)]),
    "-i",
    filename,
    ...(duration === undefined ? [] : ["-t", String(duration)]),
    "-vn",
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ];
  const { stderr } = await runProcess({
    command: MediaBinaries.ffmpeg,
    args,
    options: { quiet: true },
  });
  const match = /max_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/.exec(stderr);
  if (!match) {
    throw new Error("Unable to measure assembled audio");
  }
  return match[1] === "-inf" ? -Infinity : Number(match[1]);
}
