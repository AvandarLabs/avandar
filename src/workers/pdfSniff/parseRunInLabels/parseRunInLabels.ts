import type { TextLine } from "../pdfSniff.types";

export type RunInBlock = {
  /** The leading number, or null for an unnumbered section heading. */
  number: number | null;
  heading: string;
  /** Run-in label to its paragraph, in document order. */
  fields: Record<string, string>;
};

/** `1. Surveillance, early detection and case management` */
const NUMBERED_HEADING = /^(\d{1,2})[.)]\s+(.{3,})$/u;

/**
 * A run-in label: one to three capitalised words followed by a colon at the
 * start of a line.
 *
 * Anchored to the line start and capped at three words on purpose. An
 * unanchored colon match turns "arrive at 09:00 daily" into a field called
 * "arrive at 09" and swallows the rest of the paragraph.
 */
const RUN_IN_LABEL = /^([A-Z][A-Za-z]{2,}(?:\s+[A-Za-z]+){0,2}):\s*(.*)$/u;

function _isHeadingLine(line: TextLine): boolean {
  if (NUMBERED_HEADING.test(line.text)) {
    return true;
  }
  // An all-caps line with no colon is a section heading in this house style.
  const isAllCaps = line.text === line.text.toUpperCase();
  return isAllCaps && line.text.length > 2 && !line.text.includes(":");
}

/**
 * Reads numbered headings with run-in labelled paragraphs into records.
 *
 * This layout is a table wearing a magazine layout: six pillars by four
 * fields, laid out as prose across two columns. Recovering it is the
 * cheapest real structure in a situation report, and because the style is
 * shared across OCHA, WHO and UNHCR reporting, the rule pays off well beyond
 * one document.
 */
export function parseRunInLabels(
  lines: readonly TextLine[],
): readonly RunInBlock[] {
  const blocks: RunInBlock[] = [];
  let current: RunInBlock | null = null;
  let currentField: string | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (text.length === 0) {
      continue;
    }

    if (_isHeadingLine(line)) {
      if (current) {
        blocks.push(current);
      }
      const numbered = NUMBERED_HEADING.exec(text);
      current = {
        number: numbered ? Number(numbered[1]) : null,
        heading: numbered ? numbered[2]!.trim() : text,
        fields: {},
      };
      currentField = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const labelled = RUN_IN_LABEL.exec(text);
    if (labelled) {
      currentField = labelled[1]!;
      current.fields[currentField] = labelled[2]!.trim();
      continue;
    }

    // A continuation of the field we are inside. Without this, every
    // wrapped line would be discarded and fields would end mid-sentence.
    if (currentField) {
      const existing = current.fields[currentField] ?? "";
      current.fields[currentField] = `${existing} ${text}`.trim();
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks.filter((block) => {
    return Object.keys(block.fields).length > 0;
  });
}
