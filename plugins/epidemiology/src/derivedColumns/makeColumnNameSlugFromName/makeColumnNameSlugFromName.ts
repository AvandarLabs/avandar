/** What a name with no letters or digits becomes. */
const EMPTY_SLUG = "value";

/**
 * Makes a column name the Data Explorer accepts for an added column
 * (`^[a-z][a-z0-9_]*$`) from any column name, so a command can name its
 * output after an input, such as `cases_7d_avg` from "Cases". It lowercases,
 * turns each run of characters outside a to z and 0 to 9 into one underscore,
 * trims underscores from the ends, and prefixes `c_` when the result starts
 * with a digit. A name with nothing left becomes `value`.
 */
export function makeColumnNameSlugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (slug === "") {
    return EMPTY_SLUG;
  }
  return /^[a-z]/.test(slug) ? slug : `c_${slug}`;
}
