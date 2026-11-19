import fs from "node:fs/promises";
import path from "node:path";
import { ffmpeg, probe, run } from "../../lib/mediaHelpers";
import type { Options } from "../video.types";

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
export async function synthesizeCue(
  text: string,
  directory: string,
  cueId: string,
  destination: string,
  seconds: number,
  options: Pick<Options, "voice" | "rate">,
): Promise<SynthesizedCue> {
  const textFile = path.join(directory, `${cueId}.txt`);
  const raw = path.join(directory, `${cueId}.aiff`);
  await fs.writeFile(textFile, text + "\n", { flag: "wx" });
  const rate = options.rate ?? 175;
  const args = ["-r", String(rate), "-f", textFile, "-o", raw];
  if (options.voice) args.push("-v", options.voice);
  await run("/usr/bin/say", args, { quiet: true });
  const original = await probe(raw);
  if (!Number.isFinite(original.duration) || original.duration <= 0)
    throw new Error(`${cueId}: scratch synthesis produced no duration`);
  const tempo =
    original.duration > seconds ? (original.duration / seconds) * 1.025 : 1;
  if (tempo > 1.35)
    throw new Error(
      `${cueId}: speech needs ${original.duration.toFixed(2)} s but cue allows ${seconds.toFixed(2)} s. Lengthen the cue, shorten its text, or retry --rate (maximum 240). No speech was truncated.`,
    );
  const conversion = ["-y", "-loglevel", "error", "-i", raw];
  if (tempo > 1) conversion.push("-af", `atempo=${tempo}`);
  await run(
    ffmpeg,
    [
      ...conversion,
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      destination,
    ],
    { quiet: true },
  );
  const rendered = await probe(destination);
  if (rendered.duration > seconds + 0.005)
    throw new Error(
      `${cueId}: generated speech still exceeds its cue; retime instead of truncating`,
    );
  return {
    cueId,
    rate,
    tempo,
    originalSeconds: original.duration,
    seconds: rendered.duration,
    allowedSeconds: seconds,
  };
}
