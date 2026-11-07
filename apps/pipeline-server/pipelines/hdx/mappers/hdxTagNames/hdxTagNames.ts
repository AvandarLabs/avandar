/** Mapper script for `tags`: each CKAN tag's `name`. */
export default function hdxTagNames(record: unknown): readonly string[] {
  const tags = (record as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.flatMap((tag: unknown) => {
    const name = (tag as { name?: unknown } | null)?.name;
    return typeof name === "string" ? [name] : [];
  });
}
