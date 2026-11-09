import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/**
 * Turns a Google Drive file link into the file download, and refuses a
 * folder, a Sheet, or a Doc. A Sheet already has a connector.
 *
 * @returns Undefined when the host is not Google Drive or Google Docs.
 */
export function resolveGoogleFileUrl(
  url: URL,
): ResolvedPastedFileUrl | undefined {
  const host = url.hostname.toLowerCase();
  if (host === "docs.google.com") {
    return _resolveDocsUrl(url);
  }
  if (host === "drive.usercontent.google.com") {
    return {
      kind: "download",
      url: url.href,
      fileName: undefined,
      sourceLabel: "Google Drive",
    };
  }
  if (host !== "drive.google.com") {
    return undefined;
  }
  if (url.pathname.includes("/folders/")) {
    return { kind: "refuse", reason: "drive-folder" };
  }
  const fileId = _driveFileId(url);
  if (fileId === undefined) {
    return undefined;
  }
  return {
    kind: "download",
    url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    fileName: undefined,
    sourceLabel: "Google Drive",
  };
}

function _resolveDocsUrl(url: URL): ResolvedPastedFileUrl {
  if (url.pathname.includes("/spreadsheets/")) {
    return { kind: "refuse", reason: "google-sheet" };
  }
  return { kind: "refuse", reason: "google-document" };
}

function _driveFileId(url: URL): string | undefined {
  const fromPath = /\/file\/d\/([^/]+)/.exec(url.pathname);
  if (fromPath?.[1]) {
    return fromPath[1];
  }
  return url.searchParams.get("id") ?? undefined;
}
