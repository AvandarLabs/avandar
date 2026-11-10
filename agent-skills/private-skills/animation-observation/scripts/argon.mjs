#!/usr/bin/env node
/**
 * Sends one or more local videos plus a prompt file to Gemini Argon 4 and
 * writes the model's text reply to a file.
 *
 * The API key is read from `GEMINI_API_KEY` in the process environment, or
 * else from that single line of the workspace root's
 * `.env.video-producer.local`. No other line of that file is read, and the
 * key is never printed.
 *
 * Usage:
 *   node argon.mjs --prompt <prompt.md> --out <reply.md>
 *     --video <label>=<file.mp4> [--video <label>=<file.mp4> ...]
 *     [--context <file> ...] [--json] [--fps 10] [--thinking xhigh]
 *     [--clips-from <spec.md>] [--clip <startFrame>-<endFrame> ...]
 *     [--clip-pad 30] [--clips-only] [--model gemini-4-argon]
 *
 * Each video is sent whole, sampled at `--fps`, preceded by a label part
 * that also states its probed frame rate and frame count, so a prompt can
 * refer to "REFERENCE" and "CANDIDATE". `--context` files follow the prompt
 * as text parts. `--json` asks for a JSON reply. `--thinking` sets Argon's
 * reasoning level (`low`, `medium`, `high`, `xhigh`, `max`).
 *
 * Close-ups apply to the FIRST video. The API samples video at 24 fps at
 * most, so each clip is re-encoded slowed down until every source frame is
 * one 24 fps sample: clip sample k is source frame `startFrame + k`, with no
 * conversion for Argon to get wrong. `--clips-from <spec>` derives clips
 * (every shot boundary and transition window, padded by `--clip-pad` frames)
 * and one full-resolution still per shot from a spec's storyboard script.
 * `--clip` adds clips by hand. `--clips-only` skips the whole first video.
 */
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildBoundaryClips, buildShotStills, readStoryboard } from "./lib/specEvents.mjs";
import {
  extractFrameJpeg,
  probeVideo,
  workspaceRoot,
  writeFrameAccurateClip,
} from "./lib/videoTools.mjs";

const API_BASE = "https://generativelanguage.googleapis.com";
const KEY_NAME = "GEMINI_API_KEY";
const ENV_FILE_NAME = ".env.video-producer.local";
const POLL_INTERVAL_MS = 4000;
const MAX_SAMPLE_FPS = 24;

const { values } = parseArgs({
  options: {
    prompt: { type: "string" },
    out: { type: "string" },
    video: { type: "string", multiple: true },
    context: { type: "string", multiple: true },
    json: { type: "boolean", default: false },
    fps: { type: "string", default: "10" },
    model: { type: "string", default: "gemini-4-argon" },
    thinking: { type: "string", default: "xhigh" },
    "clips-from": { type: "string" },
    clip: { type: "string", multiple: true },
    "clip-pad": { type: "string", default: "30" },
    "clips-only": { type: "boolean", default: false },
  },
});

if (!values.prompt || !values.out || !values.video?.length) {
  console.error("Usage: argon.mjs --prompt <file> --out <file> --video <label>=<file.mp4> [...]");
  process.exit(2);
}

/** Reads only the `GEMINI_API_KEY=` line, never the rest of the file. */
async function readApiKey() {
  if (process.env[KEY_NAME]) return process.env[KEY_NAME];
  const envPath = path.join(workspaceRoot, ENV_FILE_NAME);
  if (!existsSync(envPath)) {
    throw new Error(`${KEY_NAME} is not set and ${ENV_FILE_NAME} is missing`);
  }
  const keyLine = (await readFile(envPath, "utf8"))
    .split("\n")
    .find((line) => line.startsWith(`${KEY_NAME}=`));
  const key = keyLine
    ?.slice(KEY_NAME.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!key) throw new Error(`${KEY_NAME} is empty in ${ENV_FILE_NAME}`);
  return key;
}

