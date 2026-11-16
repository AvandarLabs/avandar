import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promiseMapSequential, propEq } from "@avandar/utils";
import ffmpegStatic from "ffmpeg-static";
import { getSha256FromFile } from "./lib/getSha256FromFile";
import { requireLicense } from "./requireLicense";

// `pnpm component:deliver [film-id...]`: checks the finished component film
// renders, then copies them, their posters, and captions into ignored
// `out/component-deliveries/`, backing up whatever they replace.

/** The fields of a render's `manifest.json` that delivery reads. */
type RenderManifest = {
  complete: boolean;
  pictureGate: string;
  hasAudio: boolean;
  durationInFrames: number;
  fingerprint: unknown;
  generatedAt: string;
};

/** A checked render, ready to deliver. */
type CheckedFilm = {
  id: string;
  root: string;
  render: string;
  manifest: RenderManifest;
  seconds: number;
  sha256: string;
};

/** The build provenance fields delivery records beside each film. */
type BuildProvenance = { revision: string; files: unknown[] };

type ProbeStream = {
  codec_type: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  nb_frames?: string;
};

/** The six Avandar component films delivery knows. */
const AVAILABLE_FILMS = [
  "avandar-import",
  "avandar-explorer",
  "avandar-dashboards",
  "avandar-cases",
  "avandar-map",
  "avandar-overview",
] as const;

type AvailableFilmId = (typeof AVAILABLE_FILMS)[number];

const DELIVERY_DIRECTORY = "out/component-deliveries";

const ffmpeg =
  process.env.FFMPEG_BIN ||
  (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg");

function _probe(file: string): {
  streams: ProbeStream[];
  format: { duration: string };
} {
  return JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      { encoding: "utf8" },
    ),
  );
}

/** Throws unless the film's final render is complete, gated, and 1536x960. */
async function _checkFilm(id: string): Promise<CheckedFilm> {
  const root = path.join("out", id);
  const render = path.join(root, "render");
  const manifest: RenderManifest = JSON.parse(
    await fs.readFile(path.join(render, "manifest.json"), "utf8"),
  );
  if (
    !manifest.complete ||
    manifest.pictureGate !== "passed" ||
    !manifest.hasAudio
  ) {
    throw Error(`Incomplete picture/audio: ${id}`);
  }
  const probe = _probe(path.join(render, "final.mp4"));
  const video = probe.streams.find(propEq("codec_type", "video"));
  if (
    video?.width !== 1536 ||
    video.height !== 960 ||
    video.avg_frame_rate !== "30/1" ||
    Number(video.nb_frames) !== manifest.durationInFrames ||
    !probe.streams.some(propEq("codec_type", "audio"))
  ) {
    throw Error(`Unexpected delivered media: ${id}`);
  }
  return {
    id,
    root,
    render,
    manifest,
    seconds: Number(probe.format.duration),
    sha256: await getSha256FromFile(path.join(render, "final.mp4")),
  };
}

/** Writes the poster at the completed result hold of the final shot. */
async function _writePoster(film: Readonly<CheckedFilm>): Promise<number> {
  const props: { plan: { shots: Array<{ durationInFrames: number }> } } =
    JSON.parse(await fs.readFile(path.join(film.render, "props.json"), "utf8"));
  const lastShot = props.plan.shots[props.plan.shots.length - 1];
  const posterFrame =
    film.manifest.durationInFrames -
    lastShot.durationInFrames +
    Math.floor(lastShot.durationInFrames * 0.9);
  // Select the completed result, not a save spinner or mid-camera transition.
  execFileSync(ffmpeg, [
    "-y",
    "-v",
    "error",
    "-i",
    path.join(film.render, "final.mp4"),
    "-vf",
    `select=eq(n\\,${posterFrame})`,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    path.join(film.root, "delivery-poster.jpg"),
  ]);
  return posterFrame;
}

/**
 * Copies one asset into the delivery folder, backing up the file it
 * replaces.
 */
