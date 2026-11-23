import { htmlToPlainText } from "@pipelines/shared/htmlToPlainText/htmlToPlainText";

/**
 * The source record paths this field holds, left out of a listing's additional
 * source metadata. The resource description, which this field holds as plain
 * text.
 */
export const reads = ["resource.description"];

/**
 * Mapper script for `description`: `resource.description` as plain text.
 * Socrata stores descriptions as HTML (about a quarter of NYC's carry tags),
 * and the catalog renders text, never markup.
 */
export default function socrataDescription(record: unknown): unknown {
  const description = (
    record as { resource?: { description?: unknown } } | null
  )?.resource?.description;
  return typeof description === "string"
    ? htmlToPlainText(description)
    : undefined;
}
