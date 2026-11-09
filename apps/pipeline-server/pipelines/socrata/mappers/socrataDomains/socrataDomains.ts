function _readStrings(value: unknown): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => {
        return typeof item === "string";
      })
    : [];
}

/**
 * The source record paths this field holds, left out of a listing's additional
 * source metadata. The portal's own category and Socrata's categories, which
 * this field holds together.
 */
export const reads = [
  "classification.domain_category",
  "classification.categories",
];

/**
 * Mapper script for `domains`: the portal's own category
 * (`classification.domain_category`) followed by Socrata's global
 * categories (`classification.categories`), which most portals leave empty.
 */
export default function socrataDomains(record: unknown): readonly string[] {
  const classification = (
    record as {
      classification?: { domain_category?: unknown; categories?: unknown };
    } | null
  )?.classification;
  return [
    ..._readStrings(classification?.domain_category),
    ..._readStrings(classification?.categories),
  ];
}
