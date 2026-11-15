import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import cursorTargets from "../../src/avandar/cursor-targets.json";
import { getContinuityTimeline } from "../../src/continuity/continuityTimeline";
import { getMotionDuration } from "../../src/motion-components/motionSettings";
import {
  storyboardSchema,
  assetPathSchema,
  absoluteCues,
  timeline,
  durationInFrames,
  type Storyboard,
} from "../../src/storyboard/schema/schema";
import { verifyProductBuild } from "./product-source.mjs";
import { productRequirements } from "./productRequirements/productRequirements";

export async function readPlan(filename: string): Promise<Storyboard> {
  return storyboardSchema.parse(
    JSON.parse(
      await fs.readFile(await safeInputFile(filename, [".json"]), "utf8"),
    ),
  );
}

/** Resolve public assets without following a symlink outside the public directory. */
export async function publicAsset(
  root: string,
  asset: string,
): Promise<string> {
  assetPathSchema.parse(asset);
  const publicRoot = await fs.realpath(path.join(root, "public"));
  const filename = await fs.realpath(path.join(publicRoot, asset));
  if (
    !filename.startsWith(publicRoot + path.sep) ||
    !(await fs.stat(filename)).isFile()
  ) {
    throw new Error(`Asset must be a file inside public/: ${asset}`);
  }
  assetPathSchema.parse(
    path.relative(publicRoot, filename).split(path.sep).join("/"),
  );
  return filename;
}

export function assetReferences(plan: Storyboard): string[] {
  return [
    ...new Set([
      ...plan.shots.flatMap((shot) =>
        shot.scene === "media" ? [shot.props.src] : [],
      ),
      ...plan.narration.flatMap((cue) => (cue.audio ? [cue.audio] : [])),
      ...(plan.narrationTrack ? [plan.narrationTrack.src] : []),
      ...plan.soundEffects.map((sound) => sound.src),
    ]),
  ];
}

/** Millisecond conversion uses rounded frame boundaries consistently for SRT and VTT. */
export function timestamp(frame: number, fps: number, separator = ","): string {
  const milliseconds = Math.round((frame * 1000) / fps);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const fraction = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(fraction).padStart(3, "0")}`;
}

export function captionFiles(plan: Storyboard) {
  const cues = absoluteCues(plan);
  const srt = cues
    .map(
      (cue, index) =>
        `${index + 1}\n${timestamp(cue.startFrame, plan.fps)} --> ${timestamp(cue.endFrame, plan.fps)}\n${cue.text}\n`,
    )
    .join("\n");
  const vtt =
    "WEBVTT\n\n" +
    cues
      .map(
        (cue) =>
          `${cue.id}\n${timestamp(cue.startFrame, plan.fps, ".")} --> ${timestamp(cue.endFrame, plan.fps, ".")}\n${cue.text}\n`,
      )
      .join("\n");
  const transcript = `${plan.title}\n\n${cues.map((cue) => cue.text).join("\n\n")}\n`;
  return { srt, vtt, transcript };
}

export function shotList(plan: Storyboard): string {
  const lines = timeline(plan).map((shot) => {
    const cues = plan.narration
      .filter((cue) => cue.shotId === shot.id)
      .map((cue) => cue.text)
      .join(" ");
    const summary =
      shot.note ??
      (shot.scene === "title"
        ? shot.props.name
        : (("title" in shot.props ? shot.props.title : undefined) ??
          shot.scene));
    return `| ${shot.startFrame} | ${(shot.startFrame / plan.fps).toFixed(2)} s | ${shot.id} | ${shot.scene} | ${shot.durationInFrames} | ${summary.replaceAll("|", "\\|")} | ${cues.replaceAll("|", "\\|")} |`;
  });
  return `# ${plan.title}\n\n${plan.description}\n\n${durationInFrames(plan)} frames at ${plan.fps} fps (${(durationInFrames(plan) / plan.fps).toFixed(2)} seconds). ${plan.purpose}.\n\n| Start frame | Time | Shot | Scene | Frames | On screen | Narration |\n| ---: | ---: | --- | --- | ---: | --- | --- |\n${lines.join("\n")}\n\n## Evidence\n\n${plan.sourceNotes.map((note) => `- ${note}`).join("\n")}\n`;
}

