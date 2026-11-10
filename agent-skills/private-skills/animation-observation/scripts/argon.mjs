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
 *     [--clips-from [<label>=]<spec.md|storyboard.json> ...]
 *     [--clip [<label>:]<startFrame>-<endFrame> ...]
 *     [--clip-pad 15] [--clips-only] [--dry-run] [--model gemini-4-argon]
 *
 * Each video is sent whole, sampled at `--fps`, preceded by a label part
 * that also states its probed frame rate and frame count, so a prompt can
 * refer to "REFERENCE" and "CANDIDATE". `--context` files follow the prompt
 * as text parts. `--json` asks for a JSON reply. `--thinking` sets Argon's
 * reasoning level (`low`, `medium`, `high`, `xhigh`, `max`).
 *
 * Close-ups: the API samples video at 24 fps at most, so each clip is
 * re-encoded slowed down until every source frame is one 24 fps sample:
 * clip sample k is source frame `startFrame + k`, with no conversion for
 * Argon to get wrong. `--clips-from <label>=<file>` derives clips (every shot
 * boundary, transition, camera move, and short motion, padded by
 * `--clip-pad` frames) and one
 * full-resolution still per shot for that video, from a motion spec's
 * storyboard script or a producer `storyboard.json`. Without `<label>=`, it
 * applies to the first video. `--clip` adds clips by hand, with the same
 * optional label prefix. `--clips-only` skips the whole first video.
 * `--dry-run` prints the planned clips and stills and exits without calling
 * the API or reading the key.
 */
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildBoundaryClips, buildShotStills, readShots } from "./lib/specEvents.mjs";
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
/** Large video requests can take over 10 minutes; `fetch` gives up at 5. */
const GENERATE_TIMEOUT_MS = 30 * 60 * 1000;

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
    "clips-from": { type: "string", multiple: true },
    clip: { type: "string", multiple: true },
    "clip-pad": { type: "string", default: "15" },
    "clips-only": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
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

/** Splits an optional `<label><separator>` prefix off a CLI value. */
function splitLabel(value, separator, defaultLabel) {
  const index = value.indexOf(separator);
  const hasLabel = index > 0 && !value.slice(0, index).includes("/");
  return hasLabel ? [value.slice(0, index), value.slice(index + 1)] : [defaultLabel, value];
}

/** Lists each video's clips and stills, from `--clips-from` and `--clip`. */
async function planCloseups(videos) {
  const plans = new Map(videos.map((video) => [video.label, { clips: [], stills: [] }]));
  const planFor = (label) => {
    if (!plans.has(label)) throw new Error(`No --video labelled ${label}`);
    return plans.get(label);
  };
  for (const value of values["clips-from"] ?? []) {
    const [label, filePath] = splitLabel(value, "=", videos[0].label);
    const video = videos.find((candidate) => candidate.label === label);
    const shots = await readShots(filePath);
    planFor(label).clips.push(...buildBoundaryClips(shots, Number(values["clip-pad"]), video.probe.numFrames));
    planFor(label).stills.push(...buildShotStills(shots));
  }
  for (const value of values.clip ?? []) {
    const [label, range] = splitLabel(value, ":", videos[0].label);
    planFor(label).clips.push(range.split("-").map(Number));
  }
  for (const plan of plans.values()) plan.clips = mergeClips(plan.clips);
  return plans;
}

/** Sorts clips and merges any that overlap or touch, across sources. */
function mergeClips(clips) {
  return [...clips]
    .sort((left, right) => left[0] - right[0])
    .reduce((merged, clip) => {
      const lastClip = merged.at(-1);
      if (lastClip && clip[0] <= lastClip[1]) lastClip[1] = Math.max(lastClip[1], clip[1]);
      else merged.push([...clip]);
      return merged;
    }, []);
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
    const clipPath = path.join(scratchDir, `${video.label}-clip-${index + 1}.mp4`);
    writeFrameAccurateClip(video.path, startFrame, endFrame, video.probe.fps, MAX_SAMPLE_FPS, clipPath);
    const file = await uploadVideo(apiKey, clipPath, `${video.label}-clip-${index + 1}`);
    uploadedFiles.push(file);
    parts.push(
      {
        text:
          `CLIP ${video.label}-${index + 1} follows: frames ${startFrame} to ${endFrame - 1} of "${video.label}", ` +
          `slowed so that every sample is exactly one consecutive video frame. ` +
          `Sample k (0-based), at clip time k/${MAX_SAMPLE_FPS} s, is video frame ${startFrame} + k. ` +
          `To find a frame, read the clip timestamp t (seconds) of the sample and compute ` +
          `${startFrame} + round(t * ${MAX_SAMPLE_FPS}); do not count samples by hand through still stretches.`,
      },
      {
        file_data: { mime_type: "video/mp4", file_uri: file.uri },
        video_metadata: { fps: MAX_SAMPLE_FPS },
      },
    );
  }
  if (clips.length) console.log(`uploaded ${clips.length} ${video.label} clips`);
  return parts;
}

