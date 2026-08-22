import { describe, expect, it } from "vitest";
import { PoCatalog } from "../translateWithLlm/poCatalog";
import { CatalogConflictMerge } from "./catalogConflictMerge";

const PREAMBLE = [
  'msgid ""',
  'msgstr ""',
  '"MIME-Version: 1.0\\n"',
  '"Language: es\\n"',
].join("\n");

function buildPo(
  entries: ReadonlyArray<{ ref: string; msgid: string; msgstr: string }>,
): string {
  const blocks = entries.map((entry) => {
    return `#: ${entry.ref}\nmsgid "${entry.msgid}"\nmsgstr "${entry.msgstr}"`;
  });
  return `${[PREAMBLE, ...blocks].join("\n\n")}\n`;
}

function msgstrByMsgid(text: string): Record<string, string> {
  return Object.fromEntries(
    PoCatalog.parse(text).entries.map((entry) => {
      return [entry.msgid, entry.msgstr];
    }),
  );
}

describe("mergeCatalogs", () => {
  it("keeps entries that only one side added", () => {
    const ours = buildPo([
      { ref: "src/a.tsx", msgid: "Shared", msgstr: "Compartido" },
      { ref: "src/gis.tsx", msgid: "Outline width", msgstr: "" },
    ]);
    const theirs = buildPo([
      { ref: "src/a.tsx", msgid: "Shared", msgstr: "Compartido" },
      { ref: "src/chat.tsx", msgid: "Try again", msgstr: "Prueba de nuevo" },
    ]);

    const result = CatalogConflictMerge.mergeCatalogs({ ours, theirs });

    expect(msgstrByMsgid(result.text)).toEqual({
      Shared: "Compartido",
      "Outline width": "",
      "Try again": "Prueba de nuevo",
    });
    expect(result.addedFromTheirs).toEqual(["Try again"]);
  });

  it("fills an empty msgstr from the other side", () => {
    const ours = buildPo([{ ref: "src/a.tsx", msgid: "Save", msgstr: "" }]);
    const theirs = buildPo([
      { ref: "src/a.tsx", msgid: "Save", msgstr: "Guardar" },
    ]);

    const result = CatalogConflictMerge.mergeCatalogs({ ours, theirs });

    expect(msgstrByMsgid(result.text)["Save"]).toBe("Guardar");
    expect(result.divergentMsgids).toEqual([]);
  });

  it("prefers our translation and reports a genuine divergence", () => {
    const ours = buildPo([
      { ref: "src/a.tsx", msgid: "Save", msgstr: "Guardar" },
    ]);
    const theirs = buildPo([
      { ref: "src/a.tsx", msgid: "Save", msgstr: "Almacenar" },
    ]);

    const result = CatalogConflictMerge.mergeCatalogs({ ours, theirs });

    expect(msgstrByMsgid(result.text)["Save"]).toBe("Guardar");
    expect(result.divergentMsgids).toEqual(["Save"]);
  });

  it("produces output that round-trips through the PO parser", () => {
    const ours = buildPo([
      { ref: "src/a.tsx", msgid: "Rows: {count}", msgstr: "Filas: {count}" },
    ]);
    const theirs = buildPo([
      { ref: "src/b.tsx", msgid: 'He said \\"hi\\"', msgstr: "" },
    ]);

    const result = CatalogConflictMerge.mergeCatalogs({ ours, theirs });
    const reparsed = PoCatalog.parse(result.text);

    expect(reparsed.entries).toHaveLength(2);
    expect(reparsed.preamble).toBe(PREAMBLE);
  });
});

describe("splitConflictMarkers", () => {
  it("reconstructs both sides of a conflicted file", () => {
    const conflicted = [
      "shared line",
      "<<<<<<< HEAD",
      "ours only",
      "=======",
      "theirs only",
      ">>>>>>> develop",
      "trailing line",
      "",
    ].join("\n");

    const sides = CatalogConflictMerge.splitConflictMarkers(conflicted);

    expect(sides).toEqual({
      ours: "shared line\nours only\ntrailing line\n",
      theirs: "shared line\ntheirs only\ntrailing line\n",
    });
  });

  it("returns undefined when the text has no conflict markers", () => {
    expect(CatalogConflictMerge.splitConflictMarkers("a\nb\n")).toBeUndefined();
  });

  it("handles a diff3-style conflict by dropping the base section", () => {
    const conflicted = [
      "<<<<<<< HEAD",
      "ours",
      "||||||| base",
      "original",
      "=======",
      "theirs",
      ">>>>>>> develop",
      "",
    ].join("\n");

    expect(CatalogConflictMerge.splitConflictMarkers(conflicted)).toEqual({
      ours: "ours\n",
      theirs: "theirs\n",
    });
  });
});
