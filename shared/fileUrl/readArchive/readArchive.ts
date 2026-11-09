import { gunzipSync } from "fflate";
import { archiveMemberFromPath } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";
import { readTarMembers } from "$/fileUrl/readArchive/readTarMembers.ts";
import { readZipMembers } from "$/fileUrl/readArchive/readZipMembers.ts";
import type {
  ArchiveMember,
  ArchiveRead,
} from "$/fileUrl/readArchive/archiveMemberFromPath.ts";

/**
 * Opens a zip, gzip, or tar.gz download into the files it contains. A plain
 * file is returned as `file` so the caller imports those bytes unchanged.
 * An archive inside another archive is listed and not opened.
 */
export function readArchive(input: {
  bytes: Uint8Array;
  fileName: string;
}): ArchiveRead {
  const lowerName = input.fileName.toLowerCase();
  if (lowerName.endsWith(".zip") || _isZipMagic(input.bytes)) {
    return { kind: "archive", members: readZipMembers(input.bytes) };
  }
  if (
    lowerName.endsWith(".gz") ||
    lowerName.endsWith(".tgz") ||
    _isGzipMagic(input.bytes)
  ) {
    return _readGzip(input.bytes, input.fileName);
  }
  return { kind: "file" };
}

function _readGzip(bytes: Uint8Array, fileName: string): ArchiveRead {
  const inflated = gunzipSync(bytes);
  const innerName = fileName.replace(/\.tgz$/i, ".tar").replace(/\.gz$/i, "");
  if (innerName.toLowerCase().endsWith(".tar") || _looksLikeTar(inflated)) {
    return { kind: "archive", members: readTarMembers(inflated) };
  }
  return { kind: "archive", members: _oneMember(innerName, inflated) };
}

function _oneMember(path: string, bytes: Uint8Array): ArchiveMember[] {
  const member = archiveMemberFromPath(path, bytes);
  return member ? [member] : [];
}

function _looksLikeTar(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 262) {
    return false;
  }
  const magic = new TextDecoder().decode(bytes.subarray(257, 262));
  return magic === "ustar";
}

function _isZipMagic(bytes: Uint8Array): boolean {
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05)
  );
}

function _isGzipMagic(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1f && bytes[1] === 0x8b;
}
