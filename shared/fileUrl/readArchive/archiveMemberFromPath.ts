/**
 * One file taken out of a zip, gzip, or tar archive.
 *
 * `data` is a CSV, Excel workbook, or PDF. `archive` is another archive,
 * which is not opened. `other` is everything else, such as a README.
 */
export type ArchiveMember = {
  path: string;
  role: "data" | "archive" | "other";
  bytes: Uint8Array;
};

/** The result of looking at a download that might be an archive. */
export type ArchiveRead =
  | { kind: "archive"; members: ArchiveMember[] }
  | { kind: "file" };

const DATA_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf"] as const;

/**
 * Classifies one archive entry. AppleDouble files and directory entries are
 * omitted, because they are not files a person would choose to import.
 */
export function archiveMemberFromPath(
  path: string,
  bytes: Uint8Array,
): ArchiveMember | undefined {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.length === 0 || normalized.endsWith("/")) {
    return undefined;
  }
  if (_isAppleDouble(normalized)) {
    return undefined;
  }
  return {
    path: normalized,
    role: _role(normalized),
    bytes: new Uint8Array(bytes),
  };
}

function _isAppleDouble(path: string): boolean {
  if (path.startsWith("__MACOSX/")) {
    return true;
  }
  return path.split("/").some((segment) => {
    return segment.startsWith("._");
  });
}

function _role(path: string): ArchiveMember["role"] {
  const lower = path.toLowerCase();
  if (DATA_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return "data";
  }
  if (
    lower.endsWith(".zip") ||
    lower.endsWith(".gz") ||
    lower.endsWith(".tgz")
  ) {
    return "archive";
  }
  return "other";
}
