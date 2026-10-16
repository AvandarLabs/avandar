import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

/** Resolve only regular files inside an explicitly served directory. */
export async function servedFile(root: string, relative: string) {
  if (relative.split(/[\\/]/).some((part) => part.startsWith("."))) {
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
export async function streamFile(
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  download = false,
) {
  const info = await stat(file);
  const types: Record<string, string> = {
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
  const type = types[path.extname(file)];
  if (!type) {
    throw new Error("Unsupported asset");
  }
  const headers: Record<string, string | number> = {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) {
    headers["Content-Disposition"] =
      `attachment; filename="${path.basename(file)}"`;
  }
  let start = 0;
  let end = info.size - 1;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416).end();
      return;
    }
    start = match[1]
      ? Number(match[1])
      : Math.max(0, info.size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(end, Number(match[2])) : end;
    if (start > end || start >= info.size) {
      res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
      return;
    }
    headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  }
  headers["Content-Length"] = Math.max(0, end - start + 1);
  res.writeHead(req.headers.range ? 206 : 200, headers);
  if (req.method === "HEAD" || !info.size) {
    res.end();
    return;
  }
  createReadStream(file, { start, end })
    .on("error", () => res.destroy())
    .pipe(res);
}
