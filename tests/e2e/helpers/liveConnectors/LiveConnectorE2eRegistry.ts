import { objectEntries } from "@avandar/utils";
import { googleSheetsLiveConnectorE2e } from "./googleSheetsLiveConnectorE2e";
import { postgresTableLiveConnectorE2e } from "./postgresTableLiveConnectorE2e";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { LiveConnectorE2e } from "./LiveConnectorE2e.types";

/**
 * Every dataset source type, and how `live-connector-datasets.spec.ts` drives
 * it. A source whose rows can change without a re-import is live and runs the
 * whole spec. Keyed by every source type, so adding one to the database enum
 * fails to compile until its author decides which it is, and the spec checks
 * that decision against the refresh the app offers for it.
 */
const BY_SOURCE_TYPE: Record<
  DatasetSource.SourceType,
  LiveConnectorE2e | "not-live"
> = {
  csv_file: "not-live",
  google_sheets: googleSheetsLiveConnectorE2e,
  open_data: "not-live",
  pdf_file: "not-live",
  postgres_table: postgresTableLiveConnectorE2e,
  virtual: "not-live",
  xlsx_file: "not-live",
};

/** Each live source type with the connector that drives it. */
function getLiveConnectors(): Array<
  [DatasetSource.SourceType, LiveConnectorE2e]
> {
  return objectEntries(BY_SOURCE_TYPE).flatMap(([sourceType, connector]) => {
    return connector === "not-live" ? [] : [[sourceType, connector]];
  });
}

/** The live connector specs' view of every dataset source type. */
export const LiveConnectorE2eRegistry = {
  bySourceType: BY_SOURCE_TYPE,
  getLiveConnectors,
};