/** Extracts and labels full-resolution stills of the first video. */
async function buildStillParts(video, stills, scratchDir) {
  const parts = [];
  for (const { shotId, frame } of stills) {
    const stillPath = path.join(scratchDir, `${video.label}-still-${frame}.jpg`);
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
  const closeupPlans = await planCloseups(videos);
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
  const closeupParts = [];
  for (const video of videos) {
    const { clips, stills } = closeupPlans.get(video.label);
    closeupParts.push(...(await buildClipParts(apiKey, video, clips, scratchDir, uploadedFiles)));
    closeupParts.push(...(await buildStillParts(video, stills, scratchDir)));
  }
  const contextParts = await Promise.all(
    (values.context ?? []).map(async (contextPath) => ({
      text: `CONTEXT FILE ${path.basename(contextPath)}:\n\n${await readFile(contextPath, "utf8")}`,
    })),
  );
  const promptPart = { text: await readFile(values.prompt, "utf8") };
  return [...videoParts, ...closeupParts, promptPart, ...contextParts];
}

/**
 * POSTs JSON over `node:https` and parses the JSON reply. Used instead of
 * `fetch` because undici's default headers timeout (300 s) is shorter than a
 * long video request takes to answer.
 */
function postJson(url, headers, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      { method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(body) } },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          try {
            resolve({ status: response.statusCode, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(GENERATE_TIMEOUT_MS, () => request.destroy(new Error("generateContent timed out")));
    request.on("error", reject);
    request.end(body);
  });
}

/** Status codes worth retrying: rate limits and transient server load. */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [30_000, 90_000, 180_000];

/** Calls generateContent, retrying transient failures with the same uploads. */
async function generate(apiKey, parts) {
  for (let attempt = 0; ; attempt += 1) {
    const result = await generateOnce(apiKey, parts);
    if (!RETRY_STATUSES.has(result.status) || attempt >= RETRY_DELAYS_MS.length) {
      if (result.status !== 200) {
        throw new Error(`generateContent ${result.status}: ${result.body.error?.message}`);
      }
      return result.reply;
    }
    console.warn(`generateContent ${result.status}; retrying in ${RETRY_DELAYS_MS[attempt] / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}

/** One generateContent call; returns the status, body, and parsed reply. */
async function generateOnce(apiKey, parts) {
  const { status, json: body } = await postJson(
    `${API_BASE}/v1beta/models/${values.model}:generateContent`,
    { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    {
      contents: [{ parts }],
      generationConfig: {
        mediaResolution: "MEDIA_RESOLUTION_HIGH",
        thinkingConfig: { thinkingLevel: values.thinking },
        ...(values.json ? { responseMimeType: "application/json" } : {}),
      },
    },
  );
  const replyText = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const reply = { replyText, usage: body.usageMetadata, finishReason: body.candidates?.[0]?.finishReason };
  return { status, body, reply };
}

/** Rough token costs measured on Argon at MEDIA_RESOLUTION_HIGH. */
const TOKENS_PER_VIDEO_SAMPLE = 273;
const TOKENS_PER_STILL = 1100;
const TOKEN_LIMIT = 1_048_576;

/** Prints what a run would send and its estimated size, without calling the API. */
async function printDryRun(videos) {
  const wholeVideos = values["clips-only"] ? videos.slice(1) : videos;
  let numTokens = wholeVideos.reduce(
    (sum, video) => sum + video.probe.durationSeconds * Number(values.fps) * TOKENS_PER_VIDEO_SAMPLE,
    0,
  );
  for (const [label, { clips, stills }] of await planCloseups(videos)) {
    const numClipFrames = clips.reduce((sum, [start, end]) => sum + end - start, 0);
    numTokens += numClipFrames * TOKENS_PER_VIDEO_SAMPLE + stills.length * TOKENS_PER_STILL;
    console.log(`${label}: ${clips.length} clips (${numClipFrames} frames), ${stills.length} stills`);
    console.log(`  clips: ${clips.map(([start, end]) => `${start}-${end}`).join(" ")}`);
  }
  const verdict = numTokens < TOKEN_LIMIT * 0.9 ? "ok" : "TOO LARGE: lower --clip-pad or --fps";
  console.log(`estimated ${Math.round(numTokens / 1000)}k media tokens of ${Math.round(TOKEN_LIMIT / 1000)}k: ${verdict}`);
}

async function main() {
  const videos = values.video.map((spec) => {
    const [label, filePath] = spec.split(/=(.*)/s);
    return { label, path: path.resolve(filePath), probe: probeVideo(filePath) };
  });
  if (values["dry-run"]) return printDryRun(videos);
  const apiKey = await readApiKey();
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
