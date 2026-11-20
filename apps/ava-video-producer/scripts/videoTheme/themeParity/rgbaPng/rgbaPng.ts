import { spawn } from "node:child_process";
import { ffmpeg } from "../../../lib/mediaHelpers";

/** The pixel dimensions of a raw frame. */
type FrameSize = Readonly<{ width: number; height: number }>;

/** Runs ffmpeg with binary stdin and collects binary stdout. */
async function _runFfmpeg(
  args: readonly string[],
  input: Uint8Array = new Uint8Array(),
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      return chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      return code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(new Error(`ffmpeg exited ${code}: ${stderr}`));
    });
    child.stdin.end(input);
  });
}

/**
 * Decodes a PNG into raw RGBA bytes, for pixel comparisons such as the theme
 * parity gate. Rejects a PNG whose size is not the expected one.
 */
export async function readRgbaFromPng(
  file: string,
  size: FrameSize,
): Promise<Uint8Array> {
  const rgba = await _runFfmpeg([
    "-v",
    "error",
    "-i",
    file,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-",
  ]);
  if (rgba.length !== size.width * size.height * 4) {
    throw new Error(`${file} is not ${size.width}×${size.height}`);
  }
  return rgba;
}

/**
 * Encodes raw RGBA bytes as a lossless PNG, for example a parity diff image.
 */
export async function writePngFromRgba({
  file,
  rgba,
  size,
}: Readonly<{
  file: string;
  rgba: Uint8Array;
  size: FrameSize;
}>): Promise<void> {
  await _runFfmpeg(
    [
      "-v",
      "error",
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${size.width}x${size.height}`,
      "-i",
      "-",
      "-frames:v",
      "1",
      file,
    ],
    rgba,
  );
}
