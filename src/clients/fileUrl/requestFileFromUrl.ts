import { fetchEdgeFunctionRoute } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";
import type { AcquiredPastedFile } from "$/fileUrl/AcquiredPastedFile.ts";
import type { EdgeFunctionFetch } from "@/clients/fetchEdgeFunctionRoute/fetchEdgeFunctionRoute";

/**
 * Asks the file-url edge function to download a pasted link. A single file
 * comes back as bytes. Several data files come back as a choice. The link
 * itself is not kept.
 */
export async function requestFileFromUrl(options: {
  url: string;
  memberPath?: string;
  fetch?: EdgeFunctionFetch;
}): Promise<AcquiredPastedFile> {
  const response = await fetchEdgeFunctionRoute({
    path: "file-url/acquire",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: options.url,
      memberPath: options.memberPath,
    }),
    fetch: options.fetch,
  });
  if (response.headers.get("X-Ava-Outcome") === "file") {
    return {
      outcome: "file",
      bytes: new Uint8Array(await response.arrayBuffer()),
      fileName: decodeURIComponent(
        response.headers.get("X-Ava-File-Name") ?? "download",
      ),
      mediaType:
        response.headers.get("Content-Type") ?? "application/octet-stream",
      sourceLabel: decodeURIComponent(
        response.headers.get("X-Ava-Source-Label") ?? "",
      ),
    };
  }
  const text = await response.text();
  try {
    const parsed: unknown = JSON.parse(text);
    if (_isAcquiredPastedFile(parsed)) {
      return parsed;
    }
  } catch {
    // A gateway failure is not the acquire body's JSON.
  }
  return {
    outcome: "error",
    reason: response.status === 401 ? "not-public" : "unreachable",
  };
}

function _isAcquiredPastedFile(value: unknown): value is AcquiredPastedFile {
  if (typeof value !== "object" || value === null || !("outcome" in value)) {
    return false;
  }
  const outcome = value.outcome;
  return outcome === "choice" || outcome === "error";
}
