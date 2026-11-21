import fs from "node:fs/promises";
import path from "node:path";
import { propEq } from "@avandar/utils";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { MediaHelpers } from "../lib/MediaHelpers/MediaHelpers";
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
export async function alignRecording({
  plan,
  options,
  workspace,
}: Readonly<{
  plan: Storyboard;
  options: Options;
  workspace: string;
}>): Promise<string> {
  const { recording, srtFile } = await _getAlignmentInputsFromOptions(options);
  const digest = await getSha256FromFile(recording);
  const src = `audio/${plan.id}/recorded-${digest}${path.extname(recording).toLowerCase()}`;
  const derived = applySrt({
    plan,
    srt: await fs.readFile(srtFile, "utf8"),
    audio: src,
  });
  const info = await MediaHelpers.probe(recording);
  if (!info.streams.some(propEq("codec_type", "audio"))) {
    throw new Error("Provided recording has no audio stream");
  }
  const directory = await freshStage({
    plan,
    name: "aligned",
    workspace,
  });
  // Finish validating and creating the private staging path before mutating
  // public audio output.
  // react-doctor-disable-next-line server-sequential-independent-await
  await _copyAlignedAudio({ workspace, plan, src, recording, digest });
  await validate({
    plan: derived,
    workspace,
  });
  return _writeAlignmentArtifacts({
    directory,
    derived,
    srtFile,
    options,
    digest,
    src,
  });
}

async function _copyAlignedAudio({
  workspace,
  plan,
  src,
  recording,
  digest,
}: Readonly<{
  workspace: string;
  plan: Storyboard;
  src: string;
  recording: string;
  digest: string;
}>): Promise<void> {
  const assetDirectory = await ensureDirectory({
    root: workspace,
    relative: `public/audio/${plan.id}`,
  });
  const destination = path.join(assetDirectory, path.basename(src));
  try {
    await fs.copyFile(recording, destination, fs.constants.COPYFILE_EXCL);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== "EEXIST" ||
      (await getSha256FromFile(
        await getPublicAssetPathFromAsset({
          root: workspace,
          asset: src,
        }),
      )) !== digest
    ) {
      throw error;
    }
  }
}
async function _writeAlignmentArtifacts({
  directory,
  derived,
  srtFile,
  options,
  digest,
  src,
}: Readonly<{
  directory: string;
  derived: Storyboard;
  srtFile: string;
  options: Options;
  digest: string;
  src: string;
}>): Promise<string> {
  const filename = path.join(directory, "storyboard.json");
  await writeJson({
    filename,
    value: derived,
  });
  await fs.copyFile(
    srtFile,
    path.join(directory, "source.srt"),
    fs.constants.COPYFILE_EXCL,
  );
  await writeJson({
    filename: path.join(directory, "metadata.json"),
    value: {
      kind: "provided-recording-manual-alignment",
      sourcePlan: path.resolve(options.filename),
      audioSha256: digest,
      src,
      createdAt: new Date().toISOString(),
      alignment:
        "Imported exact-text SRT timings. No speech recognition or automatic alignment performed.",
    },
  });
  return filename;
}

async function _getAlignmentInputsFromOptions(
  options: Options,
): Promise<{ recording: string; srtFile: string }> {
  const [recording, srtFile] = await Promise.all([
    safeInputFile({
      filename: options.audio!,
      extensions: AUDIO_EXTENSIONS,
    }),
    safeInputFile({
      filename: options.srt!,
      extensions: [".srt"],
    }),
  ]);

  return { recording, srtFile };
}
