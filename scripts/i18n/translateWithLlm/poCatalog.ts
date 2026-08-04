/**
 * Minimal PO catalog parsing, serialization, and scope matching for the
 * Lingui-generated `messages.po` catalogs under `src/i18n/locales/`.
 */

export type PoEntry = {
  /** Comment block + msgid header preceding the msgstr line. */
  header: string;
  msgid: string;
  /** Empty string when untranslated. */
  msgstr: string;
};

export type ParsedPo = {
  /** PO file preamble (the metadata block at the top). */
  preamble: string;
  entries: PoEntry[];
};

function _unescapePoString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function _escapePoString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

/** Collects the value out of `msgid "..."` / `msgstr "..."` (multiline). */
function _readMessageValue(
  lines: string[],
  startIdx: number,
): { value: string; consumed: number } {
  const first = lines[startIdx] ?? "";
  const match = first.match(/^(?:msgid|msgstr)\s+"(.*)"\s*$/);
  if (!match) {
    return { value: "", consumed: 1 };
  }
  const remainingLines = lines.slice(startIdx + 1);
  const firstNonContinuationIndex = remainingLines.findIndex((line) => {
    return !/^"(.*)"\s*$/.test(line);
  });
  const continuationCount =
    firstNonContinuationIndex === -1 ?
      remainingLines.length
    : firstNonContinuationIndex;
  const parts = [
    match[1] ?? "",
    ...remainingLines.slice(0, continuationCount).map((line) => {
      return /^"(.*)"\s*$/.exec(line)?.[1] ?? "";
    }),
  ];
  return {
    value: _unescapePoString(parts.join("")),
    consumed: continuationCount + 1,
  };
}

function _skipBlankLines(lines: string[], startIndex: number): number {
  const nonBlankOffset = lines.slice(startIndex).findIndex((line) => {
    return line !== "";
  });
  return nonBlankOffset === -1 ? lines.length : startIndex + nonBlankOffset;
}

/**
 * Minimal PO parser sufficient for Lingui-generated catalogs.
 *
 * @param text Raw text of the .po file.
 * @returns Parsed structure with `preamble` (metadata block kept as-is)
 *   and `entries` (each `header` retains the original comments + msgid
 *   lines so we can filter by `#: source/path` references).
 */
function _parsePo(text: string): ParsedPo {
  const lines = text.split("\n");
  const firstMessageIndex = lines.findIndex((line) => {
    return line.startsWith("msgid ");
  });
  const preambleStart = 0;
  let cursor = firstMessageIndex === -1 ? lines.length : firstMessageIndex;
  cursor += _readMessageValue(lines, cursor).consumed;
  const messageStringOffset = lines.slice(cursor).findIndex((line) => {
    return line.startsWith("msgstr ");
  });
  cursor =
    messageStringOffset === -1 ? lines.length : cursor + messageStringOffset;
  cursor += _readMessageValue(lines, cursor).consumed;
  // The preamble ends at the last header line. Blank lines that follow are
  // the separator before the first entry; we exclude them here so that
  // serializePo's `join("\n\n")` reintroduces exactly one. Including them
  // would yield a double blank line that Lingui's formatter strips on the
  // next `lingui extract`, producing a spurious diff.
  const preambleEnd = cursor;
  cursor = _skipBlankLines(lines, cursor);
  const preamble = lines.slice(preambleStart, preambleEnd).join("\n");

  const entries: PoEntry[] = [];
  let blockStart = cursor;
  while (cursor < lines.length) {
    if (lines[cursor]!.startsWith("msgid ")) {
      const headerLines = lines.slice(blockStart, cursor);
      const { value: msgid, consumed: midConsumed } = _readMessageValue(
        lines,
        cursor,
      );
      const headerWithMsgid = [
        ...headerLines,
        ...lines.slice(cursor, cursor + midConsumed),
      ].join("\n");
      cursor += midConsumed;
      const { value: msgstr, consumed: mstrConsumed } = _readMessageValue(
        lines,
        cursor,
      );
      cursor += mstrConsumed;
      entries.push({ header: headerWithMsgid, msgid, msgstr });
      cursor = _skipBlankLines(lines, cursor);
      blockStart = cursor;
    } else {
      cursor++;
    }
  }
  return { preamble, entries };
}

/**
 * Serialize a parsed PO structure back to text.
 */
function _serializePo(parsed: ParsedPo): string {
  const entryBlocks = parsed.entries.map((entry) => {
    const msgstrSerialized = `msgstr "${_escapePoString(entry.msgstr)}"`;
    return `${entry.header}\n${msgstrSerialized}`;
  });
  return `${[parsed.preamble, ...entryBlocks].join("\n\n")}\n`;
}

/**
 * Returns true if the entry's `#: ...` source-file reference comments
 * contain any of the given scope substrings. An empty `scopes` array
 * matches everything (no filtering).
 *
 * @param entry The PO entry whose header carries `#:` reference comments
 *   pointing at the source file(s) the msgid was extracted from.
 * @param scopes Substrings to match against those reference paths. Match
 *   is case-sensitive and substring-based, e.g. `WorkspaceSettingsPage`
 *   matches `src/views/WorkspaceSettingsPage/...`.
 */
function _entryMatchesScope(entry: PoEntry, scopes: string[]): boolean {
  if (scopes.length === 0) {
    return true;
  }
  const referenceLines = entry.header.split("\n").filter((line) => {
    return line.startsWith("#:");
  });
  if (referenceLines.length === 0) {
    return false;
  }
  const referencesText = referenceLines.join("\n");
  return scopes.some((scope) => {
    return referencesText.includes(scope);
  });
}

/** Parses, matches, and serializes Lingui PO catalogs. */
export const PoCatalog = {
  parse: _parsePo,
  serialize: _serializePo,
  entryMatchesScope: _entryMatchesScope,
};
