import { formatDate } from "@avandar/utils";

/** Filename slug used when the title has no letters or digits to keep. */
const FALLBACK_SLUG = "map";

/** Longest slug kept before the date segment, in characters. */
const MAX_SLUG_LENGTH = 60;

/**
 * Reduces a title to a filesystem-safe, hyphen-separated slug.
 *
 * Anything that is not a letter or digit (including `/`, `\`, and `.`)
 * becomes a hyphen, so a hostile title such as `../../etc/passwd` cannot
 * carry a path separator or a `..` traversal segment into the saved file.
 */
function _slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? FALLBACK_SLUG : slug.slice(0, MAX_SLUG_LENGTH);
}

/**
 * Builds the export PDF's download filename from the printed title and the
 * instant it was produced.
 *
 * The result reaches the filesystem via `jsPDF.save()`, so the title is
 * reduced to a slug of letters, digits, and hyphens: no path separator, no
 * `..`, and no character a filesystem could reject.
 */
export function getExportFilename(
  options: Readonly<{ title: string; producedAt: Date }>,
): string {
  const { title, producedAt } = options;
  const slug = _slugify(title);
  const date = formatDate(producedAt, { zone: "UTC", format: "YYYY-MM-DD" });
  return `${slug}-${date}.pdf`;
}
