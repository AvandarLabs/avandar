import { match } from "ts-pattern";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";

/** A manual refresh a dataset can offer, named for the source it re-reads. */
export type DatasetRefresh = "google_sheets" | "postgres_table";

/**
 * Which manual "Refresh" a dataset of this source type offers, if any. A
 * live source, whose rows can change without anyone re-importing it, must
 * offer one: its cached rows only go stale after
 * `GlobalAppConfig.timing.liveRelationMaxAgeMs`, and this is the escape hatch
 * for a user who has just edited the source. The match is exhaustive, so a
 * new source type has to decide.
 */
export function getDatasetRefreshFromSourceType(
  sourceType: DatasetSource.SourceType,
): DatasetRefresh | undefined {
  return match(sourceType)
    .with("google_sheets", "postgres_table", (liveSourceType) => {
      return liveSourceType;
    })
    .with("csv_file", "xlsx_file", "pdf_file", "open_data", "virtual", () => {
      return undefined;
    })
    .exhaustive();
}
