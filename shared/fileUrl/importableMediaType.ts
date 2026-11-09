const MEDIA_TYPE_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

const ARCHIVE_EXTENSIONS = [".zip", ".gz", ".tgz"];

/**
 * The media type a CSV, Excel, or PDF file name imports as. Undefined when
 * the name is not one of those files.
 */
export function mediaTypeForFileName(fileName: string): string | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === undefined) {
    return undefined;
  }
  return MEDIA_TYPE_BY_EXTENSION[extension];
}

/** Whether a download should be opened as a zip, gzip, or tar.gz. */
export function isArchiveDownload(fileName: string, mediaType: string): boolean {
  const lowerName = fileName.toLowerCase();
  if (ARCHIVE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return true;
  }
  return mediaType.includes("zip") || mediaType.includes("gzip");
}

/**
 * A file name readArchive will open. A zip served as `download` with a zip
 * content type still has to carry the extension the reader checks.
 */
export function archiveFileName(fileName: string, mediaType: string): string {
  const lowerName = fileName.toLowerCase();
  if (mediaType.includes("gzip") && !lowerName.endsWith(".gz")) {
    return `${fileName}.gz`;
  }
  if (mediaType.includes("zip") && !lowerName.endsWith(".zip")) {
    return `${fileName}.zip`;
  }
  return fileName;
}
