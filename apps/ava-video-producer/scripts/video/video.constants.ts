import path from "node:path";
import { fileURLToPath } from "node:url";

/** The producer app directory. */
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
/** Audio and video containers accepted as a provided recording. */
export const AUDIO_EXTENSIONS = [
  ".wav",
  ".mp3",
  ".m4a",
  ".aac",
  ".aif",
  ".aiff",
  ".flac",
  ".ogg",
  ".mp4",
  ".webm",
];
/** The commands the CLI dispatches. */
export const COMMANDS = [
  "validate",
  "plan",
  "preview",
  "render",
  "tts",
  "align",
] as const;

/** The CLI usage text. */
export const HELP = `Usage: pnpm video <command> <plan.json> [options]
  validate                     Check schema, assets and media timing
  plan                         Write shot list, transcript, SRT and VTT
  preview [--theme ID]         Render composed-film stills and contact sheet
  render [--theme ID]          Require matching preview, render/gate, mix audio
  tts [--voice NAME] [--rate N]  Generate macOS scratch speech and a derived plan
  align --audio FILE --srt FILE Import a recording with manually aligned SRT

Outputs: out/<id>/ beside the project. Plans in ../../.videos/<project>/ use that project's public/ and out/ directories. Sample plans use the producer app. Replaced outputs move to out/<id>/.history/.
Scratch speech is labeled as scratch. Alignment imports timings, not ASR.`;
