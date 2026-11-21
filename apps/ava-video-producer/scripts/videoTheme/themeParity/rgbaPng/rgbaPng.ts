import { spawn } from "node:child_process";
import { MediaHelpers } from "../../../lib/MediaHelpers/MediaHelpers";
/** The pixel dimensions of a raw frame. */
type FrameSize = Readonly<{
  width: number;
  height: number;
}>;
/** Runs ffmpeg with binary stdin and collects binary stdout. */
async function _runFfmpeg({
  args,
  input = new Uint8Array(),
}: Readonly<{
  args: readonly string[];
  input?: Uint8Array;
}>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(MediaHelpers.ffmpeg, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
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
async function _readRgbaFromPng({
  file,
  size,
}: Readonly<{
  file: string;
  size: FrameSize;
}>): Promise<Uint8Array> {
  const rgba = await _runFfmpeg({
    args: [
      "-v",
      "error",
      "-i",
      file,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-",
    ],
  });
  if (rgba.length !== size.width * size.height * 4) {
    throw new Error(`${file} is not ${size.width}×${size.height}`);
  }
  return rgba;
}
/**
 * Encodes raw RGBA bytes as a lossless PNG, for example a parity diff image.
 */
async function _writePngFromRgba({
  file,
  rgba,
  size,
}: Readonly<{
  file: string;
  rgba: Uint8Array;
  size: FrameSize;
}>): Promise<void> {
  await _runFfmpeg({
    args: [
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
    input: rgba,
  });
}

/** Reads and writes RGBA PNG images for theme parity measurements. */
export const RgbaPng = {
  /**
   * Decodes a PNG into raw RGBA bytes, for pixel comparisons such as the theme
   * parity gate.
   */
  readRgbaFromPng: _readRgbaFromPng,
  /**
   * Encodes raw RGBA bytes as a lossless PNG, for example a parity diff image.
   */
  writePngFromRgba: _writePngFromRgba,
};
