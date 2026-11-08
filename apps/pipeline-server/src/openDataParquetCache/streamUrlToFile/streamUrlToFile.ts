import { createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

/** A download the source refused, with the status it answered. */
export class SourceDownloadFailedError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The source answered the download with ${status}`);
    this.name = "SourceDownloadFailedError";
    this.status = status;
  }
}

/**
 * Streams a URL's response body to a file, never holding the whole body in
 * memory, so a source of any size can be downloaded.
 *
 * The URL is not repeated in the error: a file host's download URL can be a
 * presigned credential.
 *
 * @param options.url What to download.
 * @param options.filePath Where to write it. Replaced if it exists.
 * @param options.fetchUrl Replaces `fetch`, for tests.
 * @returns The file's size in bytes.
 * @throws `SourceDownloadFailedError` when the source answers with an error.
 */
export async function streamUrlToFile(
  options: Readonly<{
    url: string;
    filePath: string;
    fetchUrl?: (url: string) => Promise<Response>;
  }>,
): Promise<number> {
  const fetchUrl = options.fetchUrl ?? fetch;
  const response = await fetchUrl(options.url);
  if (!response.ok || response.body === null) {
    throw new SourceDownloadFailedError(response.status);
  }
  await pipeline(
    Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>),
    createWriteStream(options.filePath),
  );
  return (await stat(options.filePath)).size;
}
