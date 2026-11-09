import { mediaTypeForFileName } from "$/fileUrl/importableMediaType.ts";
import type { FileUrlChoiceMember } from "$/fileUrl/AcquiredPastedFile.ts";

const IMPORTABLE_FORMATS = new Set([
  "csv",
  "xls",
  "xlsx",
  "pdf",
  "zip",
  "gz",
  "gzip",
  "tgz",
]);

/** One CKAN resource the upload flow can download. */
export type CkanImportResource = {
  id: string;
  name: string;
  format: string;
  url: string;
  size: number;
};

/**
 * The importable resources in a CKAN `package_show` body. Text, JSON, and
 * other formats are left out, because the upload flow cannot sniff them.
 */
export function ckanImportResources(body: unknown): CkanImportResource[] {
  const resources = _resourceList(body);
  const importable: CkanImportResource[] = [];
  for (const resource of resources) {
    const parsed = _parseResource(resource);
    if (parsed) {
      importable.push(parsed);
    }
  }
  return importable;
}

/** A choice row for a CKAN resource. Choosing it downloads `url`. */
export function ckanResourceChoice(
  resource: CkanImportResource,
): FileUrlChoiceMember {
  return {
    path: resource.name,
    size: resource.size,
    mediaType: _mediaType(resource),
    url: resource.url,
  };
}

function _resourceList(body: unknown): unknown[] {
  if (body === null || typeof body !== "object") {
    return [];
  }
  const result = (body as { result?: { resources?: unknown } }).result;
  return Array.isArray(result?.resources) ? result.resources : [];
}

function _parseResource(value: unknown): CkanImportResource | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  const resource = value as Record<string, unknown>;
  const format = typeof resource.format === "string" ? resource.format : "";
  const url = typeof resource.url === "string" ? resource.url : "";
  const id = typeof resource.id === "string" ? resource.id : "";
  if (!IMPORTABLE_FORMATS.has(format.toLowerCase()) || url.length === 0) {
    return undefined;
  }
  const name = typeof resource.name === "string" && resource.name.length > 0
    ? resource.name
    : (url.split("/").pop() ?? url);
  const size = typeof resource.size === "number" ? resource.size : 0;
  return { id, name, format, url, size };
}

function _mediaType(resource: CkanImportResource): string {
  const fromName = mediaTypeForFileName(resource.url);
  if (fromName) {
    return fromName;
  }
  const format = resource.format.toLowerCase();
  if (format === "csv") {
    return "text/csv";
  }
  if (format === "pdf") {
    return "application/pdf";
  }
  if (format === "xls") {
    return "application/vnd.ms-excel";
  }
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
