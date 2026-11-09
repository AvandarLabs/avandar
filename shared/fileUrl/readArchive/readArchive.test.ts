import { gzipSync, strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { readArchive } from "$/fileUrl/readArchive/readArchive.ts";

function _text(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/** A ustar archive of regular files. Names must be under 100 bytes. */
function _tar(files: Record<string, Uint8Array>): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const [name, bytes] of Object.entries(files)) {
    const header = new Uint8Array(512);
    const nameBytes = strToU8(name);
    header.set(nameBytes, 0);
    const sizeOctal = bytes.byteLength.toString(8).padStart(11, "0");
    header.set(strToU8(sizeOctal), 124);
    header[156] = "0".charCodeAt(0);
    header.set(strToU8("ustar"), 257);
    let checksum = 32 * 8;
    for (const byte of header) {
      checksum += byte;
    }
    header.set(strToU8(checksum.toString(8).padStart(6, "0")), 148);
    header[154] = 0;
    header[155] = 0x20;
    chunks.push(header, bytes);
    const remainder = bytes.byteLength % 512;
    if (remainder !== 0) {
      chunks.push(new Uint8Array(512 - remainder));
    }
  }
  chunks.push(new Uint8Array(1024));
  const total = chunks.reduce((sum, chunk) => {
    return sum + chunk.byteLength;
  }, 0);
  const archive = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    archive.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return archive;
}

describe("readArchive", () => {
  it("lists a zip's files and marks only CSV, Excel, and PDF as data", () => {
    const zipped = zipSync({
      "geo/vaccines.csv": _text("a,b\n1,2\n"),
      "README.md": _text("notes"),
      "tables/old.xlsx": _text("xlsx-bytes"),
      "__MACOSX/._vaccines.csv": _text("junk"),
    });

    const read = readArchive({ bytes: zipped, fileName: "drop.zip" });

    expect(read.kind).toBe("archive");
    if (read.kind !== "archive") {
      return;
    }
    expect(
      read.members.map((member) => {
        return member.path;
      }),
    ).toEqual(["geo/vaccines.csv", "README.md", "tables/old.xlsx"]);
    expect(
      read.members.map((member) => {
        return member.role;
      }),
    ).toEqual(["data", "other", "data"]);
  });

  it("marks a zip stored inside a zip as an archive and does not open it", () => {
    const inner = zipSync({ "vaccines.csv": _text("a\n1\n") });
    const outer = zipSync({ "nested.zip": inner, "notes.txt": _text("hi") });

    const read = readArchive({ bytes: outer, fileName: "outer.zip" });

    expect(read.kind).toBe("archive");
    if (read.kind !== "archive") {
      return;
    }
    const nested = read.members.find((member) => {
      return member.path === "nested.zip";
    });
    expect(nested?.role).toBe("archive");
    expect(nested?.bytes).toEqual(inner);
  });

  it("reads a gzip of one CSV under the name with .gz removed", () => {
    const csv = _text("a,b\n1,2\n");
    const gzipped = gzipSync(csv);

    const read = readArchive({
      bytes: gzipped,
      fileName: "vaccines.csv.gz",
    });
    expect(read.kind).toBe("archive");
    if (read.kind !== "archive") {
      return;
    }
    expect(read.members[0]?.path).toBe("vaccines.csv");
    expect(read.members[0]?.role).toBe("data");
    expect(Array.from(read.members[0]?.bytes ?? [])).toEqual(Array.from(csv));
  });

  it("lists the files inside a tar.gz", () => {
    const first = _text("a\n1\n");
    const second = _text("b\n2\n");
    const gzipped = gzipSync(_tar({ "a.csv": first, "notes/b.pdf": second }));

    const read = readArchive({ bytes: gzipped, fileName: "bundle.tar.gz" });

    expect(read.kind).toBe("archive");
    if (read.kind !== "archive") {
      return;
    }
    expect(
      read.members.map((member) => {
        return {
          path: member.path,
          role: member.role,
          bytes: Array.from(member.bytes),
        };
      }),
    ).toEqual([
      { path: "a.csv", role: "data", bytes: Array.from(first) },
      { path: "notes/b.pdf", role: "data", bytes: Array.from(second) },
    ]);
  });

  it("leaves a plain CSV alone", () => {
    const csv = _text("a,b\n1,2\n");

    expect(readArchive({ bytes: csv, fileName: "vaccines.csv" })).toEqual({
      kind: "file",
    });
  });
});
