import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { requireLicense } from "./require-license.mjs";

requireLicense();
const ffmpeg =
  process.env.FFMPEG_BIN ||
  (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg");
const available = [
  "avandar-import",
  "avandar-explorer",
  "avandar-dashboards",
  "avandar-cases",
  "avandar-map",
  "avandar-overview",
];
const requested = process.argv.slice(2);
if (
  requested.some((id) => !available.includes(id)) ||
  new Set(requested).size !== requested.length
)
  throw Error(
    "Pass unique known Avandar film IDs, or no arguments to deliver all six.",
  );
const ids = requested.length ? requested : available;
const hash = async (file) =>
  createHash("sha256")
    .update(await fs.readFile(file))
    .digest("hex");
const provenance = JSON.parse(
  await fs.readFile("src/avandar/generated/build.json", "utf8"),
);
const records = [];
await fs.mkdir("out/component-deliveries", { recursive: true });
// Check every finished render before replacing any delivered asset.
for (const id of ids) {
  const root = path.join("out", id);
  const render = path.join(root, "render");
  const manifest = JSON.parse(
    await fs.readFile(path.join(render, "manifest.json"), "utf8"),
  );
  if (
    !manifest.complete ||
    manifest.pictureGate !== "passed" ||
    !manifest.hasAudio
  )
    throw Error(`Incomplete picture/audio: ${id}`);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        path.join(render, "final.mp4"),
      ],
      { encoding: "utf8" },
    ),
  );
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (
    video.width !== 1536 ||
    video.height !== 960 ||
    video.avg_frame_rate !== "30/1" ||
    +video.nb_frames !== manifest.durationInFrames ||
    !probe.streams.some((s) => s.codec_type === "audio")
  )
    throw Error(`Unexpected delivered media: ${id}`);
  records.push({
    id,
    root,
    render,
    manifest,
    seconds: Number(probe.format.duration),
    sha256: await hash(path.join(render, "final.mp4")),
  });
}
const backup = path.join(
  "out",
  "component-delivery-backups",
  new Date().toISOString().replaceAll(":", "-"),
);
await fs.mkdir(backup, { recursive: true });
for (const record of records) {
  const { id, root, render, manifest, seconds, sha256 } = record;
  const { plan } = JSON.parse(
    await fs.readFile(path.join(render, "props.json"), "utf8"),
  );
  const last = plan.shots.at(-1);
  const posterFrame =
    manifest.durationInFrames -
    last.durationInFrames +
    Math.floor(last.durationInFrames * 0.9);
  const deliveryPoster = path.join(root, "delivery-poster.jpg");
  // Select the completed result, not a save spinner or mid-camera transition.
  execFileSync(ffmpeg, [
    "-y",
    "-v",
    "error",
    "-i",
    path.join(render, "final.mp4"),
    "-vf",
    `select=eq(n\\,${posterFrame})`,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    deliveryPoster,
  ]);
  const assets = [
    ["final.mp4", `${id}.mp4`, render],
    ["delivery-poster.jpg", `${id}-poster.jpg`, root],
    ["transcript.txt", `${id}.txt`, path.join(root, "plan")],
    ["captions.srt", `${id}.srt`, path.join(root, "plan")],
    ["captions.vtt", `${id}.vtt`, path.join(root, "plan")],
  ];
  for (const [source, name, directory] of assets) {
    const target = path.join("out/component-deliveries", name);
    try {
      await fs.copyFile(
        target,
        path.join(backup, name),
        fs.constants.COPYFILE_EXCL,
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await fs.copyFile(path.join(directory, source), target);
  }
  await fs.writeFile(
    path.join("out/component-deliveries", `${id}.json`),
    JSON.stringify(
      {
        kind: "actual-product-component-render",
        sourceRevision: provenance.revision,
        sourceFiles: provenance.files.length,
        fps: 30,
        width: 1536,
        height: 960,
        frames: manifest.durationInFrames,
        seconds,
        posterFrame,
        posterSource: "Decoded final MP4 at the completed result hold",
        videoSha256: sha256,
        posterSha256: await hash(
          path.join("out/component-deliveries", `${id}-poster.jpg`),
        ),
        fingerprint: manifest.fingerprint,
        pictureGate: "passed",
        audio: "macOS Samantha scratch narration; duration and signal checked",
        generatedAt: manifest.generatedAt,
      },
      null,
      2,
    ) + "\n",
  );
}
console.log(
  `Delivered ${records.length} component films under out/component-deliveries; previous files preserved in ${backup}.`,
);
