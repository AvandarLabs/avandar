#!/usr/bin/env node
import { productRequirements } from "./lib/productRequirements/productRequirements";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  durationInFrames,
  storyboardSchema,
  timeline,
  type Storyboard,
} from "../src/storyboard/schema/schema";
import { buildProduct } from "./build-avandar.mjs";
import {
  ffmpeg,
  run,
  probe,
  validateMedia,
  mixAudio,
} from "./lib/mediaHelpers";
import {
  readPlan,
  assetReferences,
  publicAsset,
  captionFiles,
  shotList,
  applySrt,
  safeInputFile,
  ensureDirectory,
  fileHash,
  fingerprintPlan,
  previewFrames,
  requireMatchingPreview,
} from "./lib/planHelpers";
import { videoWorkspace } from "./lib/video-workspace.mjs";
import { withWorkspaceAliases } from "./lib/withWorkspaceAliases.mjs";
import { requireLicense } from "./require-license.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_EXTENSIONS = [
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
const COMMANDS = [
  "validate",
  "plan",
  "preview",
  "render",
  "tts",
  "align",
] as const;
type Command = (typeof COMMANDS)[number];
type Options = {
  command: Command;
  filename: string;
  audio?: string;
  srt?: string;
  voice?: string;
  rate?: number;
};

const HELP = `Usage: pnpm video <command> <plan.json> [options]
  validate                     Check schema, assets and media timing
  plan                         Write shot list, transcript, SRT and VTT
  preview                      Render composed-film stills and contact sheet
  render                       Require matching preview, render/gate, mix audio
  tts [--voice NAME] [--rate N]  Generate macOS scratch speech and a derived plan
  align --audio FILE --srt FILE Import a recording with manually aligned SRT

Outputs: out/<id>/ beside the project. Plans in ../../.videos/<project>/ use that project's public/ and out/ directories. Sample plans use the producer app. Replaced outputs move to out/<id>/.history/.
Scratch speech is labeled as scratch. Alignment imports timings, not ASR.`;

/** Parse the intentionally small CLI without shell evaluation or implicit flags. */
export function parseArgs(argv: string[]): Options {
  const [command, filename, ...rest] = argv;
  if (!COMMANDS.includes(command as Command) || !filename)
    throw new Error(HELP);
  const options: Options = { command: command as Command, filename };
  const allowed =
    command === "tts"
      ? ["--voice", "--rate"]
      : command === "align"
        ? ["--audio", "--srt"]
        : [];
  const seen = new Set<string>();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!allowed.includes(flag) || !value || seen.has(flag))
      throw new Error(`Invalid or repeated option: ${flag}\n${HELP}`);
    seen.add(flag);
    if (flag === "--rate") options.rate = Number(value);
    else if (flag === "--voice") options.voice = value;
    else if (flag === "--audio") options.audio = value;
    else if (flag === "--srt") options.srt = value;
  }
  if (
    options.rate !== undefined &&
    (!Number.isInteger(options.rate) || options.rate < 80 || options.rate > 240)
  )
    throw new Error("Scratch speech rate must be 80 to 240 words per minute");
  if (command === "align" && (!options.audio || !options.srt))
    throw new Error("align requires --audio and --srt");
  return options;
}

function writeJson(filename: string, value: unknown) {
  return fs.writeFile(filename, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
  });
}

