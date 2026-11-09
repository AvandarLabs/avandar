import {
  fileNameFromPath,
} from "$/fileUrl/resolvePastedFileUrl/fileUrlParts.ts";
import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/**
 * Turns a Dropbox share link into a direct download. A folder link is
 * refused because a folder is not one file.
 *
 * @returns Undefined when the host is not Dropbox.
 */
export function resolveDropboxFileUrl(
  url: URL,
): ResolvedPastedFileUrl | undefined {
  const host = url.hostname.toLowerCase();
  if (host === "dl.dropboxusercontent.com") {
    return {
      kind: "download",
      url: url.href,
      fileName: fileNameFromPath(url),
      sourceLabel: "Dropbox",
    };
  }
  if (host !== "dropbox.com" && host !== "www.dropbox.com") {
    return undefined;
  }
  if (url.pathname.includes("/scl/fo/") || url.pathname.includes("/sh/")) {
    return { kind: "refuse", reason: "dropbox-folder" };
  }
  const downloadUrl = new URL(url.href);
  downloadUrl.searchParams.set("dl", "1");
  return {
    kind: "download",
    url: downloadUrl.href,
    fileName: fileNameFromPath(downloadUrl),
    sourceLabel: "Dropbox",
  };
}
