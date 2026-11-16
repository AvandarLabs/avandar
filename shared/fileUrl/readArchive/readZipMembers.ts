import { unzipSync } from "fflate";
import { archiveMemberFromPath } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";
import type { ArchiveMember } from "$/fileUrl/readArchive/archiveMemberFromPath.ts";

/** Lists the files in a zip. A zip stored inside it is left sealed. */
export function readZipMembers(bytes: Uint8Array): ArchiveMember[] {
  const entries = unzipSync(bytes);
  const members: ArchiveMember[] = [];
  for (const [path, entryBytes] of Object.entries(entries)) {
    const member = archiveMemberFromPath(path, entryBytes);
    if (member) {
      members.push(member);
    }
  }
  return members;
}
