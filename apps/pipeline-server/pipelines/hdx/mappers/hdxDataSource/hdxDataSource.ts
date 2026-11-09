type HdxSourcedRecord = {
  dataset_source?: unknown;
  organization?: { title?: unknown } | null;
};

/**
 * Mapper script for `organization2_name`: HDX's `dataset_source`, the
 * organization the data comes from, which often differs from the HDX
 * organization that published it (WHO data published by an OCHA country
 * office). It is not a part of the publisher, as a Socrata agency is part of
 * its city. A source that repeats the publisher's name maps to nothing, so a
 * listing does not show the same name twice.
 */
export default function hdxDataSource(record: unknown): string | undefined {
  const sourcedRecord = record as HdxSourcedRecord | null;
  const dataSource = sourcedRecord?.dataset_source;
  if (typeof dataSource !== "string" || dataSource.trim() === "") {
    return undefined;
  }
  const publisher = sourcedRecord?.organization?.title;
  const isPublisher =
    typeof publisher === "string" &&
    publisher.trim().toLowerCase() === dataSource.trim().toLowerCase();
  return isPublisher ? undefined : dataSource.trim();
}
