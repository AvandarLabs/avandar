import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  storyboardSchema,
  assetPathSchema,
  absoluteCues,
  timeline,
  durationInFrames,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";
import { verifyProductBuild } from "../product-source.mjs";
import { productRequirements } from "../productRequirements/productRequirements";

export async function readPlan(filename: string): Promise<Storyboard> {
  return storyboardSchema.parse(
    JSON.parse(
      await fs.readFile(await safeInputFile(filename, [".json"]), "utf8"),
    ),
  );
}
/**
 * Resolve public assets without following a symlink outside the public
 * directory.
 */
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
      ...plan.shots.flatMap(_shotAssetReferences),
      ...plan.narration.flatMap((cue) => {
        return cue.audio ? [cue.audio] : [];
      }),
      ...(plan.narrationTrack ? [plan.narrationTrack.src] : []),
      ...plan.soundEffects.map((sound) => {
        return sound.src;
      }),
    ]),
  ];
}
/** Every public asset one shot's scene draws, such as stills and logos. */
function _shotAssetReferences(shot: Storyboard["shots"][number]): string[] {
  switch (shot.scene) {
    case "media":
      return [shot.props.src];
    case "typography":
      return shot.props.icon ? [shot.props.icon.src] : [];
    case "brand-lockup":
      return [shot.props.logo.src];
    case "tilted-window":
      return [
        ...(shot.props.windows ?? []).map((window) => {
          return window.src;
        }),
        ...(shot.props.pair ?? []).map((column) => {
          return column.window.src;
        }),
        ...(shot.props.secondary ? [shot.props.secondary.src] : []),
      ];
    default:
      return [];
  }
}
/**
 * Millisecond conversion uses rounded frame boundaries consistently for SRT and
 * VTT.
 */
export function timestamp(frame: number, fps: number, separator = ","): string {
  const milliseconds = Math.round((frame * 1000) / fps);
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor(milliseconds / 60000) % 60;
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const fraction = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(fraction).padStart(3, "0")}`;
}
export function captionFiles(plan: Storyboard): {
  srt: string;
  vtt: string;
  transcript: string;
} {
  const cues = absoluteCues(plan);
  const srt = cues
    .map((cue, index) => {
      return `${index + 1}\n${timestamp(cue.startFrame, plan.fps)} --> ${timestamp(cue.endFrame, plan.fps)}\n${cue.text}\n`;
    })
    .join("\n");
  const vtt =
    "WEBVTT\n\n" +
    cues
      .map((cue) => {
        return `${cue.id}\n${timestamp(cue.startFrame, plan.fps, ".")} --> ${timestamp(cue.endFrame, plan.fps, ".")}\n${cue.text}\n`;
      })
      .join("\n");
  const transcript = `${plan.title}\n\n${cues
    .map((cue) => {
      return cue.text;
    })
    .join("\n\n")}\n`;
  return { srt, vtt, transcript };
}
export function shotList(plan: Storyboard): string {
  const lines = timeline(plan).map((shot) => {
    const cues = plan.narration
      .filter((cue) => {
        return cue.shotId === shot.id;
      })
      .map((cue) => {
        return cue.text;
      })
      .join(" ");
    const summary =
      shot.note ??
      (shot.scene === "title"
        ? shot.props.name
        : (("title" in shot.props ? shot.props.title : undefined) ??
          shot.scene));
    return `| ${shot.startFrame} | ${(shot.startFrame / plan.fps).toFixed(2)} s | ${shot.id} | ${shot.scene} | ${shot.durationInFrames} | ${summary.replaceAll("|", "\\|")} | ${cues.replaceAll("|", "\\|")} |`;
  });
  return `# ${plan.title}\n\n${plan.description}\n\n${durationInFrames(plan)} frames at ${plan.fps} fps (${(durationInFrames(plan) / plan.fps).toFixed(2)} seconds). ${plan.purpose}.\n\n| Start frame | Time | Shot | Scene | Frames | On screen | Narration |\n| ---: | ---: | --- | --- | ---: | --- | --- |\n${lines.join("\n")}\n\n## Evidence\n\n${plan.sourceNotes
    .map((note) => {
      return `- ${note}`;
    })
    .join("\n")}\n`;
}
/**
 * Import manually aligned SRT cues without pretending to perform speech
 * recognition.
 */
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
    const normalize = (value: string) => {
      return value.replace(/\s+/g, " ").trim();
    };
    if (normalize(lines.join(" ")) !== normalize(cue.text))
      throw new Error(`SRT text differs from narration cue ${cue.id}`);
    const shot = shots.find((item) => {
      return item.id === cue.shotId;
    })!;
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
  const allowed = (value: string) => {
    return (
      !path.basename(value).startsWith(".") &&
      !value.split(path.sep).some((part) => {
        return part.startsWith(".env");
      }) &&
      extensions.includes(path.extname(value).toLowerCase())
    );
  };
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
/**
 * Create owned output directories one segment at a time, never through
 * symlinks.
 */
export async function ensureDirectory(
  root: string,
  relative: string,
): Promise<string> {
  const parts = relative.split("/");
  if (
    path.isAbsolute(relative) ||
    parts.some((part) => {
      return !part || part === "." || part === ".." || part.includes("\\");
    })
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
  assets: Array<{
    path: string;
    sha256: string;
  }>;
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
  for (const entry of entries.sort((a, b) => {
    return a.name.localeCompare(b.name);
  })) {
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
/**
 * Hash renderer sources and every referenced media asset, not only the JSON.
 */
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
    "public/fonts/figtree-latin.woff2",
    "../../pnpm-lock.yaml",
    "package.json",
    "scripts/render.sh",
    "scripts/render-sequence.mjs",
    "scripts/check-frames.mjs",
    "scripts/lib/frameGate.mjs",
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
  files.push(
    ...(await _rendererFiles(root, "scripts/video").catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          return [];
        }
        throw error;
      },
    )),
  );
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
  let saved: {
    complete?: boolean;
    fingerprint?: PlanFingerprint;
  };
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
