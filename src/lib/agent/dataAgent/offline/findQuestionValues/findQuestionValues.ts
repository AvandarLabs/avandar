import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { OfflineDatasetProfile } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";

/** Longest run of words tried as one value, such as "New York City". */
const MAX_TERM_WORDS = 3;

/** Columns with more values than this are not searched. */
const MAX_SEARCHED_DISTINCT_VALUES = 200_000;

/** Words that are never data values on their own. */
const STOP_WORDS = new Set(
  (
    "a an and are as at be by did do does for from had has have how in is it " +
    "its me my of on or show the their there this to was were what when " +
    "where which who why will with all any each per vs versus than over " +
    "most top many much more less total number give list tell find chart " +
    "graph plot table month monthly week weekly year yearly day daily"
  ).split(" "),
);

/** A stored value that matches words in the user's question. */
export type QuestionValueMatch = {
  /** The words as the user wrote them. */
  term: string;
  datasetId: string;
  column: string;
  storedValue: string;
  /**
   * Set when the words are a label in the column's code list. `storedValue`
   * is then the code to filter on, and this is the label it stands for.
   */
  codeLabel?: string;
};

function _isUsableTerm(words: readonly string[]): boolean {
  const joined = words.join(" ");
  if (
    words.every((word) => {
      return STOP_WORDS.has(word.toLowerCase());
    })
  ) {
    return false;
  }
  // A short word is a value only in capitals (US, NY), never "us" or "ny".
  return joined.length > 3 || joined === joined.toUpperCase();
}

/** Every run of one to three words in the question that could be a value. */
export function extractQuestionTerms(question: string): string[] {
  const words = question.match(/[\p{L}\p{N}][\p{L}\p{N}'.-]*/gu) ?? [];
  const terms = new Set<string>();
  for (let start = 0; start < words.length; start += 1) {
    for (let size = 1; size <= MAX_TERM_WORDS; size += 1) {
      const slice = words.slice(start, start + size);
      if (slice.length === size && _isUsableTerm(slice)) {
        terms.add(slice.join(" ").replace(/[.']+$/, ""));
      }
    }
  }
  return [...terms];
}

function _toSqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function _searchColumn(
  host: DataAgentHost,
  options: Readonly<{ datasetId: string; column: string; terms: string[] }>,
): Promise<QuestionValueMatch[]> {
  const column = quoteSqlIdentifier(options.column);
  const lowered = options.terms.map((term) => {
    return _toSqlText(term.toLowerCase());
  });
  const sql = `SELECT DISTINCT ${column} FROM ${quoteSqlIdentifier(options.datasetId)} WHERE lower(${column}) IN (${lowered.join(", ")})`;
  const found = await host.readColumnValues(sql);
  if (!Array.isArray(found)) {
    return [];
  }
  return found.flatMap((storedValue) => {
    const term = options.terms.find((candidate) => {
      return candidate.toLowerCase() === storedValue.toLowerCase();
    });
    return term
      ? [
          {
            term,
            datasetId: options.datasetId,
            column: options.column,
            storedValue,
          },
        ]
      : [];
  });
}

/**
 * The question's words that are labels in a column's code list, each with
 * the code to filter on. Found from the code lists alone, so no query runs.
 */
function _findCodeMatches(
  datasets: readonly DataAgentDataset[],
  terms: readonly string[],
): QuestionValueMatch[] {
  return datasets.flatMap((dataset) => {
    return dataset.columns.flatMap((column) => {
      const { codes } = column;
      if (codes?.direction !== "decode") {
        return [];
      }
      return terms.flatMap((term) => {
        const pair = ColumnCodes.findPairByLabel(codes, term);
        return pair
          ? [
              {
                term,
                datasetId: dataset.id,
                column: column.name,
                storedValue: pair.code,
                codeLabel: pair.label,
              },
            ]
          : [];
      });
    });
  });
}

/**
 * Keeps the longest matches: "York" (a county) inside a matched "New York"
 * is part of that name, not a second place the user named.
 */
function _keepLongestMatches(
  matches: readonly QuestionValueMatch[],
): QuestionValueMatch[] {
  const terms = [
    ...new Set(
      matches.map((match) => {
        return match.term.toLowerCase();
      }),
    ),
  ];
  return matches.filter((match) => {
    const term = match.term.toLowerCase();
    return !terms.some((other) => {
      return other !== term && ` ${other} `.includes(` ${term} `);
    });
  });
}

/**
 * Finds which words in the question are stored values, and in which text
 * columns, by searching the data on the device, and which are labels in a
 * column's code list. An offline model then uses the exact stored spelling,
 * or the code, instead of guessing it.
 */
export async function findQuestionValues(
  host: DataAgentHost,
  options: Readonly<{
    datasets: readonly DataAgentDataset[];
    profiles: readonly OfflineDatasetProfile[];
    question: string;
  }>,
): Promise<QuestionValueMatch[]> {
  const terms = extractQuestionTerms(options.question);
  if (terms.length === 0) {
    return [];
  }
  const matches = _findCodeMatches(options.datasets, terms);
  for (const profile of options.profiles) {
    for (const column of profile.columns) {
      const distinctCount = column.distinctCount ?? 0;
      if (distinctCount === 0 || distinctCount > MAX_SEARCHED_DISTINCT_VALUES) {
        continue;
      }
      matches.push(
        ...(await _searchColumn(host, {
          datasetId: profile.datasetId,
          column: column.name,
          terms,
        })),
      );
    }
  }
  return _keepLongestMatches(matches);
}
