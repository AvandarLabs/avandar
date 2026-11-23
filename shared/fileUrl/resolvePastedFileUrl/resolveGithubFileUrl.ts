import {
  fileNameFromPath,
  pathParts,
} from "$/fileUrl/resolvePastedFileUrl/fileUrlParts.ts";
import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/**
 * Turns a GitHub file page into the raw file. A repository, folder, or issue
 * link is refused so the download does not fetch an HTML page.
 *
 * @returns Undefined when the host is not GitHub.
 */
export function resolveGithubFileUrl(
  url: URL,
): ResolvedPastedFileUrl | undefined {
  const host = url.hostname.toLowerCase();
  if (host === "raw.githubusercontent.com") {
    return {
      kind: "download",
      url: url.href,
      fileName: fileNameFromPath(url),
      sourceLabel: "GitHub",
    };
  }
  if (host !== "github.com" && host !== "www.github.com") {
    return undefined;
  }
  const parts = pathParts(url);
  const kind = parts[2];
  const owner = parts[0];
  const repo = parts[1];
  const revision = parts[3];
  if (
    owner === undefined ||
    repo === undefined ||
    revision === undefined ||
    (kind !== "blob" && kind !== "raw") ||
    parts.length < 5
  ) {
    return { kind: "refuse", reason: "github-not-a-file" };
  }
  const filePath = parts.slice(4).join("/");
  return {
    kind: "download",
    url: `https://raw.githubusercontent.com/${owner}/${repo}/${revision}/${filePath}`,
    fileName: fileNameFromPath(url),
    sourceLabel: "GitHub",
  };
}
