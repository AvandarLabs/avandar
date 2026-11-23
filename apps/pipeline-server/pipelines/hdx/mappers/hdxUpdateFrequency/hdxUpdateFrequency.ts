/**
 * HDX's `data_update_frequency` codes, in words. The codes are the number of
 * days between updates, plus three special values.
 */
const UPDATE_FREQUENCY_BY_CODE: Readonly<Record<string, string>> = {
  "0": "Live",
  "1": "Every day",
  "7": "Every week",
  "14": "Every two weeks",
  "30": "Every month",
  "90": "Every three months",
  "180": "Every six months",
  "365": "Every year",
  "-1": "Never",
  "-2": "As needed",
};

/**
 * The source record paths this field holds, left out of a listing's additional
 * source metadata. The update frequency code this field names.
 */
export const reads = ["data_update_frequency"];

/**
 * Mapper script for `update_frequency`: HDX's code in words. An unknown
 * code is kept as written, so a new code still shows up rather than
 * vanishing.
 */
export default function hdxUpdateFrequency(record: unknown): unknown {
  const code = (record as { data_update_frequency?: unknown } | null)
    ?.data_update_frequency;
  if (typeof code !== "string") {
    return undefined;
  }
  return Object.hasOwn(UPDATE_FREQUENCY_BY_CODE, code)
    ? UPDATE_FREQUENCY_BY_CODE[code]
    : code;
}
