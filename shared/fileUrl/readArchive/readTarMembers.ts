import { archiveMemberFromPath } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";
import type { ArchiveMember } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";

/**
 * Lists the regular files in a ustar archive. Directory entries and pax
 * headers are skipped. Names are the ustar prefix plus the header name.
 */
export function readTarMembers(bytes: Uint8Array): ArchiveMember[] {
  const members: ArchiveMember[] = [];
  let offset = 0;
  while (offset + 512 <= bytes.byteLength) {
    const header = bytes.subarray(offset, offset + 512);
    offset += 512;
    if (_isZeroBlock(header)) {
      break;
    }
    const size = _octal(header, 124, 12);
    const fileBytes = bytes.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;
    const member = _memberFromHeader(header, fileBytes);
    if (member) {
      members.push(member);
    }
  }
  return members;
}

function _memberFromHeader(
  header: Uint8Array,
  fileBytes: Uint8Array,
): ArchiveMember | undefined {
  const typeFlag = header[156] ?? 0;
  const isFile = typeFlag === 0 || typeFlag === "0".charCodeAt(0);
  if (!isFile) {
    return undefined;
  }
  const prefix = _text(header, 345, 155);
  const name = _text(header, 0, 100);
  const path = prefix.length > 0 ? `${prefix}/${name}` : name;
  return archiveMemberFromPath(path, fileBytes);
}

function _isZeroBlock(header: Uint8Array): boolean {
  return header.every((byte) => {
    return byte === 0;
  });
}

function _octal(bytes: Uint8Array, start: number, length: number): number {
  const text = _text(bytes, start, length).trim();
  if (text.length === 0) {
    return 0;
  }
  return Number.parseInt(text, 8);
}

function _text(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.subarray(start, start + length);
  const end = slice.indexOf(0);
  const text = end === -1 ? slice : slice.subarray(0, end);
  return new TextDecoder().decode(text);
}