/** Uploads a video with the resumable Files API and waits until it is ACTIVE. */
async function uploadVideo(apiKey, filePath, displayName) {
  const headers = { "x-goog-api-key": apiKey };
  const numBytes = (await stat(filePath)).size;
  const startResponse = await fetch(`${API_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(numBytes),
      "X-Goog-Upload-Header-Content-Type": "video/mp4",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  const uploadUrl = startResponse.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error(`Upload start failed (${startResponse.status})`);
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: await readFile(filePath),
  });
  let file = (await uploadResponse.json()).file;
  while (file.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    file = await (await fetch(`${API_BASE}/v1beta/${file.name}`, { headers })).json();
  }
  if (file.state !== "ACTIVE") throw new Error(`${displayName} is ${file.state}`);
  return file;
}

/** Lists the clips and stills to send, from `--clips-from` and `--clip`. */
async function planCloseups(numFrames) {
  const manualClips = (values.clip ?? []).map((range) => range.split("-").map(Number));
  if (!values["clips-from"]) return { clips: manualClips, stills: [] };
  const { shots } = await readStoryboard(values["clips-from"]);
  const derivedClips = buildBoundaryClips(shots, Number(values["clip-pad"]), numFrames);
  return { clips: [...derivedClips, ...manualClips], stills: buildShotStills(shots) };
}

/** Builds the label part for one whole video. */
function buildVideoLabel(label, probe) {
  return (
    `VIDEO "${label}" follows: ${probe.numFrames} frames at ${probe.fps} fps ` +
    `(${probe.durationSeconds.toFixed(3)} s), sampled here at ${values.fps} fps.`
  );
}

/** Encodes, uploads, and labels the frame-accurate clips. */
async function buildClipParts(apiKey, video, clips, scratchDir, uploadedFiles) {
  const parts = [];
  for (const [index, [startFrame, endFrame]] of clips.entries()) {
    const clipPath = path.join(scratchDir, `clip-${index + 1}.mp4`);
    writeFrameAccurateClip(video.path, startFrame, endFrame, video.probe.fps, MAX_SAMPLE_FPS, clipPath);
    const file = await uploadVideo(apiKey, clipPath, `${video.label}-clip-${index + 1}`);
    uploadedFiles.push(file);
    parts.push(
      {
        text:
          `CLIP ${index + 1} follows: frames ${startFrame} to ${endFrame - 1} of "${video.label}", ` +
          `slowed so that every sample is exactly one consecutive video frame. ` +
          `Sample k (0-based), at clip time k/${MAX_SAMPLE_FPS} s, is video frame ${startFrame} + k. ` +
          `Report frames of "${video.label}" computed this way.`,
      },
      {
        file_data: { mime_type: "video/mp4", file_uri: file.uri },
        video_metadata: { fps: MAX_SAMPLE_FPS },
      },
    );
  }
  console.log(`uploaded ${clips.length} clips`);
  return parts;
}

/** Extracts and labels full-resolution stills of the first video. */
async function buildStillParts(video, stills, scratchDir) {
  const parts = [];
  for (const { shotId, frame } of stills) {
    const stillPath = path.join(scratchDir, `still-${frame}.jpg`);
    extractFrameJpeg(video.path, frame, video.probe.fps, stillPath);
    parts.push(
      { text: `STILL of "${video.label}" frame ${frame} (shot ${shotId}), full resolution:` },
      { inline_data: { mime_type: "image/jpeg", data: (await readFile(stillPath)).toString("base64") } },
    );
  }
  return parts;
}

/** Uploads everything and assembles the request parts in order. */
async function buildParts(apiKey, videos, scratchDir, uploadedFiles) {
  const [firstVideo] = videos;
  const { clips, stills } = await planCloseups(firstVideo.probe.numFrames);
  const wholeVideos = values["clips-only"] ? videos.slice(1) : videos;
  const videoParts = [];
  for (const video of wholeVideos) {
    const file = await uploadVideo(apiKey, video.path, video.label);
    uploadedFiles.push(file);
    videoParts.push(
      { text: buildVideoLabel(video.label, video.probe) },
      { file_data: { mime_type: "video/mp4", file_uri: file.uri }, video_metadata: { fps: Number(values.fps) } },
    );
    console.log(`uploaded ${video.label}`);
  }
  const clipParts = await buildClipParts(apiKey, firstVideo, clips, scratchDir, uploadedFiles);
  const stillParts = await buildStillParts(firstVideo, stills, scratchDir);
  const contextParts = await Promise.all(
    (values.context ?? []).map(async (contextPath) => ({
      text: `CONTEXT FILE ${path.basename(contextPath)}:\n\n${await readFile(contextPath, "utf8")}`,
    })),
  );
  const promptPart = { text: await readFile(values.prompt, "utf8") };
  return [...videoParts, ...clipParts, ...stillParts, promptPart, ...contextParts];
}

/** Calls generateContent and returns the reply text and usage. */
async function generate(apiKey, parts) {
  const response = await fetch(`${API_BASE}/v1beta/models/${values.model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        mediaResolution: "MEDIA_RESOLUTION_HIGH",
        thinkingConfig: { thinkingLevel: values.thinking },
        ...(values.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`generateContent ${response.status}: ${body.error?.message}`);
  const replyText = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return { replyText, usage: body.usageMetadata, finishReason: body.candidates?.[0]?.finishReason };
}

async function main() {
  const apiKey = await readApiKey();
  const videos = values.video.map((spec) => {
    const [label, filePath] = spec.split(/=(.*)/s);
    return { label, path: path.resolve(filePath), probe: probeVideo(filePath) };
  });
  const scratchDir = await mkdtemp(path.join(os.tmpdir(), "argon-"));
  const uploadedFiles = [];
  try {
    const parts = await buildParts(apiKey, videos, scratchDir, uploadedFiles);
    const startedAt = Date.now();
    const { replyText, usage, finishReason } = await generate(apiKey, parts);
    await writeFile(values.out, replyText);
    console.log(`wrote ${values.out} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s (${finishReason})`);
    console.log(`usage ${JSON.stringify(usage)}`);
    if (finishReason !== "STOP") console.warn(`warning: reply ended with ${finishReason}; it may be cut off`);
  } finally {
    const headers = { "x-goog-api-key": apiKey };
    await Promise.all(
      uploadedFiles.map((file) => fetch(`${API_BASE}/v1beta/${file.name}`, { method: "DELETE", headers })),
    );
    await rm(scratchDir, { recursive: true, force: true });
  }
}

await main();
