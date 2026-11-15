/** The strptime parts a person reads as a date pattern. */
const PART_LABELS: Readonly<Record<string, string>> = {
  "%Y": "YYYY",
  "%y": "YY",
  "%m": "MM",
  "%d": "DD",
};

/**
 * A strptime date format as people write date patterns: `%m/%d/%Y`
 * becomes `MM/DD/YYYY`. A part it does not know stays as written. The
 * pattern letters are the same in every language, so it is not
 * translated.
 */
export function toDateFormatLabel(format: string): string {
  return format.replace(/%[A-Za-z]/g, (part) => {
    return PART_LABELS[part] ?? part;
  });
}
