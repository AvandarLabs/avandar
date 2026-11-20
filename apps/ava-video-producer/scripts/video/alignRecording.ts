import fs from "node:fs/promises";
import path from "node:path";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { probe } from "../lib/mediaHelpers";
import { applySrt } from "../lib/planHelpers/applySrt";
import {
  ensureDirectory,
  getPublicAssetPathFromAsset,
  safeInputFile,
} from "../lib/planHelpers/planHelpers";
import { freshStage } from "./freshStage";
import { validate } from "./validate";
import { AUDIO_EXTENSIONS } from "./video.constants";
import { writeJson } from "./writeJson";
import type { Storyboard } from "../../src/storyboard/schema/schema";
import type { Options } from "./video.types";

/**
 * Import supplied SRT timing with exact text matching; this performs no ASR.
 */
export async function alignRecording(
  plan: Storyboard,
  options: Options,
  workspace: string,
): Promise<string> {
  const recording = await safeInputFile(options.audio!, AUDIO_EXTENSIONS);
  const srtFile = await safeInputFile(options.srt!, [".srt"]);
  const digest = await getSha256FromFile(recording);
  const src = `audio/${plan.id}/recorded-${digest}${path.extname(recording).toLowerCase()}`;
  const derived = applySrt({
    plan,
    srt: await fs.readFile(srtFile, "utf8"),
    audio: src,
  });
  const info = await probe(recording);
  if (
    !info.streams.some((stream) => {
      return stream.codec_type === "audio";
    })
  )
    throw new Error("Provided recording has no audio stream");
  const directory = await freshStage(plan, "aligned", workspace);
  const assetDirectory = await ensureDirectory(
    workspace,
    `public/audio/${plan.id}`,
  );
  const destination = path.join(assetDirectory, path.basename(src));
  try {
    await fs.copyFile(recording, destination, fs.constants.COPYFILE_EXCL);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== "EEXIST" ||
      (await getSha256FromFile(
        await getPublicAssetPathFromAsset(workspace, src),
      )) !== digest
    )
      throw error;
  }
  await validate(derived, workspace);
  const filename = path.join(directory, "storyboard.json");
  await writeJson(filename, derived);
  await fs.copyFile(
    srtFile,
    path.join(directory, "source.srt"),
    fs.constants.COPYFILE_EXCL,
  );
  await writeJson(path.join(directory, "metadata.json"), {
    kind: "provided-recording-manual-alignment",
    sourcePlan: path.resolve(options.filename),
    audioSha256: digest,
    src,
    createdAt: new Date().toISOString(),
    alignment:
      "Imported exact-text SRT timings. No speech recognition or automatic alignment performed.",
  });
  return filename;
}
