import { readBoundedBody } from "$/utils/HttpClientFactory/readBoundedBody.ts";
import { HttpClientError } from "$/utils/HttpClientFactory/HttpClientError.ts";
import { contentDispositionFileName } from "$/fileUrl/contentDispositionFileName.ts";
import { PrivateFileHostError } from "$/fileUrl/PrivateFileHostError.ts";

const MAX_REDIRECTS = 5;

/** Bytes downloaded from a public URL, after redirects have been checked. */
export type PublicBytes = {
  ok: true;
  bytes: Uint8Array;
  mediaType: string;
  fileName: string | undefined;
  finalUrl: string;
};

/** A download that stopped before any file bytes were accepted. */
export type PublicFetchFailure = {
  ok: false;
  reason: "private-address" | "unreachable" | "not-public" | "too-large";
};

export type PublicFetch = PublicBytes | PublicFetchFailure;

/**
 * Downloads one public http(s) URL. Each redirect is checked again before it
 * is followed, and a body past `maxBytes` is refused before it is buffered.
 */
export async function fetchPublicBytes(input: {
  url: string;
  fetch: typeof fetch;
  assertPublicHost: (host: string) => Promise<void>;
  maxBytes: number;
}): Promise<PublicFetch> {
  let current = input.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const guarded = await _guardHost(current, input.assertPublicHost);
    if (!guarded.ok) {
      return guarded;
    }
    const response = await _request(current, input.fetch);
    if (!response) {
      return { ok: false, reason: "unreachable" };
    }
    const location = _redirectLocation(response, current);
    if (location) {
      await response.body?.cancel();
      current = location;
      continue;
    }
    const read = await _readBody(response, input.maxBytes);
    if (!read.ok) {
      return read;
    }
    return { ...read, finalUrl: current };
  }
  return { ok: false, reason: "unreachable" };
}

async function _guardHost(
  url: string,
  assertPublicHost: (host: string) => Promise<void>,
): Promise<{ ok: true } | PublicFetchFailure> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "unreachable" };
  }
  try {
    await assertPublicHost(parsed.hostname);
  } catch (error) {
    return error instanceof PrivateFileHostError
      ? { ok: false, reason: "private-address" }
      : { ok: false, reason: "unreachable" };
  }
  return { ok: true };
}

async function _request(
  url: string,
  fetchImpl: typeof fetch,
): Promise<Response | undefined> {
  try {
    return await fetchImpl(url, { redirect: "manual" });
  } catch {
    return undefined;
  }
}

function _redirectLocation(response: Response, current: string): string | undefined {
  if (response.status < 300 || response.status >= 400) {
    return undefined;
  }
  const location = response.headers.get("location");
  if (location === null) {
    return undefined;
  }
  return new URL(location, current).href;
}

async function _readBody(
  response: Response,
  maxBytes: number,
): Promise<Omit<PublicBytes, "finalUrl"> | PublicFetchFailure> {
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: "not-public" };
  }
  if (!response.ok) {
    return { ok: false, reason: "unreachable" };
  }
  try {
    const bytes = await readBoundedBody({
      response,
      maxBytes,
      method: "GET",
    });
    return {
      ok: true,
      bytes,
      mediaType: _bareMediaType(response.headers.get("content-type")),
      fileName: contentDispositionFileName(
        response.headers.get("content-disposition"),
      ),
    };
  } catch (error) {
    if (error instanceof HttpClientError && error.kind === "responseTooLarge") {
      return { ok: false, reason: "too-large" };
    }
    return { ok: false, reason: "unreachable" };
  }
}

function _bareMediaType(header: string | null): string {
  const mediaType = header?.split(";")[0]?.trim().toLowerCase();
  return mediaType === undefined || mediaType.length === 0
    ? "application/octet-stream"
    : mediaType;
}
