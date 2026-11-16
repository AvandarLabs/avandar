import type {
  AcquiredPastedFile,
  FileUrlFailureReason,
} from "$/fileUrl/AcquiredPastedFile.ts";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const PAYLOAD_TOO_LARGE = 413;
const BAD_GATEWAY = 502;

/**
 * The HTTP response for one pasted-link download. A single file is the raw
 * bytes. A choice or a refusal is JSON, so the upload page can show it
 * without guessing from a status code alone.
 */
export function acquiredFileResponse(acquired: AcquiredPastedFile): Response {
  if (acquired.outcome === "file") {
    // Downloaded and unzipped bytes are always backed by a plain
    // ArrayBuffer, which is what a Response body takes.
    return new Response(acquired.bytes as Uint8Array<ArrayBuffer>, {
      status: 200,
      headers: {
        "Content-Type": acquired.mediaType,
        "X-Ava-Outcome": "file",
        "X-Ava-File-Name": encodeURIComponent(acquired.fileName),
        "X-Ava-Source-Label": encodeURIComponent(acquired.sourceLabel),
        "Access-Control-Expose-Headers":
          "X-Ava-Outcome, X-Ava-File-Name, X-Ava-Source-Label, Content-Type",
      },
    });
  }
  const status =
    acquired.outcome === "choice" ? 200 : _statusFor(acquired.reason);
  return new Response(JSON.stringify(acquired), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function _statusFor(reason: FileUrlFailureReason): number {
  if (reason === "too-large") {
    return PAYLOAD_TOO_LARGE;
  }
  if (reason === "private-address" || reason === "not-public") {
    return FORBIDDEN;
  }
  if (reason === "unreachable") {
    return BAD_GATEWAY;
  }
  return BAD_REQUEST;
}