async function _deliverAsset(options: {
  sourceFile: string;
  name: string;
  backup: string;
}): Promise<void> {
  const target = path.join(DELIVERY_DIRECTORY, options.name);
  try {
    await fs.copyFile(
      target,
      path.join(options.backup, options.name),
      fs.constants.COPYFILE_EXCL,
    );
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
  await fs.copyFile(options.sourceFile, target);
}

async function _writeDeliveryRecord(options: {
  film: Readonly<CheckedFilm>;
  posterFrame: number;
  provenance: Readonly<BuildProvenance>;
}): Promise<void> {
  const { film, posterFrame, provenance } = options;
  const record = {
    kind: "actual-product-component-render",
    sourceRevision: provenance.revision,
    sourceFiles: provenance.files.length,
    fps: 30,
    width: 1536,
    height: 960,
    frames: film.manifest.durationInFrames,
    seconds: film.seconds,
    posterFrame,
    posterSource: "Decoded final MP4 at the completed result hold",
    videoSha256: film.sha256,
    posterSha256: await getSha256FromFile(
      path.join(DELIVERY_DIRECTORY, `${film.id}-poster.jpg`),
    ),
    fingerprint: film.manifest.fingerprint,
    pictureGate: "passed",
    audio: "macOS Samantha scratch narration; duration and signal checked",
    generatedAt: film.manifest.generatedAt,
  };
  await fs.writeFile(
    path.join(DELIVERY_DIRECTORY, `${film.id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

async function _deliverFilm(options: {
  film: Readonly<CheckedFilm>;
  backup: string;
  provenance: Readonly<BuildProvenance>;
}): Promise<void> {
  const { film, backup } = options;
  const posterFrame = await _writePoster(film);
  const plan = path.join(film.root, "plan");
  const assets = [
    [path.join(film.render, "final.mp4"), `${film.id}.mp4`],
    [path.join(film.root, "delivery-poster.jpg"), `${film.id}-poster.jpg`],
    [path.join(plan, "transcript.txt"), `${film.id}.txt`],
    [path.join(plan, "captions.srt"), `${film.id}.srt`],
    [path.join(plan, "captions.vtt"), `${film.id}.vtt`],
  ];
  await promiseMapSequential(assets, ([sourceFile, name]) =>
    _deliverAsset({ sourceFile, name, backup }),
  );
  await _writeDeliveryRecord({
    film,
    posterFrame,
    provenance: options.provenance,
  });
}

function _isAvailableFilm(id: string): id is AvailableFilmId {
  return (AVAILABLE_FILMS as readonly string[]).includes(id);
}

/** The requested film IDs, or all six when none are named. */
function _getRequestedFilms(requested: readonly string[]): string[] {
  if (
    !requested.every(_isAvailableFilm) ||
    new Set(requested).size !== requested.length
  ) {
    throw Error(
      "Pass unique known Avandar film IDs, or no arguments to deliver all six.",
    );
  }
  return requested.length ? [...requested] : [...AVAILABLE_FILMS];
}

async function _deliverFilms(ids: readonly string[]): Promise<void> {
  const provenance: BuildProvenance = JSON.parse(
    await fs.readFile("src/avandar/generated/build.json", "utf8"),
  );
  await fs.mkdir(DELIVERY_DIRECTORY, { recursive: true });
  // Check every finished render before replacing any delivered asset.
  const films = await Promise.all(ids.map(_checkFilm));
  const backup = path.join(
    "out",
    "component-delivery-backups",
    new Date().toISOString().replaceAll(":", "-"),
  );
  await fs.mkdir(backup, { recursive: true });
  // Deliver one film at a time, so a failure stops before the next one.
  await promiseMapSequential(films, (film) =>
    _deliverFilm({ film, backup, provenance }),
  );
  console.log(
    `Delivered ${films.length} component films under ${DELIVERY_DIRECTORY}; previous files preserved in ${backup}.`,
  );
}

requireLicense();
await _deliverFilms(_getRequestedFilms(process.argv.slice(2)));
