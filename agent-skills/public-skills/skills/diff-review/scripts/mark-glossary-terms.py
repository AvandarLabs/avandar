#!/usr/bin/env python3
"""Number a walkthrough's glossary and mark every use of its terms.

The glossary is the table under the heading that ends in "Glossary". Each row's
first cell holds the term, optionally after its number (`**G3**`) and before
other spellings to match, in parentheses:

    | **G3** Reconcile (reconciliation) | Meaning ... |

The script sorts the rows alphabetically, numbers them G1..Gn, removes every
existing `<sup>Gn</sup>` marker, then adds one after the first use of each term
in every paragraph, list item, and table cell. It skips headings, table header
rows, code spans, fenced blocks (mermaid included), link targets, HTML tags,
the Sources section, and each glossary row's own term. Regular inflections of a
term's last word (plural, possessive, -ed, -ing) match without being listed.
Where two terms overlap, the longer one wins, so "SQL expression key" never
also marks "expression key" inside it.

Usage:
    mark-glossary-terms.py <walkthrough.md> [--check]

Writes the file in place and prints a summary. With --check it writes nothing
and exits 1 when the file is not already numbered and marked the way the
script would leave it. Exit 2 on a usage or parse error.
"""

import re
import sys

MARKER_RE = re.compile(r"<sup>G\d+</sup>")
HEADING_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$")
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")
LIST_ITEM_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
TABLE_ROW_RE = re.compile(r"^\s*\|")
TABLE_SEP_RE = re.compile(r"^\s*\|?(\s*:?-+:?\s*\|)+\s*(:?-+:?\s*)?\|?\s*$")
WRAPPER_RE = re.compile(r"^\s*</?small>\s*$")
SKIP_SECTION_RE = re.compile(r"\b(sources|references|bibliography)\s*$", re.I)
GLOSSARY_HEADING_RE = re.compile(r"\bglossary\s*$", re.I)
PROTECTED_RES = [
    re.compile(r"(`+)(?!`).*?(?<!`)\1(?!`)", re.S),  # code spans
    re.compile(r"<!--.*?-->", re.S),  # HTML comments
    re.compile(r"<[A-Za-z/][^>\n]*>"),  # HTML tags
    re.compile(r"!\[[^\]]*\]\([^)]*\)"),  # images, alt text included
    re.compile(r"\]\([^)]*\)"),  # link targets
    re.compile(r"https?://\S+"),  # bare URLs
]


class Term:
    def __init__(self, term, forms, meaning):
        self.term = term
        self.forms = forms
        self.meaning = meaning
        self.number = 0
        self.uses = 0
        alternates = [_phrase_pattern(term, inflect=True)]
        alternates += [_phrase_pattern(form, inflect=False) for form in forms]
        self.regex = re.compile(
            r"(?<![\w])(?:" + "|".join(alternates) + r")(?![\w])", re.I
        )

    def cell(self):
        forms = f" ({', '.join(self.forms)})" if self.forms else ""
        return f"**G{self.number}** {self.term}{forms}"


def _inflections(word):
    escaped = re.escape(word)
    forms = {escaped, escaped + "s", escaped + "es", escaped + "'s", escaped + "’s"}
    lower = word.lower()
    if lower.endswith("e"):
        forms |= {escaped + "d", re.escape(word[:-1]) + "ing"}
    elif lower.endswith("y") and len(word) > 1 and lower[-2] not in "aeiou":
        stem = re.escape(word[:-1])
        forms |= {stem + "ies", stem + "ied"}
    else:
        forms |= {escaped + "ed", escaped + "ing"}
    return "(?:" + "|".join(sorted(forms, key=len, reverse=True)) + ")"


def _phrase_pattern(phrase, inflect):
    words = phrase.split()
    parts = [re.escape(word) for word in words[:-1]]
    parts.append(_inflections(words[-1]) if inflect else re.escape(words[-1]))
    return r"\s+".join(parts)


