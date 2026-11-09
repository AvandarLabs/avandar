import { readArchive } from "$/fileUrl/readArchive/readArchive.ts";
import {
  archiveFileName,
  isArchiveDownload,
  mediaTypeForFileName,
} from "$/fileUrl/importableMediaType.ts";
import type {
  AcquiredPastedFile,
  FileUrlChoiceMember,
} from "$/fileUrl/AcquiredPastedFile.ts";
import type { ArchiveMember } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";

/**
 * Turns downloaded bytes into one importable file, a choice among the data
 * files in an archive, or a refusal. A nested archive is not opened.
 */
export function classifyDownloadedBytes(input: {
  bytes: Uint8Array;
  fileName: string | undefined;
  mediaType: string;
  sourceLabel: string;
  finalUrl: string;
  memberPath?: string;
}): AcquiredPastedFile {
  const fileName = input.fileName ?? "download";
  if (isArchiveDownload(fileName, input.mediaType)) {
    return _classifyArchive({ ...input, fileName });
  }
  return _classifyFile(input, fileName);
}

function _classifyFile(
  input: { bytes: Uint8Array; mediaType: string; sourceLabel: string; finalUrl: string },
  fileName: string,
): AcquiredPastedFile {
  if (_isLoginPage(input.mediaType, input.finalUrl, input.bytes)) {
    return { outcome: "error", reason: "not-public" };
  }
  const mediaType = mediaTypeForFileName(fileName) ?? _mediaTypeFromHeader(input.mediaType);
  if (mediaType === undefined) {
    return { outcome: "error", reason: "unsupported-type" };
  }
  return {
    outcome: "file",
    fileName: _withExtension(fileName, mediaType),
    mediaType,
    bytes: input.bytes,
    sourceLabel: input.sourceLabel,
  };
}

function _classifyArchive(
  input: {
    bytes: Uint8Array;
    fileName: string;
    mediaType: string;
    sourceLabel: string;
    memberPath?: string;
  },
): AcquiredPastedFile {
  const read = readArchive({
    bytes: input.bytes,
    fileName: archiveFileName(input.fileName, input.mediaType),
  });
  if (read.kind === "file") {
    return { outcome: "error", reason: "unsupported-type" };
  }
  const data = read.members
    .filter((member) => member.role === "data")
    .sort(_byPath);
  if (input.memberPath !== undefined) {
    return _chosenMember(data, input.memberPath, input.sourceLabel);
  }
  if (data.length === 1) {
    return _fileFromMember(data[0], input.sourceLabel);
  }
  if (data.length > 1) {
    return { outcome: "choice", sourceLabel: input.sourceLabel, members: data.map(_choiceFromMember) };
  }
  const nested = read.members.some((member) => member.role === "archive");
  return { outcome: "error", reason: nested ? "archive-nested-only" : "archive-empty" };
}

function _chosenMember(
  data: ArchiveMember[],
  memberPath: string,
  sourceLabel: string,
): AcquiredPastedFile {
  const chosen = data.find((member) => member.path === memberPath);
  if (!chosen) {
    return { outcome: "error", reason: "member-missing" };
  }
  return _fileFromMember(chosen, sourceLabel);
}

function _fileFromMember(
  member: ArchiveMember | undefined,
  sourceLabel: string,
): AcquiredPastedFile {
  if (!member) {
    return { outcome: "error", reason: "archive-empty" };
  }
  const fileName = member.path.split("/").pop() ?? member.path;
  return {
    outcome: "file",
    fileName,
    mediaType: mediaTypeForFileName(fileName) ?? "application/octet-stream",
    bytes: member.bytes,
    sourceLabel,
  };
}

function _choiceFromMember(member: ArchiveMember): FileUrlChoiceMember {
  const fileName = member.path.split("/").pop() ?? member.path;
  return {
    path: member.path,
    size: member.bytes.byteLength,
    mediaType: mediaTypeForFileName(fileName) ?? "application/octet-stream",
  };
}

function _byPath(left: ArchiveMember, right: ArchiveMember): number {
  if (left.path < right.path) {
    return -1;
  }
  if (left.path > right.path) {
    return 1;
  }
  return 0;
}

function _mediaTypeFromHeader(mediaType: string): string | undefined {
  if (mediaType.startsWith("text/csv")) {
    return "text/csv";
  }
  if (mediaType === "application/pdf") {
    return "application/pdf";
  }
  if (mediaType === "application/vnd.ms-excel") {
    return mediaType;
  }
  if (mediaType.includes("spreadsheetml")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return undefined;
}

function _withExtension(fileName: string, mediaType: string): string {
  if (mediaTypeForFileName(fileName) !== undefined) {
    return fileName;
  }
  if (mediaType === "text/csv") {
    return `${fileName}.csv`;
  }
  if (mediaType === "application/pdf") {
    return `${fileName}.pdf`;
  }
  if (mediaType.includes("spreadsheetml")) {
    return `${fileName}.xlsx`;
  }
  if (mediaType === "application/vnd.ms-excel") {
    return `${fileName}.xls`;
  }
  return fileName;
}

function _isLoginPage(mediaType: string, finalUrl: string, bytes: Uint8Array): boolean {
  if (!mediaType.includes("html")) {
    return false;
  }
  if (finalUrl.includes("accounts.google.com")) {
    return true;
  }
  const preview = new TextDecoder().decode(bytes.subarray(0, 2000));
  return preview.includes("accounts.google.com");
}
