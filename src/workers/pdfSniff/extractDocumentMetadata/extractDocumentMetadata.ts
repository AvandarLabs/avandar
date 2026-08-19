import { groupLines } from "../groupLines/groupLines";
import type { DocumentMetadata, PageGeometry, TextItem } from "../pdfSniff.types";

/** Only text in the top fraction of page one is considered title material. */
const TITLE_BAND = 0.75;

/** A title line must be at least this multiple of the body text's size. */
const TITLE_SIZE_RATIO = 1.4;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_NAMES = Object.keys(MONTHS).join("|");
const DAY_FIRST = new RegExp(
  String.raw`\b(\d{1,2})\s+(${MONTH_NAMES})\s+(\d{4})\b`,
  "iu",
);
const MONTH_FIRST = new RegExp(
  String.raw`\b(${MONTH_NAMES})\s+(\d{1,2}),?\s+(\d{4})\b`,
  "iu",
);
const REPORT_NUMBER =
  /\b(?:report|update|sitrep)\s*(?:no\.?|number|#)\s*(\d+)\b/iu;

/** `D:20250703121904+02'00'` */
const PDF_DATE = /^D:(\d{4})(\d{2})(\d{2})/u;

function _iso(year: number, month: number, day: number): string {
  const pad = (n: number): string => {
    return String(n).padStart(2, "0");
  };
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * An info-dictionary title that looks like a file name is worse than nothing:
 * it is confidently wrong, and it would end up stamped on every observation
 * row as the document's identity.
 */
function _isFileName(value: string): boolean {
  return /\.(pdf|indd|docx?|ai|psd)$/iu.test(value.trim());
}

function _lineHeight(items: readonly TextItem[]): number {
  return Math.max(
    ...items.map((item) => {
      return item.height;
    }),
  );
}

/**
 * Reads a title out of page one's typography.
 *
 * The threshold is set from the body text, meaning the text *below* the title
 * band, rather than from the median of the whole page. A cover page whose only
 * large text is the title would otherwise set its own threshold above itself
 * and find nothing: the median of a one-item page is that item. When there is
 * no body text to compare against, the largest lines in the band are the
 * title by definition.
 */
function _titleFromPage(page: PageGeometry): string | null {
  const bandFloor = page.height * TITLE_BAND;
  const bandLines = groupLines(page.textItems).filter((line) => {
    return line.y >= bandFloor;
  });
  if (bandLines.length === 0) {
    return null;
  }

  const bodySizes = page.textItems
    .filter((item) => {
      return item.y < bandFloor;
    })
    .map((item) => {
      return item.height;
    })
    .sort((a, b) => {
      return a - b;
    });

  const bandHeights = bandLines.map((line) => {
    return _lineHeight(line.items);
  });
  const bodyMedian = bodySizes[Math.floor(bodySizes.length / 2)];
  const threshold =
    bodyMedian === undefined ?
      Math.max(...bandHeights)
    : bodyMedian * TITLE_SIZE_RATIO;

  const titleLines = bandLines.filter((line) => {
    return _lineHeight(line.items) >= threshold;
  });

  if (titleLines.length === 0) {
    return null;
  }

  // Consecutive large lines at the top are one title split across lines, as
  // in "SUDAN" over "Cholera Operational Update".
  return titleLines
    .slice(0, 3)
    .map((line) => {
      return line.text;
    })
    .join(" ")
    .trim();
}

function _dateFromText(text: string): string | null {
  const dayFirst = DAY_FIRST.exec(text);
  if (dayFirst) {
    return _iso(
      Number(dayFirst[3]),
      MONTHS[dayFirst[2]!.toLowerCase()]!,
      Number(dayFirst[1]),
    );
  }
  const monthFirst = MONTH_FIRST.exec(text);
  if (monthFirst) {
    return _iso(
      Number(monthFirst[3]),
      MONTHS[monthFirst[1]!.toLowerCase()]!,
      Number(monthFirst[2]),
    );
  }
  return null;
}

/**
 * Reads a document's identity from its info dictionary, falling back to the
 * typography of page one.
 *
 * Returns nulls rather than guesses. In observations mode these values are
 * stamped onto every row as the join key across reports, so a wrong title
 * silently merges two different documents into one series.
 */
export function extractDocumentMetadata(params: {
  page: PageGeometry;
  info: Readonly<Record<string, unknown>>;
}): DocumentMetadata {
  const infoTitle =
    typeof params.info.Title === "string" ? params.info.Title.trim() : "";
  const title =
    infoTitle.length > 0 && !_isFileName(infoTitle) ?
      infoTitle
    : _titleFromPage(params.page);

  const author =
    typeof params.info.Author === "string" ? params.info.Author.trim() : "";

  const pageText = groupLines(params.page.textItems)
    .map((line) => {
      return line.text;
    })
    .join(" ");

  const infoDate =
    typeof params.info.CreationDate === "string" ?
      PDF_DATE.exec(params.info.CreationDate)
    : null;

  const reportNumber = REPORT_NUMBER.exec(pageText);

  return {
    title: title !== null && title.length > 0 ? title : null,
    organisation: author.length > 0 ? author : null,
    reportNumber: reportNumber ? reportNumber[1]! : null,
    publishedAt:
      infoDate ?
        _iso(Number(infoDate[1]), Number(infoDate[2]), Number(infoDate[3]))
      : _dateFromText(pageText),
  };
}
