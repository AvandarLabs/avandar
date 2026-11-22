import fs from "node:fs/promises";
import path from "node:path";
import { MediaHelpers } from "../../lib/MediaHelpers/MediaHelpers";
import type { Options } from "../video.types";

type SynthesizeCueParameters = {
  text: string;
  directory: string;
  cueId: string;
  destination: string;
  seconds: number;
  options: Pick<Options, "voice" | "rate">;
};
/** The timing a synthesized cue was generated and fitted with. */
type SynthesizedCue = {
  cueId: string;
  rate: number;
  tempo: number;
  originalSeconds: number;
  seconds: number;
  allowedSeconds: number;
};
/**
 * Keep generated speech within its cue using bounded tempo, never truncation.
 */
export async function synthesizeCue({
  text,
  directory,
  cueId,
  destination,
  seconds,
  options,
}: Readonly<SynthesizeCueParameters>): Promise<SynthesizedCue> {
  const rate = options.rate ?? 175;
  const raw = await _synthesizeSpeech({
    text,
    directory,
    cueId,
    rate,
    options,
  });
  const original = await MediaHelpers.probe(raw);
  if (!Number.isFinite(original.duration) || original.duration <= 0) {
    throw new Error(`${cueId}: scratch synthesis produced no duration`);
  }
  const tempo =
    original.duration > seconds ? (original.duration / seconds) * 1.025 : 1;
  if (tempo > 1.35) {
    throw new Error(
      `${cueId}: speech needs ${original.duration.toFixed(2)} s but cue allows ${seconds.toFixed(2)} s. Lengthen the cue, shorten its text, or retry --rate (maximum 240). No speech was truncated.`,
    );
  }
  await _convertSpeech({ raw, tempo, destination });
  const rendered = await MediaHelpers.probe(destination);
  if (rendered.duration > seconds + 0.005) {
    throw new Error(
      `${cueId}: generated speech still exceeds its cue; retime instead of truncating`,
    );
  }
  return {
    cueId,
    rate,
    tempo,
    originalSeconds: original.duration,
    seconds: rendered.duration,
    allowedSeconds: seconds,
  };
}

async function _synthesizeSpeech({
  text,
  directory,
  cueId,
  rate,
  options,
}: Readonly<
  Pick<SynthesizeCueParameters, "text" | "directory" | "cueId" | "options"> & {
    rate: number;
  }
>): Promise<string> {
  const textFile = path.join(directory, `${cueId}.txt`);
  const raw = path.join(directory, `${cueId}.aiff`);
  await fs.writeFile(textFile, `${text  }\n`, { flag: "wx" });
  const args = [
    "-r",
    String(rate),
    "-f",
    textFile,
    "-o",
    raw,
    ...(options.voice ? ["-v", options.voice] : []),
  ];
  await MediaHelpers.run({
    command: "/usr/bin/say",
    args,
    options: { quiet: true },
  });

  return raw;
}
async function _convertSpeech({
  raw,
  tempo,
  destination,
}: Readonly<{
  raw: string;
  tempo: number;
  destination: string;
}>): Promise<void> {
  const conversion = [
    "-y",
    "-loglevel",
    "error",
    "-i",
    raw,
    ...(tempo > 1 ? ["-af", `atempo=${tempo}`] : []),
  ];
  await MediaHelpers.run({
    command: MediaHelpers.ffmpeg,
    args: [
      ...conversion,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      destination,
    ],
    options: { quiet: true },
  });
}