def _cell_spans(line):
    """Return (start, end) of each cell's text, split on unescaped pipes."""
    pipes = [i for i, char in enumerate(line) if char == "|" and (i == 0 or line[i - 1] != "\\")]
    stripped = line.strip()
    starts_with_pipe = stripped.startswith("|")
    ends_with_pipe = stripped.endswith("|") and not stripped.endswith("\\|")
    bounds = [-1] + pipes + [len(line)]
    spans = [(bounds[i] + 1, bounds[i + 1]) for i in range(len(bounds) - 1)]
    if starts_with_pipe:
        spans = spans[1:]
    if ends_with_pipe:
        spans = spans[:-1]
    return spans


def _strip_markers(text):
    protected = _protected_spans(MARKER_RE.sub(lambda m: "\0" * len(m.group(0)), text))
    out, last = [], 0
    for match in MARKER_RE.finditer(text):
        start, end = match.span()
        if any(p_start < end and start < p_end for p_start, p_end in protected):
            continue
        out.append(text[last:start])
        last = end
    out.append(text[last:])
    return "".join(out)


def _protected_spans(text):
    spans = []
    for regex in PROTECTED_RES:
        spans.extend(match.span() for match in regex.finditer(text))
    return spans


def _mark(text, terms, skip_number=None):
    text = _strip_markers(text)
    protected = _protected_spans(text)
    occupied, inserts = [], []
    for term in terms:
        first = None
        for match in term.regex.finditer(text):
            start, end = match.span()
            if any(p_start < end and start < p_end for p_start, p_end in protected + occupied):
                continue
            occupied.append((start, end))
            if first is None:
                first = end
        if first is not None and term.number != skip_number:
            inserts.append((first, f"<sup>G{term.number}</sup>", term))
    for position, marker, term in sorted(inserts, key=lambda item: item[0], reverse=True):
        text = text[:position] + marker + text[position:]
        term.uses += 1
    return text


def _parse_term_cell(cell):
    cell = re.sub(r"\*\*G\d+\*\*", "", cell).replace("**", "").strip()
    cell = re.sub(r"^G\d+\s+", "", cell)
    match = re.fullmatch(r"(?P<term>[^()]+?)\s*(?:\((?P<forms>[^)]*)\))?", cell)
    if not match or not match.group("term").strip():
        return None
    forms = [form.strip() for form in (match.group("forms") or "").split(",") if form.strip()]
    return match.group("term").strip(), forms


def _find_glossary(lines):
    """Return (heading index, first entry row index, end index) or None."""
    heading = None
    for i, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if match and GLOSSARY_HEADING_RE.search(match.group(2)):
            heading = i
    if heading is None:
        return None
    end = next(
        (i for i in range(heading + 1, len(lines)) if HEADING_RE.match(lines[i])), len(lines)
    )
    rows = [i for i in range(heading + 1, end) if TABLE_ROW_RE.match(lines[i])]
    if len(rows) < 2 or not TABLE_SEP_RE.match(lines[rows[1]]):
        return None
    first_entry = rows[1] + 1
    last_entry = first_entry
    while last_entry < end and TABLE_ROW_RE.match(lines[last_entry]):
        last_entry += 1
    return heading, first_entry, last_entry


def _renumber_glossary(lines, found):
    heading, first, last = found
    terms, errors = [], []
    for i in range(first, last):
        spans = _cell_spans(lines[i])
        if len(spans) != 2:
            errors.append(f"line {i + 1}: a glossary row needs exactly 2 cells")
            continue
        parsed = _parse_term_cell(lines[i][spans[0][0]:spans[0][1]])
        if parsed is None:
            errors.append(f"line {i + 1}: empty glossary term")
            continue
        terms.append(Term(parsed[0], parsed[1], lines[i][spans[1][0]:spans[1][1]].strip()))
    seen = {}
    for term in terms:
        key = term.term.casefold()
        if key in seen:
            errors.append(f"duplicate glossary term: {term.term}")
        seen[key] = term
    terms.sort(key=lambda term: term.term.casefold())
    for number, term in enumerate(terms, start=1):
        term.number = number
    lines[first:last] = [f"| {term.cell()} | {term.meaning} |" for term in terms]
    return terms, errors


