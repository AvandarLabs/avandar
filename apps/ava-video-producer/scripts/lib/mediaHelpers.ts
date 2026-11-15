import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import {
  absoluteCues,
  durationInFrames,
  type Storyboard,
} from "../../src/storyboard/schema/schema";
import { publicAsset } from "./planHelpers";

export const ffmpeg =
  process.env.FFMPEG_BIN ||
  (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg");
export const ffprobe = process.env.FFPROBE_BIN || "ffprobe";

type RunOptions = { cwd?: string; quiet?: boolean; env?: NodeJS.ProcessEnv };

/** Execute argument arrays without a shell; retain diagnostic stderr separately. */
export async function runProcess(
  command: string,
  args: string[],
  options: RunOptions = {},
) {
  return await new Promise<{ stdout: string; stderr: string }>(
    (resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (!options.quiet) process.stdout.write(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr = (stderr + chunk).slice(-32000);
        if (!options.quiet) process.stderr.write(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve({ stdout, stderr })
          : reject(
              new Error(
                `${path.basename(command)} exited ${code}: ${stderr.slice(-3000)}`,
              ),
            ),
      );
    },
  );
}

/** Run without a shell so filenames and narration text cannot become commands. */
export async function run(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<string> {
  return (await runProcess(command, args, options)).stdout;
}

export type MediaStream = {
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  duration?: string;
  nb_frames?: string;
  sample_rate?: string;
};

/** Probe the actual media container, independent of its filename extension. */
export async function probe(filename: string) {
  const result = JSON.parse(
    await run(
      ffprobe,
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", filename],
      { quiet: true },
    ),
  );
  return {
    duration: Number(result.format?.duration),
    streams: result.streams as MediaStream[],
  };
}

/** Check timing before rendering so no speech or effects are silently cut off. */
export async function validateMedia(plan: Storyboard, root: string) {
  const cache = new Map<string, Awaited<ReturnType<typeof probe>>>();
  const inspect = async (asset: string) => {
    if (!cache.has(asset))
      cache.set(asset, await probe(await publicAsset(root, asset)));
    return cache.get(asset)!;
  };
  const audio = async (asset: string, label: string) => {
    const info = await inspect(asset);
    if (
      !info.streams.some((stream) => stream.codec_type === "audio") ||
      !Number.isFinite(info.duration) ||
      info.duration <= 0
    )
      throw new Error(`${label}: no usable audio stream`);
    return info;
  };
  for (const shot of plan.shots) {
    if (shot.scene !== "media") continue;
    const info = await inspect(shot.props.src);
    if (
      !info.streams.some(
        (stream) =>
          stream.codec_type === "video" &&
          Number(stream.width) > 0 &&
          Number(stream.height) > 0,
      )
    )
      throw new Error(`${shot.id}: asset has no visual stream`);
    if (
      shot.props.kind === "video" &&
      (!Number.isFinite(info.duration) ||
        info.duration + 0.04 <
          ((shot.props.trimBefore ?? 0) + shot.durationInFrames) / plan.fps)
    ) {
      throw new Error(`${shot.id}: video is shorter than trim + shot duration`);
    }
  }
  for (const cue of plan.narration) {
    if (!cue.audio) continue;
    const info = await audio(cue.audio, cue.id);
    if (info.duration > (cue.endFrame - cue.startFrame) / plan.fps + 0.02)
      throw new Error(
        `${cue.id}: recording exceeds its cue; retime the plan or rerecord`,
      );
  }
  const total = durationInFrames(plan) / plan.fps;
  if (plan.narrationTrack) {
    const info = await audio(plan.narrationTrack.src, "Narration track");
    const start = plan.narrationTrack.startFrame / plan.fps;
    const end = start + info.duration;
    if (end > total + 0.02)
      throw new Error("Narration recording extends beyond the film");
    const cues = absoluteCues(plan);
    if (cues[0] && start > cues[0].startFrame / plan.fps)
      throw new Error("Narration starts after the first aligned cue");
    if (cues.at(-1) && end + 0.1 < cues.at(-1)!.endFrame / plan.fps)
      throw new Error("Narration recording ends before the last aligned cue");
  }
  for (const sound of plan.soundEffects) {
    const info = await audio(sound.src, sound.id);
    if (sound.atFrame / plan.fps + info.duration > total + 0.02)
      throw new Error(`${sound.id}: sound extends beyond the film`);
  }
}

/** Hash encoded video packets to prove audio assembly did not re-encode picture. */
export async function videoHash(filename: string): Promise<string> {
  return (
    await run(
      ffmpeg,
      [
        "-v",
        "error",
        "-i",
        filename,
        "-map",
        "0:v:0",
        "-c:v",
        "copy",
        "-f",
        "hash",
        "-hash",
        "sha256",
        "-",
      ],
      { quiet: true },
    )
  ).trim();
}

/** Measure a whole track or a selected listening window in dBFS. */
export async function audioPeak(
  filename: string,
  start?: number,
  duration?: number,
): Promise<number> {
  const args = ["-hide_banner", "-nostats"];
  if (start !== undefined) args.push("-ss", String(start));
  args.push("-i", filename);
  if (duration !== undefined) args.push("-t", String(duration));
  args.push("-vn", "-af", "volumedetect", "-f", "null", "-");
  const { stderr } = await runProcess(ffmpeg, args, { quiet: true });
  const match = /max_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/.exec(stderr);
  if (!match) throw new Error("Unable to measure assembled audio");
  return match[1] === "-inf" ? -Infinity : Number(match[1]);
}

/** Verify picture duration before a mix can truncate or extend it. */
async function _assertPictureDuration(plan: Storyboard, picture: string) {
  const info = await probe(picture);
  const video = info.streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("Picture has no video stream");
  const duration = Number(video.duration ?? info.duration);
  if (
    !Number.isFinite(duration) ||
    Math.abs(duration - durationInFrames(plan) / plan.fps) >
      1 / plan.fps + 0.002
  ) {
    throw new Error("Picture duration does not match the storyboard");
  }
}

/** Mix approved tracks, then assert duration, signal and unchanged video packets. */
export async function mixAudio(
  plan: Storyboard,
  root: string,
  picture: string,
  destination: string,
): Promise<boolean> {
  if (path.resolve(picture) === path.resolve(destination))
    throw new Error(
      "Audio mix destination must differ from the checked picture",
    );
  await _assertPictureDuration(plan, picture);
  await validateMedia(plan, root);
  const tracks = [
    ...(plan.narrationTrack
      ? [
          {
            src: plan.narrationTrack.src,
            atFrame: plan.narrationTrack.startFrame,
            volume: plan.narrationTrack.volume,
          },
        ]
      : []),
    ...absoluteCues(plan).flatMap((cue) =>
      cue.audio ? [{ src: cue.audio, atFrame: cue.startFrame, volume: 1 }] : [],
    ),
    ...plan.soundEffects,
  ];
  if (!tracks.length) {
    await fs.copyFile(picture, destination);
    return false;
  }
  const args = ["-y", "-loglevel", "error", "-i", picture];
  for (const track of tracks)
    args.push("-i", await publicAsset(root, track.src));
  const filters = tracks.map((track, index) => {
    const delay = Math.round((track.atFrame / plan.fps) * 1000);
    return `[${index + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${track.volume},adelay=${delay}|${delay}[a${index}]`;
  });
  filters.push(
    `${tracks.map((_, index) => `[a${index}]`).join("")}amix=inputs=${tracks.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95:level=false:latency=1,apad[mix]`,
  );
  const expectedDuration = durationInFrames(plan) / plan.fps;
  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "0:v:0",
    "-map",
    "[mix]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(expectedDuration),
    "-movflags",
    "+faststart",
    destination,
  );
  await run(ffmpeg, args, { quiet: true });
  const result = await probe(destination);
  if (!result.streams.some((stream) => stream.codec_type === "audio"))
    throw new Error("Audio assembly produced no audio stream");
  if (Math.abs(result.duration - expectedDuration) > 0.08)
    throw new Error("Audio assembly changed film duration");
  if ((await videoHash(picture)) !== (await videoHash(destination)))
    throw new Error("Audio assembly changed the video packets");
  if (
    tracks.some((track) => track.volume > 0) &&
    (await audioPeak(destination)) <= -80
  )
    throw new Error("Assembled audio is silent");
  return true;
}
