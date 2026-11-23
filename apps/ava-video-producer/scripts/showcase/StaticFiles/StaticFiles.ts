import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

type StreamFileParameters = {
  req: IncomingMessage;
  res: ServerResponse;
  file: string;
  download?: boolean;
};
/** Resolve only regular files inside an explicitly served directory. */
async function _servedFile({
  root,
  relative,
}: Readonly<{
  root: string;
  relative: string;
}>): Promise<string> {
  if (
    relative.split(/[\\/]/).some((part) => {
      return part.startsWith(".");
    })
  ) {
    throw new Error("Not found");
  }
  const base = await realpath(root);
  const file = await realpath(path.resolve(base, relative));
  if (!file.startsWith(`${base}${path.sep}`) || !(await stat(file)).isFile()) {
    throw new Error("Not found");
  }
  return file;
}
/** Stream one authorized asset with byte ranges for narration and downloads. */
async function _streamFile({
  req,
  res,
  file,
  download = false,
}: Readonly<StreamFileParameters>): Promise<void> {
  const info = await stat(file);

  const type = TYPES[path.extname(file)];
  if (!type) {
    throw new Error("Unsupported asset");
  }
  const range = _getRangeFromRequest({ req: req, res: res, size: info.size });
  if (!range) {
    return;
  }
  const { start, end } = range;
  const headers: Record<string, string | number> = {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    ...(download
      ? {
          "Content-Disposition": `attachment; filename="${path.basename(file)}"`,
        }
      : {}),
    ...(req.headers.range
      ? { "Content-Range": `bytes ${start}-${end}/${info.size}` }
      : {}),
    "Content-Length": Math.max(0, end - start + 1),
  };
  res.writeHead(req.headers.range ? 206 : 200, headers);
  if (req.method === "HEAD" || !info.size) {
    res.end();
    return;
  }
  createReadStream(file, { start, end })
    .on("error", () => {
      return res.destroy();
    })
    .pipe(res);
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".json": "application/json",
  ".txt": "text/plain",
  ".srt": "text/plain",
  ".vtt": "text/vtt",
};
function _getRangeFromRequest({
  req,
  res,
  size,
}: Readonly<{ req: IncomingMessage; res: ServerResponse; size: number }>):
  | { start: number; end: number }
  | undefined {
  let start = 0;
  let end = size - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416).end();
      return undefined;
    }
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(end, Number(match[2])) : end;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return undefined;
    }
  }

  return { start, end };
}

/**
 * Serves bounded showcase assets and streams their contents to HTTP
 * responses.
 */
export const StaticFiles = {
  /** Resolve only regular files inside an explicitly served directory. */
  servedFile: _servedFile,
  /**
   * Stream one authorized asset with byte ranges for narration and downloads.
   */
  streamFile: _streamFile,
};
