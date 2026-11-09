import { FILE_URL_MAX_BYTES } from "$/fileUrl/PastedFileUrl.ts";
import {
  ckanImportResources,
  ckanResourceChoice,
} from "$/fileUrl/ckanImportResources.ts";
import { classifyDownloadedBytes } from "$/fileUrl/classifyDownloadedBytes.ts";
import { fetchPublicBytes } from "$/fileUrl/fetchPublicBytes.ts";
import { resolvePastedFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolvePastedFileUrl.ts";
import type { AcquiredPastedFile } from "$/fileUrl/AcquiredPastedFile.ts";
import type { PublicBytes } from "$/fileUrl/fetchPublicBytes.ts";
import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/**
 * Downloads a link pasted on the upload page and returns the one data file
 * it points at, or the list of data files to choose from. The link is not
 * stored. Callers pass `memberPath` when the person has chosen one file
 * from an archive this function already listed.
 */
export async function acquirePastedFile(input: {
  url: string;
  memberPath?: string;
  fetch: typeof fetch;
  assertPublicHost: (host: string) => Promise<void>;
  maxBytes?: number;
}): Promise<AcquiredPastedFile> {
  const resolved = resolvePastedFileUrl(input.url);
  if (resolved.kind === "refuse") {
    return { outcome: "error", reason: resolved.reason };
  }
  const maxBytes = input.maxBytes ?? FILE_URL_MAX_BYTES;
  if (resolved.kind === "ckan-package" || resolved.kind === "ckan-resource") {
    return await _acquireCkan(resolved, { ...input, maxBytes });
  }
  const downloaded = await _downloadWithDriveConfirm(resolved.url, {
    fetch: input.fetch,
    assertPublicHost: input.assertPublicHost,
    maxBytes,
  });
  if (!downloaded.ok) {
    return { outcome: "error", reason: downloaded.reason };
  }
  return classifyDownloadedBytes({
    bytes: downloaded.bytes,
    fileName: downloaded.fileName ?? resolved.fileName,
    mediaType: downloaded.mediaType,
    sourceLabel: resolved.sourceLabel,
    finalUrl: downloaded.finalUrl,
    memberPath: input.memberPath,
  });
}

async function _downloadWithDriveConfirm(
  url: string,
  input: {
    fetch: typeof fetch;
    assertPublicHost: (host: string) => Promise<void>;
    maxBytes: number;
  },
): Promise<Awaited<ReturnType<typeof fetchPublicBytes>>> {
  const first = await fetchPublicBytes({ ...input, url });
  if (!first.ok || !_isDriveConfirmPage(first)) {
    return first;
  }
  const confirmed = new URL(first.finalUrl);
  confirmed.searchParams.set("confirm", "t");
  return await fetchPublicBytes({ ...input, url: confirmed.href });
}

function _isDriveConfirmPage(download: PublicBytes): boolean {
  if (!download.mediaType.includes("html")) {
    return false;
  }
  const preview = new TextDecoder().decode(download.bytes.subarray(0, 8000));
  return preview.includes("uc-download-link") || preview.includes("download_warning");
}

async function _acquireCkan(
  resolved: Extract<ResolvedPastedFileUrl, { kind: "ckan-package" | "ckan-resource" }>,
  input: {
    fetch: typeof fetch;
    assertPublicHost: (host: string) => Promise<void>;
    maxBytes: number;
    memberPath?: string;
  },
): Promise<AcquiredPastedFile> {
  const packageUrl = `${resolved.baseUrl}/api/3/action/package_show?id=${encodeURIComponent(resolved.packageId)}`;
  const listed = await fetchPublicBytes({
    fetch: input.fetch,
    assertPublicHost: input.assertPublicHost,
    maxBytes: input.maxBytes,
    url: packageUrl,
  });
  if (!listed.ok) {
    return { outcome: "error", reason: listed.reason };
  }
  const resources = _matchingResources(listed.bytes, resolved);
  if (resources.length === 0) {
    return { outcome: "error", reason: "unsupported-type" };
  }
  if (resources.length > 1) {
    return {
      outcome: "choice",
      sourceLabel: resolved.sourceLabel,
      members: resources.map(ckanResourceChoice),
    };
  }
  const [only] = resources;
  if (!only) {
    return { outcome: "error", reason: "unsupported-type" };
  }
  return await acquirePastedFile({
    url: only.url,
    memberPath: input.memberPath,
    fetch: input.fetch,
    assertPublicHost: input.assertPublicHost,
    maxBytes: input.maxBytes,
  });
}

function _matchingResources(
  bytes: Uint8Array,
  resolved: Extract<ResolvedPastedFileUrl, { kind: "ckan-package" | "ckan-resource" }>,
): ReturnType<typeof ckanImportResources> {
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return [];
  }
  const resources = ckanImportResources(body);
  if (resolved.kind !== "ckan-resource") {
    return resources;
  }
  return resources.filter((resource) => resource.id === resolved.resourceId);
}
