import hdxGroupTitles from "@pipelines/hdx/mappers/hdxGroupTitles/hdxGroupTitles";
import hdxTagNames from "@pipelines/hdx/mappers/hdxTagNames/hdxTagNames";

/**
 * The source record paths this field holds, left out of a listing's additional
 * source metadata. Every tag name and group title becomes a keyword, so the
 * tags and groups have no other field worth keeping.
 */
export const reads = ["tags", "groups"];

/**
 * Mapper script for `tags`: each CKAN tag, then the title of each group the
 * package is in. HDX's groups are its countries ("Burkina Faso", "World"),
 * not topics, so they are keywords a user can search and filter by rather
 * than entries in the topic filter.
 */
export default function hdxKeywords(record: unknown): readonly string[] {
  return [...hdxTagNames(record), ...hdxGroupTitles(record)];
}
