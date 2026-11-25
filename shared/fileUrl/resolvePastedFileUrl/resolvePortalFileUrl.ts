import {
  fileNameFromPath,
  pathParts,
  sourceHost,
} from "$/fileUrl/resolvePastedFileUrl/fileUrlParts.ts";
import type { ResolvedPastedFileUrl } from "$/fileUrl/PastedFileUrl.ts";

/** A Socrata dataset id, the `xxxx-xxxx` segment on a dataset page. */
const SOCRATA_DATASET_ID = /^[a-z0-9]{4}-[a-z0-9]{4}$/i;

/**
 * Classifies a Socrata or CKAN page, and otherwise keeps the link as a
 * direct download. A portal page that is already a file is left alone.
 */
export function resolvePortalFileUrl(url: URL): ResolvedPastedFileUrl {
  return _resolveCkan(url) ?? _resolveSocrata(url) ?? _directDownload(url);
}

function _resolveCkan(url: URL): ResolvedPastedFileUrl | undefined {
  const parts = pathParts(url);
  const datasetIndex = parts.indexOf("dataset");
  const packageId = parts[datasetIndex + 1];
  if (
    datasetIndex < 0 ||
    packageId === undefined ||
    parts.includes("download")
  ) {
    return undefined;
  }
  const sourceLabel = sourceHost(url);
  const resourceIndex = parts.indexOf("resource");
  const resourceId = parts[resourceIndex + 1];
  if (resourceIndex >= 0 && resourceId !== undefined) {
    return {
      kind: "ckan-resource",
      baseUrl: url.origin,
      packageId: decodeURIComponent(packageId),
      resourceId: decodeURIComponent(resourceId),
      sourceLabel,
    };
  }
  if (parts.length !== datasetIndex + 2) {
    return undefined;
  }
  return {
    kind: "ckan-package",
    baseUrl: url.origin,
    packageId: decodeURIComponent(packageId),
    sourceLabel,
  };
}

function _resolveSocrata(url: URL): ResolvedPastedFileUrl | undefined {
  const parts = pathParts(url);
  const datasetId = parts[parts.length - 1];
  if (datasetId === undefined || !SOCRATA_DATASET_ID.test(datasetId)) {
    return undefined;
  }
  const slug = parts[parts.length - 2];
  const fileName =
    slug !== undefined && !SOCRATA_DATASET_ID.test(slug)
      ? `${decodeURIComponent(slug)}.csv`
      : `${datasetId}.csv`;
  return {
    kind: "download",
    url: `${url.origin}/resource/${datasetId.toLowerCase()}.csv`,
    fileName,
    sourceLabel: sourceHost(url),
  };
}

function _directDownload(url: URL): ResolvedPastedFileUrl {
  return {
    kind: "download",
    url: url.href,
    fileName: fileNameFromPath(url),
    sourceLabel: sourceHost(url),
  };
}