/** Import manually aligned SRT cues without pretending to perform speech recognition. */
export function applySrt(
  plan: Storyboard,
  srt: string,
  audio: string,
): Storyboard {
  const blocks = srt
    .replace(/^\uFEFF/, "")
    .replaceAll("\r\n", "\n")
    .trim()
    .split(/\n\s*\n/);
  if (blocks.length !== plan.narration.length)
    throw new Error("SRT cue count must match the storyboard narration");
  const parseTime = (value: string) => {
    const match = /^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value);
    if (!match || Number(match[2]) > 59 || Number(match[3]) > 59)
      throw new Error(`Invalid SRT timestamp: ${value}`);
    return Math.round(
      (Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3]) +
        Number(match[4]) / 1000) *
        plan.fps,
    );
  };
  const shots = timeline(plan);
  const narration = blocks.map((block, index) => {
    const lines = block.split("\n");
    if (/^\d+$/.test(lines[0])) lines.shift();
    const times = lines.shift()?.split(/\s+-->\s+/);
    if (!times || times.length !== 2)
      throw new Error(`Invalid SRT cue ${index + 1}`);
    const cue = plan.narration[index];
    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    if (normalize(lines.join(" ")) !== normalize(cue.text))
      throw new Error(`SRT text differs from narration cue ${cue.id}`);
    const shot = shots.find((item) => item.id === cue.shotId)!;
    const { audio: _audio, ...withoutAudio } = cue;
    return {
      ...withoutAudio,
      beatId: undefined,
      startFrame: parseTime(times[0]) - shot.startFrame,
      endFrame: parseTime(times[1]) - shot.startFrame,
    };
  });
  return storyboardSchema.parse({
    ...plan,
    narration,
    narrationTrack: { src: audio, startFrame: 0, volume: 1 },
  });
}

/** Reject unexpected and hidden input files before reading any content. */
export async function safeInputFile(
  filename: string,
  extensions: readonly string[],
): Promise<string> {
  const allowed = (value: string) =>
    !path.basename(value).startsWith(".") &&
    !value.split(path.sep).some((part) => part.startsWith(".env")) &&
    extensions.includes(path.extname(value).toLowerCase());
  if (!allowed(filename))
    throw new Error("Input file has a hidden name or unsupported extension");
  const resolved = await fs.realpath(filename);
  if (!allowed(resolved) || !(await fs.stat(resolved)).isFile()) {
    throw new Error(
      "Input must resolve to a regular file with an allowed extension",
    );
  }
  return resolved;
}

/** Create owned output directories one segment at a time, never through symlinks. */
export async function ensureDirectory(
  root: string,
  relative: string,
): Promise<string> {
  const parts = relative.split("/");
  if (
    path.isAbsolute(relative) ||
    parts.some(
      (part) => !part || part === "." || part === ".." || part.includes("\\"),
    )
  ) {
    throw new Error("Output directory must be relative and cannot traverse");
  }
  let current = await fs.realpath(root);
  for (const part of parts) {
    current = path.join(current, part);
    try {
      await fs.mkdir(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Output directory cannot be a symlink or a file");
  }
  return current;
}

/** Stream asset hashes so large captured videos are not loaded into memory. */
export async function fileHash(filename: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

/** Proof binds a preview to its exact source plan, assets and renderer. */
export type PlanFingerprint = {
  sourcePlanSha256: string;
  parsedPlanSha256: string;
  assets: Array<{ path: string; sha256: string }>;
  rendererSha256: string;
};

async function _rendererFiles(
  root: string,
  directory = "src",
): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink())
      throw new Error("Renderer source cannot contain symlinks");
    if (entry.isDirectory())
      files.push(...(await _rendererFiles(root, relative)));
    else if (
      /\.(tsx?|[cm]?jsx?|css|json|ya?ml)$/.test(entry.name) &&
      !entry.name.startsWith(".")
    )
      files.push(relative);
  }
  return files;
}

