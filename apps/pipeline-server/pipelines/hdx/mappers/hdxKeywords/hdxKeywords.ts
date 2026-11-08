import hdxGroupTitles from "@pipelines/hdx/mappers/hdxGroupTitles/hdxGroupTitles";
import hdxTagNames from "@pipelines/hdx/mappers/hdxTagNames/hdxTagNames";

/**
 * Mapper script for `tags`: each CKAN tag, then the title of each group the
 * package is in. HDX's groups are its countries ("Burkina Faso", "World"),
 * not topics, so they are keywords a user can search and filter by rather
 * than entries in the topic filter.
 */
export default function hdxKeywords(record: unknown): readonly string[] {
  return [...hdxTagNames(record), ...hdxGroupTitles(record)];
}
