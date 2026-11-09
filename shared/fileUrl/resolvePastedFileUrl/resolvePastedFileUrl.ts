import { resolveDropboxFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolveDropboxFileUrl.ts";
import { resolveGithubFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolveGithubFileUrl.ts";
import { resolveGoogleFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolveGoogleFileUrl.ts";
import { resolvePortalFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolvePortalFileUrl.ts";
import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/**
 * Classifies a link a person pasted on the upload page. Known page shapes
 * become the file or the catalog record behind them. Anything else that is
 * a public http(s) URL is downloaded as-is and typed from the response.
 */
export function resolvePastedFileUrl(input: string): ResolvedPastedFileUrl {
  const parsed = _parseHttpUrl(input.trim());
  if (parsed.kind === "refuse") {
    return parsed;
  }
  return (
    resolveGithubFileUrl(parsed.url) ??
    resolveGoogleFileUrl(parsed.url) ??
    resolveDropboxFileUrl(parsed.url) ??
    resolvePortalFileUrl(parsed.url)
  );
}

function _parseHttpUrl(
  input: string,
): { kind: "url"; url: URL } | { kind: "refuse"; reason: "not-a-url" | "unsupported-scheme" } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: "refuse", reason: "not-a-url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "refuse", reason: "unsupported-scheme" };
  }
  url.hash = "";
  return { kind: "url", url };
}