/** Hash renderer sources and every referenced media asset, not only the JSON. */
export async function fingerprintPlan(
  root: string,
  filename: string,
  plan: Storyboard,
  assetRoot = root,
): Promise<PlanFingerprint> {
  const sourcePlanSha256 = await fileHash(
    await safeInputFile(filename, [".json"]),
  );
  const parsedPlanSha256 = createHash("sha256")
    .update(JSON.stringify(plan))
    .digest("hex");
  const assets = [];
  for (const asset of assetReferences(plan).sort())
    assets.push({
      path: asset,
      sha256: await fileHash(await publicAsset(assetRoot, asset)),
    });
  const files = await _rendererFiles(root);
  if (productRequirements(plan).needsProduct) {
    files.push(...(await _rendererFiles(root, "avandar-adapter")));
    await verifyProductBuild(root);
    files.push(
      "src/avandar/generated/build.json",
      "scripts/build-avandar.mjs",
      "scripts/lib/product-source.mjs",
    );
  }
  for (const extra of [
    "remotion.config.ts",
    "public/fonts/geist-latin.woff2",
    "../../pnpm-lock.yaml",
    "package.json",
    "scripts/render.sh",
    "scripts/render-sequence.mjs",
    "scripts/check-frames.mjs",
    "scripts/video.ts",
    "scripts/lib/plan.ts",
    "scripts/lib/media.ts",
    "scripts/yaml/compileYaml.cjs",
    "scripts/yaml/yamlLoader.cjs",
  ]) {
    try {
      await fs.access(path.join(root, extra));
      files.push(extra);
    } catch {
      /* Optional in isolated tests. */
    }
  }
  const hash = createHash("sha256");
  for (const file of files.sort())
    hash.update(`${file}\0${await fileHash(path.join(root, file))}\n`);
  return {
    sourcePlanSha256,
    parsedPlanSha256,
    assets,
    rendererSha256: hash.digest("hex"),
  };
}

/** Refuse a render without a complete preview of the same evidence. */
export async function requireMatchingPreview(
  filename: string,
  fingerprint: PlanFingerprint,
): Promise<void> {
  let saved: { complete?: boolean; fingerprint?: PlanFingerprint };
  try {
    saved = JSON.parse(await fs.readFile(filename, "utf8"));
  } catch {
    throw new Error(
      "Run preview before render; its complete manifest is missing",
    );
  }
  if (!saved.complete)
    throw new Error("The preview did not complete; run preview again");
  if (JSON.stringify(saved.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error(
      "Plan, renderer or media changed after preview; regenerate and inspect the preview",
    );
  }
}

/** Sample complete-film frames, including dissolves and scene-specific beats. */
export function previewFrames(plan: Storyboard): number[] {
  const frames = new Set<number>();
  const add = (value: number) => {
    if (value >= 0 && value < durationInFrames(plan))
      frames.add(Math.round(value));
  };
  for (const shot of timeline(plan)) {
    const local = (value: number) =>
      add(
        shot.startFrame +
          Math.min(shot.durationInFrames - 1, Math.max(0, value)),
      );
    add(shot.startFrame - 1);
    for (const value of [
      0,
      1,
      Math.floor(shot.transitionInFrames / 2),
      shot.transitionInFrames,
      22,
      Math.floor(shot.durationInFrames * 0.65),
      shot.durationInFrames - 1,
    ])
      local(value);
    if (shot.scene === "continuity") {
      const positions = getContinuityTimeline(shot.props.beats);
      shot.props.beats.forEach((beat, index) => {
        const start = positions[index].start;
        const overlap = getMotionDuration(
          beat.transition.frames,
          beat.transition.motion,
        );
        for (const offset of [
          -1,
          0,
          Math.floor(overlap / 2),
          overlap,
          Math.min(180, beat.duration - 1),
          beat.duration - 1,
        ])
          local(start + offset);
        if (beat.content.kind === "composite") {
          local(start + beat.content.signalAt + 30);
          for (const diagram of beat.content.diagrams)
            local(start + diagram.at + 120);
        }
      });
    }
    if (shot.scene === "avandar") {
      for (const beat of cursorTargets[shot.props.feature] as Array<{
        frame: number;
      }>) {
        const modeOffset =
          shot.props.mode === "query"
            ? 290
            : shot.props.mode === "chart"
              ? 570
              : 0;
        const at = beat.frame - modeOffset - shot.props.fromFrame;
        if (at >= 0 && at < shot.durationInFrames)
          for (const shift of [-1, 8, 24]) local(at + shift);
      }
    }
    if (shot.scene === "graph")
      for (const item of shot.props.traversal ?? []) local(item.atFrame + 12);
    if (shot.scene === "flowchart")
      for (const at of shot.props.stepAtFrames ?? []) local(at + 12);
    if (shot.scene === "metric")
      local(
        (shot.props.countAtFrame ?? 0) +
          (shot.props.countDurationInFrames ?? 36),
      );
    if (shot.scene === "media")
      for (const item of shot.props.callouts ?? []) {
        local(item.startFrame + 1);
        local(item.endFrame - 1);
      }
  }
  for (const cue of absoluteCues(plan))
    add(Math.floor((cue.startFrame + cue.endFrame) / 2));
  return [...frames].sort((a, b) => a - b);
}