/** Preserve the previous stage intact before creating its replacement. */
async function freshStage(
  plan: Storyboard,
  name: string,
  workspace: string,
): Promise<string> {
  const parent = await ensureDirectory(workspace, `out/${plan.id}`);
  const target = path.join(parent, name);
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Stage output must be an owned directory");
    const history = await ensureDirectory(workspace, `out/${plan.id}/.history`);
    const stamp = new Date().toISOString().replaceAll(":", "-");
    await fs.rename(
      target,
      path.join(history, `${name}-${stamp}-${randomUUID().slice(0, 8)}`),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return ensureDirectory(workspace, `out/${plan.id}/${name}`);
}

async function validate(plan: Storyboard, workspace: string) {
  for (const asset of assetReferences(plan))
    await publicAsset(workspace, asset);
  await validateMedia(plan, workspace);
}

async function exportPlan(plan: Storyboard, workspace: string) {
  const directory = await freshStage(plan, "plan", workspace);
  const captions = captionFiles(plan);
  await writeJson(path.join(directory, "storyboard.json"), plan);
  await writeJson(path.join(directory, "props.json"), { plan });
  await fs.writeFile(path.join(directory, "shotlist.md"), shotList(plan), {
    flag: "wx",
  });
  for (const [filename, text] of [
    ["transcript.txt", captions.transcript],
    ["captions.srt", captions.srt],
    ["captions.vtt", captions.vtt],
  ]) {
    await fs.writeFile(path.join(directory, filename), text, { flag: "wx" });
  }
  return directory;
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function contactHtml(
  plan: Storyboard,
  samples: Array<{ frame: number; file: string; shot: string }>,
) {
  return `<!doctype html><meta charset="utf-8"><title>${html(plan.title)} preview</title>
<style>body{font:16px system-ui;background:#111;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure{margin:0}img{width:100%}figcaption{padding:8px 0}p{max-width:80ch}</style>
<h1>${html(plan.title)}</h1><p>Inspect layout, transitions, captions, real media and click targets before render. This file records generated previews, not human approval. Cells are in film order.</p>
<main>${samples.map((item) => `<figure><a href="${item.file}"><img src="${item.file}" alt="Frame ${item.frame}"></a><figcaption>Frame ${item.frame}, ${(item.frame / plan.fps).toFixed(2)} s, ${html(item.shot)}</figcaption></figure>`).join("")}</main>`;
}

/** Preview only explicitly referenced assets, never the repository root. */
async function stageAssets(
  plan: Storyboard,
  directory: string,
  workspace: string,
) {
  const target = path.join(directory, "bundle-public");
  await fs.mkdir(target);
  await fs.mkdir(path.join(target, "fonts"));
  await fs.copyFile(await publicAsset(ROOT, "fonts/geist-latin.woff2"), path.join(target, "fonts/geist-latin.woff2"));
  for (const asset of assetReferences(plan)) {
    const destination = path.join(target, asset);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(
      await publicAsset(workspace, asset),
      destination,
      fs.constants.COPYFILE_EXCL,
    );
  }
  return target;
}

/** Render actual composition frames with one reusable headless browser. */
async function preview(plan: Storyboard, filename: string, workspace: string) {
  const fingerprint = await fingerprintPlan(ROOT, filename, plan, workspace);
  const directory = await freshStage(plan, "preview", workspace);
  const publicDir = await stageAssets(plan, directory, workspace);
  const serveUrl = await bundle({
    webpackOverride: withWorkspaceAliases,
    entryPoint: path.join(
      ROOT,
      productRequirements(plan).needsProduct
        ? "src/avandar-entry.tsx"
        : "src/index.ts",
    ),
    outDir: path.join(directory, "bundle"),
    publicDir,
    rootDir: ROOT,
  });
  const browserOptions = process.env.CHROME_PATH
    ? {
        browserExecutable: process.env.CHROME_PATH,
        chromeMode: "chrome-for-testing" as const,
      }
    : { chromeMode: "headless-shell" as const };
  // Native MapLibre needs ANGLE on macOS Headless Shell; default SwiftShader
  // can fail WebGL2 context creation. This does not replace serial rendering.
  const chromiumOptions = {
    headless: true,
    ...(productRequirements(plan).needsMap
      ? { gl: "angle" as const }
      : {}),
  };
  const browser = await openBrowser("chrome", {
    ...browserOptions,
    chromiumOptions,
    logLevel: "error",
  });
  const frames = previewFrames(plan);
  const samples: Array<{ frame: number; file: string; shot: string }> = [];
  try {
    const composition = await selectComposition({
      serveUrl,
      id: "story-film",
      inputProps: { plan },
      puppeteerInstance: browser,
      ...browserOptions,
      chromiumOptions,
      envVariables: {},
      logLevel: "error",
    });
    for (const [index, frame] of frames.entries()) {
      const file = `still-${String(index).padStart(3, "0")}.jpg`;
      await renderStill({
        composition,
        serveUrl,
        inputProps: { plan },
        frame,
        output: path.join(directory, file),
        imageFormat: "jpeg",
        jpegQuality: 90,
        puppeteerInstance: browser,
        ...browserOptions,
        chromiumOptions,
        envVariables: {},
        logLevel: "error",
        licenseKey: requireLicense().privateKey,
      });
      const shot = timeline(plan).find(
        (item) => frame >= item.startFrame && frame < item.endFrame,
      )!;
      samples.push({ frame, file, shot: shot.id });
      if ((index + 1) % 10 === 0 || index === frames.length - 1)
        console.log(`Preview ${index + 1}/${frames.length}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  const tileHeight = Math.round((320 * plan.height) / plan.width);
  await run(
    ffmpeg,
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      "1",
      "-i",
      path.join(directory, "still-%03d.jpg"),
      "-vf",
      `scale=320:${tileHeight},tile=4x${Math.ceil(samples.length / 4)}:padding=8:margin=8:color=0x151719`,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      path.join(directory, "contact-sheet.jpg"),
    ],
    { quiet: true },
  );
  await fs.writeFile(
    path.join(directory, "index.html"),
    contactHtml(plan, samples),
    { flag: "wx" },
  );
  const after = await fingerprintPlan(ROOT, filename, plan, workspace);
  if (JSON.stringify(after) !== JSON.stringify(fingerprint))
    throw new Error(
      "Plan, media or renderer changed during preview; run it again",
    );
  await writeJson(path.join(directory, "manifest.json"), {
    version: 1,
    complete: true,
    generatedAt: new Date().toISOString(),
    fingerprint,
    samples,
    humanReview:
      "Inspect this preview before rendering; generation does not record approval.",
  });
  await fs.rm(path.join(directory, "bundle"), { recursive: true });
  await fs.rm(publicDir, { recursive: true });
  return directory;
}

/** Delegate picture creation to the original JPEG, encode and mandatory gate path. */
async function render(plan: Storyboard, filename: string, workspace: string) {
  const fingerprint = await fingerprintPlan(ROOT, filename, plan, workspace);
  const previewDirectory = path.join(workspace, "out", plan.id, "preview");
  await requireMatchingPreview(
    path.join(previewDirectory, "manifest.json"),
    fingerprint,
  );
  await fs.access(path.join(previewDirectory, "contact-sheet.jpg"));
  const directory = await freshStage(plan, "render", workspace);
  const props = path.join(directory, "props.json");
  await writeJson(props, { plan });
  const publicDir = await stageAssets(plan, directory, workspace);
  const last = timeline(plan).at(-1)!;
  const poster = last.startFrame + Math.floor(last.durationInFrames * 0.65);
  await run(
    "sh",
    [path.join(ROOT, "scripts/render.sh"), "story-film", String(poster)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        RENDER_OUT_DIR: directory,
        RENDER_OUTPUT_ID: plan.id,
        RENDER_ENTRY_POINT: productRequirements(plan).needsProduct
          ? "src/avandar-entry.tsx"
          : "src/index.ts",
        RENDER_PUBLIC_DIR: publicDir,
        RENDER_GL: productRequirements(plan).needsMap
          ? "angle"
          : "",
        REMOTION_PROPS_FILE: props,
        DELIVER: `${plan.delivery.width}:${plan.delivery.height}`,
        STANDALONE: plan.purpose === "standalone" ? "1" : "0",
        KEEP_RENDER_FRAMES: "1",
      },
    },
  );
  const picture = path.join(directory, `${plan.id}.mp4`);
  const final = path.join(directory, "final.mp4");
  const hasAudio = await mixAudio(plan, workspace, picture, final);
  const after = await fingerprintPlan(ROOT, filename, plan, workspace);
  if (JSON.stringify(after) !== JSON.stringify(fingerprint))
    throw new Error(
      "Plan, media or renderer changed during render; outputs remain for inspection",
    );
  await writeJson(path.join(directory, "manifest.json"), {
    version: 1,
    complete: true,
    fingerprint,
    generatedAt: new Date().toISOString(),
    final: "final.mp4",
    poster: `${plan.id}-poster.jpg`,
    hasAudio,
    durationInFrames: durationInFrames(plan),
    fps: plan.fps,
    pictureGate: "passed",
    videoStream: "copied without re-encoding during audio assembly",
  });
  await exportPlan(plan, workspace);
  await fs.rm(path.join(directory, `${plan.id}-frames`), {
    recursive: true,
    force: true,
  });
  return final;
}

/** Keep generated speech within its cue using bounded tempo, never truncation. */
async function synthesizeCue(
  text: string,
  directory: string,
  cueId: string,
  destination: string,
  seconds: number,
  options: Pick<Options, "voice" | "rate">,
) {
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

/** Produce scratch speech from captured cues in an owned output directory. */
export async function scratchTts(
  plan: Storyboard,
  options: Pick<Options, "filename" | "voice" | "rate">,
  workspace: string,
  relativeDirectory?: string,
) {
  if (!plan.narration.length)
    throw new Error("The storyboard has no narration cues");
  if (process.platform !== "darwin")
    throw new Error(
      "Scratch TTS requires macOS /usr/bin/say; use align with a provided recording on this platform",
    );
  await fs.access("/usr/bin/say", fs.constants.X_OK);
  const directory = relativeDirectory
    ? await ensureDirectory(workspace, relativeDirectory)
    : await freshStage(plan, "scratch", workspace);
  const namespace = `narration/${plan.id}/scratch-${randomUUID()}`;
  const assets = await ensureDirectory(workspace, `public/${namespace}`);
  const cues = [];
  const metadata = [];
  for (const cue of plan.narration) {
    const src = `${namespace}/${cue.id}.wav`;
    metadata.push(
      await synthesizeCue(
        cue.text,
        directory,
        cue.id,
        path.join(assets, `${cue.id}.wav`),
        (cue.endFrame - cue.startFrame) / plan.fps,
        options,
      ),
    );
    cues.push({ ...cue, audio: src });
  }
  const derived = storyboardSchema.parse({
    ...plan,
    narrationTrack: undefined,
    narration: cues,
    sourceNotes: [
      ...plan.sourceNotes,
      "Scratch narration generated locally with macOS say. Timing aid, not final voice performance.",
    ],
  });
  await validate(derived, workspace);
  const filename = path.join(directory, "storyboard.json");
  await writeJson(filename, derived);
  await writeJson(path.join(directory, "metadata.json"), {
    kind: "scratch-tts",
    engine: "macOS say",
    voice: options.voice ?? "system default",
    createdAt: new Date().toISOString(),
    sourcePlan: path.resolve(options.filename),
    assets: namespace,
    cues: metadata,
  });
  return filename;
}

/** Import supplied SRT timing with exact text matching; this performs no ASR. */
async function alignRecording(
  plan: Storyboard,
  options: Options,
  workspace: string,
) {
  const recording = await safeInputFile(options.audio!, AUDIO_EXTENSIONS);
  const srtFile = await safeInputFile(options.srt!, [".srt"]);
  const digest = await fileHash(recording);
  const src = `audio/${plan.id}/recorded-${digest}${path.extname(recording).toLowerCase()}`;
  const derived = applySrt(plan, await fs.readFile(srtFile, "utf8"), src);
  const info = await probe(recording);
  if (!info.streams.some((stream) => stream.codec_type === "audio"))
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
      (await fileHash(await publicAsset(workspace, src))) !== digest
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

/** Dispatch local pipeline stages; source plans are never edited in place. */
export async function main(argv = process.argv.slice(2)) {
  requireLicense();
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    console.log(HELP);
    return;
  }
  const options = parseArgs(argv);
  const workspace = await videoWorkspace(ROOT, options.filename);
  const plan = await readPlan(options.filename);
  if (
    ["preview", "render"].includes(options.command) &&
    productRequirements(plan).needsProduct
  )
    await buildProduct();
  if (options.command === "tts") {
    console.log(
      "Derived scratch plan:",
      await scratchTts(plan, options, workspace),
    );
    return;
  }
  if (options.command === "align") {
    console.log(
      "Derived aligned plan:",
      await alignRecording(plan, options, workspace),
    );
    return;
  }
  await validate(plan, workspace);
  if (options.command === "validate") {
    console.log(
      JSON.stringify(
        {
          valid: true,
          id: plan.id,
          shots: plan.shots.length,
          frames: durationInFrames(plan),
          seconds: durationInFrames(plan) / plan.fps,
          assets: assetReferences(plan).length,
          narration: plan.narrationTrack
            ? "provided track"
            : plan.narration.some((cue) => cue.audio)
              ? "per-cue recordings"
              : "text only",
        },
        null,
        2,
      ),
    );
  } else if (options.command === "plan")
    console.log("Plan artifacts:", await exportPlan(plan, workspace));
  else if (options.command === "preview")
    console.log(
      "Inspect preview:",
      await preview(plan, options.filename, workspace),
    );
  else
    console.log(
      "Finished video:",
      await render(plan, options.filename, workspace),
    );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
