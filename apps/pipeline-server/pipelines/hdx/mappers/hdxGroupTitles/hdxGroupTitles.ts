/**
 * Mapper script for `domains`: the title of each group a CKAN package is
 * in. On HDX, groups are mostly countries.
 */
export default function hdxGroupTitles(record: unknown): readonly string[] {
  const groups = (record as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups.flatMap((group: unknown) => {
    const title = (group as { title?: unknown } | null)?.title;
    return typeof title === "string" ? [title] : [];
  });
}
