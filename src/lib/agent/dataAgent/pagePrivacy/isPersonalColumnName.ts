import { PII_COLUMN_NAME_KEYWORDS } from "@/components/privacy/privacy-helpers/detectPii/detectPii";

/**
 * Personal words a spreadsheet header often uses that `detectPii`'s list
 * lacks: one-word forms such as `Surname`, `FIRSTNAME`, and `birthdate`,
 * and the people a program serves, `Client` and `Guardian`.
 */
const EXTRA_PERSONAL_WORDS: readonly string[] = [
  "name",
  "surname",
  "nickname",
  "maiden",
  "firstname",
  "lastname",
  "fullname",
  "birthdate",
  "client",
  "guardian",
];

/**
 * Keywords as `_`-wrapped word runs, so `first_name` matches the words
 * `first` then `name` and never the inside of another word.
 */
const PERSONAL_WORD_RUNS: readonly string[] = [
  ...PII_COLUMN_NAME_KEYWORDS,
  ...EXTRA_PERSONAL_WORDS,
].map((keyword) => {
  return `_${keyword}_`;
});

/**
 * A column name as lowercase words joined by `_`: camelCase is split, and
 * spaces and punctuation become `_`, so `First Name`, `firstName`, and
 * `first_name` all read `first_name`.
 */
function _normalizeColumnName(columnName: string): string {
  return columnName
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1_$2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1_$2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * True when values compared with this column are personal: its normalized
 * name contains one of `detectPii`'s column keywords (or a common header
 * word such as `surname`) as whole words. Matching whole words keeps
 * `stage` (which contains `age`) and `vaccination_status` (which contains
 * `cc`) unflagged, where `detectPii`'s substring check flags them.
 *
 * Use it to decide which filter values in page SQL must not reach a hosted
 * model, for example `"First Name" = 'Jane'`.
 */
export function isPersonalColumnName(columnName: string): boolean {
  const wrapped = `_${_normalizeColumnName(columnName)}_`;
  return PERSONAL_WORD_RUNS.some((run) => {
    return wrapped.includes(run);
  });
}
