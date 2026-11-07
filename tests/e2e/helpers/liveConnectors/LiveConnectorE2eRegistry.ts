import { objectEntries } from "@avandar/utils";
import { googleSheetsLiveConnectorE2e } from "./googleSheetsLiveConnectorE2e";
import { postgresTableLiveConnectorE2e } from "./postgresTableLiveConnectorE2e";
import type { LiveConnectorE2e } from "./LiveConnectorE2e.types";
import type { DatasetRefresh } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";

/**
 * The connector that drives each live source type: one whose rows can change
 * without a re-import, so the app offers a manual refresh for it. Keyed by
 * that refresh, so a new source type `getDatasetRefreshFromSourceType` offers
 * one for fails to compile here until it has a connector.
 */
const BY_SOURCE_TYPE: Record<DatasetRefresh, LiveConnectorE2e> = {
  google_sheets: googleSheetsLiveConnectorE2e,
  postgres_table: postgresTableLiveConnectorE2e,
};

/** The live connector specs' view of every live source type. */
export const LiveConnectorE2eRegistry = {
  /** Each live source type with the connector that drives it. */
  getLiveConnectors: (): Array<{
    sourceType: DatasetRefresh;
    connector: LiveConnectorE2e;
  }> => {
    return objectEntries(BY_SOURCE_TYPE).map(([sourceType, connector]) => {
      return { sourceType, connector };
    });
  },
};
