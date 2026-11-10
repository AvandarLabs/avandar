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
 *     [--context <file>] [--json] [--fps 10] [--model gemini-4-argon]
 *     [--thinking xhigh]
 *
 * Videos are sent in the order given, each preceded by a text part naming its
 * label, so a prompt can refer to "REFERENCE" and "CANDIDATE". `--context`
 * files are appended after the prompt as extra text parts. `--json` asks for
 * a JSON reply (`responseMimeType: application/json`). `--thinking` sets
 * Argon's reasoning level (`low`, `medium`, `high`, `xhigh`, `max`); the
 * default `xhigh` trades time for accuracy on frame-level detail.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const API_BASE = "https://generativelanguage.googleapis.com";
const KEY_NAME = "GEMINI_API_KEY";
const ENV_FILE_NAME = ".env.video-producer.local";
const POLL_INTERVAL_MS = 4000;

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
  },
});

if (!values.prompt || !values.out || !values.video?.length) {
  console.error(
    "Usage: argon.mjs --prompt <file> --out <file> --video <label>=<file.mp4> [...]",
  );
  process.exit(2);
}

/** Finds the workspace root: the main checkout or worktree holding the env file. */
function findWorkspaceRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return process.cwd();
  }
}

/** Reads only the `GEMINI_API_KEY=` line, never the rest of the file. */
async function readApiKey() {
  if (process.env[KEY_NAME]) return process.env[KEY_NAME];
  const envPath = path.join(findWorkspaceRoot(), ENV_FILE_NAME);
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
  if (!uploadUrl) {
    throw new Error(`Upload start failed (${startResponse.status})`);
  }
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
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

/** Builds the request parts: labelled videos, then the prompt, then context. */
async function buildParts(uploadedVideos) {
  const videoParts = uploadedVideos.flatMap(({ label, file }) => [
    { text: `VIDEO "${label}" follows.` },
    {
      file_data: { mime_type: "video/mp4", file_uri: file.uri },
      video_metadata: { fps: Number(values.fps) },
    },
  ]);
  const contextParts = await Promise.all(
    (values.context ?? []).map(async (contextPath) => ({
      text: `CONTEXT FILE ${path.basename(contextPath)}:\n\n${await readFile(contextPath, "utf8")}`,
    })),
  );
  return [...videoParts, { text: await readFile(values.prompt, "utf8") }, ...contextParts];
}

async function main() {
  const apiKey = await readApiKey();
  const headers = { "x-goog-api-key": apiKey };
  const uploadedVideos = [];
  for (const spec of values.video) {
    const [label, filePath] = spec.split(/=(.*)/s);
    uploadedVideos.push({ label, file: await uploadVideo(apiKey, filePath, label) });
    console.log(`uploaded ${label}`);
  }
  const startedAt = Date.now();
  try {
    const response = await fetch(
      `${API_BASE}/v1beta/models/${values.model}:generateContent`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: await buildParts(uploadedVideos) }],
          generationConfig: {
            mediaResolution: "MEDIA_RESOLUTION_HIGH",
            thinkingConfig: { thinkingLevel: values.thinking },
            ...(values.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    const body = await response.json();
    if (!response.ok) {
      throw new Error(`generateContent ${response.status}: ${body.error?.message}`);
    }
    const replyText =
      body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    await writeFile(values.out, replyText);
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`wrote ${values.out} in ${seconds}s`);
    console.log(`usage ${JSON.stringify(body.usageMetadata)}`);
  } finally {
    await Promise.all(
      uploadedVideos.map(({ file }) =>
        fetch(`${API_BASE}/v1beta/${file.name}`, { method: "DELETE", headers }),
      ),
    );
  }
}

await main();