def mark_document(source):
    lines = source.split("\n")
    found = _find_glossary(lines)
    if found is None:
        raise ValueError("no glossary table found under a heading ending in 'Glossary'")
    terms, errors = _renumber_glossary(lines, found)
    glossary_heading = found[0]
    by_length = sorted(terms, key=lambda term: len(term.term), reverse=True)
    by_number = {term.number: term for term in terms}

    wrapped = any(WRAPPER_RE.match(line) for line in lines[glossary_heading:found[2] + 2])
    warnings = [] if wrapped else ["the glossary table is not wrapped in <small> ... </small>"]

    out = list(lines)
    fence, skip_section, in_glossary, block, table_row = None, False, False, [], 0
    outside_uses = {term.number: 0 for term in terms}

    def flush():
        if block:
            before = {term.number: term.uses for term in terms}
            joined = _mark("\n".join(out[i] for i in block), by_length)
            for offset, text in enumerate(joined.split("\n")):
                out[block[offset]] = text
            if not in_glossary:
                for term in terms:
                    outside_uses[term.number] += term.uses - before[term.number]
            block.clear()

    for i, line in enumerate(lines):
        if fence:
            if line.strip().startswith(fence) and not line.strip().strip(fence[0]):
                fence = None
            continue
        fence_match = FENCE_RE.match(line)
        if fence_match:
            flush()
            fence = fence_match.group(1)
            continue
        heading = HEADING_RE.match(line)
        if heading:
            flush()
            skip_section = bool(SKIP_SECTION_RE.search(heading.group(2)))
            in_glossary = i == glossary_heading
            out[i] = _strip_markers(line)
            continue
        if not TABLE_ROW_RE.match(line):
            table_row = 0
        if skip_section:
            continue
        if not line.strip() or WRAPPER_RE.match(line):
            flush()
            continue
        if TABLE_ROW_RE.match(line):
            flush()
            table_row += 1
            if table_row == 1 or TABLE_SEP_RE.match(line):
                out[i] = _strip_markers(line)
                continue
            spans = _cell_spans(line)
            own = None
            if in_glossary and len(spans) == 2:
                own = _parse_term_cell(line[spans[0][0]:spans[0][1]])
                own = next((t.number for t in terms if own and t.term == own[0]), None)
            pieces, last = [], 0
            for index, (start, end) in enumerate(spans):
                pieces.append(line[last:start])
                cell = line[start:end]
                if in_glossary and own is not None and index == 0:
                    pieces.append(_strip_markers(cell))
                else:
                    before = {term.number: term.uses for term in terms}
                    pieces.append(_mark(cell, by_length, skip_number=own))
                    if not in_glossary:
                        for term in terms:
                            outside_uses[term.number] += term.uses - before[term.number]
                last = end
            pieces.append(line[last:])
            out[i] = "".join(pieces)
            continue
        if LIST_ITEM_RE.match(line):
            flush()
        block.append(i)
    flush()

    unused = [f"G{n} {by_number[n].term}" for n, count in outside_uses.items() if count == 0]
    if unused:
        warnings.append("terms never used outside the glossary: " + ", ".join(unused))
    markers = sum(outside_uses.values())
    summary = f"glossary: {len(terms)} entries, G1-G{len(terms)} alphabetical; {markers} markers outside it"
    return "\n".join(out), summary, warnings, errors


def main(argv):
    args = [arg for arg in argv[1:] if arg != "--check"]
    check = "--check" in argv[1:]
    if len(args) != 1:
        print(__doc__.strip().split("Usage:")[1].strip(), file=sys.stderr)
        return 2
    path = args[0]
    try:
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        marked, summary, warnings, errors = mark_document(source)
    except (OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        return 2
    print(summary)
    for warning in warnings:
        print(f"warning: {warning}")
    if check:
        if marked != source:
            print("not marked: run without --check to number the glossary and mark its terms")
            return 1
        print("OK")
        return 0
    if marked != source:
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(marked)
        print(f"wrote {path}")
    else:
        print("unchanged")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
