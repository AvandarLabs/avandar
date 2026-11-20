import fs from "node:fs/promises";
import path from "node:path";
import {
  storyboardSchema,
  assetPathSchema,
  timeline,
  durationInFrames,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";

/**
 * Reads and validates a storyboard plan from a JSON file, refusing hidden or
 * non-JSON inputs. The video CLI calls it before planning, previewing, or
 * rendering a film.
 */
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

/**
 * Every public asset a plan uses, once each: shot stills and logos,
 * narration audio, and sound effects. Use it to hash or copy a film's media,
 * for example when fingerprinting a preview.
 */
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
 * A Markdown shot list for a plan: each shot's timing, scene, on-screen
 * summary, and narration, with the plan's evidence notes. The video CLI
 * writes it beside a plan for review.
 */
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
  if (!allowed(filename)) {
    throw new Error("Input file has a hidden name or unsupported extension");
  }
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
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      ) {
        throw error;
      }
    }
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error("Output directory cannot be a symlink or a file");
    }
  }
  return current;
}
