import { PoCatalog } from "../translateWithLlm/poCatalog";
import type { PoEntry } from "../translateWithLlm/poCatalog";

/** The two sides of a conflicted file, each a complete PO document. */
export type CatalogSides = {
  /** Our side of the merge (`git show :2:<path>`, or the `HEAD` hunks). */
  ours: string;
  /** Their side of the merge (`git show :3:<path>`, or the incoming hunks). */
  theirs: string;
};

/** Outcome of merging one conflicted catalog. */
export type MergeCatalogsResult = {
  /** Merged PO text, parseable but not yet in Lingui's canonical format. */
  text: string;
  /** msgids present only on their side, added by this merge. */
  addedFromTheirs: string[];
  /**
   * msgids both sides translated differently. Our translation wins; these are
   * reported so a human can look, because an automatic pick is a guess.
   */
  divergentMsgids: string[];
};

const OURS_MARKER = "<<<<<<<";
const BASE_MARKER = "|||||||";
const SPLIT_MARKER = "=======";
const THEIRS_MARKER = ">>>>>>>";

function _splitConflictMarkers(text: string): CatalogSides | undefined {
  const lines = text.split("\n");
  const hasConflict = lines.some((line) => {
    return line.startsWith(OURS_MARKER);
  });
  if (!hasConflict) {
    return undefined;
  }

  const ours: string[] = [];
  const theirs: string[] = [];
  // "both" outside a conflict, then "ours" / "base" / "theirs" inside one.
  let side: "both" | "ours" | "base" | "theirs" = "both";

  lines.forEach((line) => {
    if (line.startsWith(OURS_MARKER)) {
      side = "ours";
    } else if (line.startsWith(BASE_MARKER) && side !== "both") {
      side = "base";
    } else if (line.startsWith(SPLIT_MARKER) && side !== "both") {
      side = "theirs";
    } else if (line.startsWith(THEIRS_MARKER) && side !== "both") {
      side = "both";
    } else if (side === "both") {
      ours.push(line);
      theirs.push(line);
    } else if (side === "ours") {
      ours.push(line);
    } else if (side === "theirs") {
      theirs.push(line);
    }
  });

  return { ours: ours.join("\n"), theirs: theirs.join("\n") };
}

function _mergeCatalogs({
  ours,
  theirs,
}: Readonly<CatalogSides>): MergeCatalogsResult {
  const parsedOurs = PoCatalog.parse(ours);
  const parsedTheirs = PoCatalog.parse(theirs);

  const theirEntryByMsgid = new Map<string, PoEntry>(
    parsedTheirs.entries.map((entry) => {
      return [entry.msgid, entry];
    }),
  );
  const ourMsgids = new Set(
    parsedOurs.entries.map((entry) => {
      return entry.msgid;
    }),
  );

  const divergentMsgids: string[] = [];
  const mergedOurEntries = parsedOurs.entries.map((entry) => {
    const theirEntry = theirEntryByMsgid.get(entry.msgid);
    if (theirEntry === undefined || theirEntry.msgstr === entry.msgstr) {
      return entry;
    }
    if (entry.msgstr === "") {
      return { ...entry, msgstr: theirEntry.msgstr };
    }
    if (theirEntry.msgstr !== "") {
      divergentMsgids.push(entry.msgid);
    }
    return entry;
  });

  const theirsOnlyEntries = parsedTheirs.entries.filter((entry) => {
    return !ourMsgids.has(entry.msgid);
  });

  // Order and source references are not preserved on purpose. `lingui extract`
  // runs straight after this and rewrites every catalog from the merged source
  // tree in its canonical order and format, so the only thing this file has to
  // carry across is the msgstr for each msgid. Trying to reproduce Lingui's
  // ordering here would be guesswork that extract immediately overwrites.
  return {
    text: PoCatalog.serialize({
      preamble: parsedOurs.preamble,
      entries: [...mergedOurEntries, ...theirsOnlyEntries],
    }),
    addedFromTheirs: theirsOnlyEntries.map((entry) => {
      return entry.msgid;
    }),
    divergentMsgids,
  };
}

/** Deterministic conflict resolution for Lingui PO catalogs. */
export const CatalogConflictMerge = {
  /**
   * Merges two sides of a conflicted `messages.po` into one catalog.
   *
   * The msgid set becomes the union of both sides, because a merge conflict in
   * these files is almost always two branches adding different strings to a
   * file Lingui keeps sorted. For a msgid both sides carry, a non-empty msgstr
   * beats an empty one; when both are non-empty and differ, ours wins and the
   * msgid is reported in `divergentMsgids`.
   */
  mergeCatalogs: _mergeCatalogs,

  /**
   * Reconstructs both complete sides of a file that still has conflict
   * markers in it, for when the git index no longer holds the merge stages
   * (a conflicted file left behind by a stash pop, for example). Returns
   * `undefined` when the text carries no markers. A diff3 base section is
   * dropped: it belongs to neither side.
   */
  splitConflictMarkers: _splitConflictMarkers,
};
