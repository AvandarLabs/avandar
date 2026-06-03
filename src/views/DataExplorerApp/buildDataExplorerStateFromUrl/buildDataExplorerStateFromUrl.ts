import { isDefined, makeObjectFromEntries } from "@utils";
import { QueryAggregationType } from "$/models/queries/QueryAggregationType/QueryAggregationType";
import { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";
import { z } from "zod";
import { OpenDatasetInfo } from "../DataExplorerStateManager/DataExplorerAppState.types";
import { DataExplorerUrlState } from "../useDataExplorerUrlSync/useHydrateDataExplorerStateFromUrl";

/**
 * Zod schema for the Data Explorer URL search params.
 *
 * We persist a minimal set of identifiers rather than serialising full
 * model objects, keeping URLs short and human-readable:
 *
 *   ?ds=<dataSourceId>
 *   &cols=<colName1>,<colName2>
 *   &agg=<colName>:<aggregationType>,...
 *   &orderBy=<colName>&orderDir=asc|desc
 *   &sql=<rawSQL>
 *   &vc=<JSON-stringified VizConfig> (omitted when viz is the default table)
 *
 * When `sql` is present it is the authoritative query: `ds`, `cols`, `agg`,
 * and `orderBy`/`orderDir` are not written (and are ignored on hydrate) so a
 * leftover Manual Query cannot conflict with AI / edited SQL.
 */
export const DataExplorerSearchSchema = z.object({
  ds: z.string().optional(), // data source
  cols: z.string().optional(), // column names
  agg: z.string().optional(), // aggregations
  orderBy: z.string().optional(), // order by column name
  orderDir: z.enum(["asc", "desc"] as const).optional(), // order by direction
  sql: z.string().optional(), // raw SQL
  vc: z.string().optional(), // viz config

  // Compact JSON of `{ did, name, vid }` identifying the open dataset
  // where `did` is used for the datasetId of an OpenDataset and `vid` is used
  // for a virtualDatasetId of a VirtualDataset.
  // TODO(jpsyx): we should not need a separate field to represent OpenDataset
  // or VirtualDataset. it can just be handled through the datasetSource and
  // a data source `type` field.
  od: z.string().optional(),
});

const OpenDatasetSchema = z.object({
  did: z.string().optional(), // dataset ID
  name: z.string(), // dataset name
  vid: z.string().optional(), // virtual dataset ID
});

export type DataExplorerUrlSearch = z.infer<typeof DataExplorerSearchSchema>;

export function buildDataExplorerStateFromUrl(
  urlSearch: DataExplorerUrlSearch,
): DataExplorerUrlState {
  // Convert the parsed URL search object into a ParsedURLState object.
  // This is used to restore the Data Explorer state from the URL
  const aggregations = (() => {
    const aggEntries = urlSearch.agg
      ?.split(",")
      .map((pair) => {
        const [aggName, aggType] = pair.split(":");
        if (aggName && aggType && QueryAggregationType.isValid(aggType)) {
          return [aggName, aggType] as const;
        }
        return undefined;
      })
      .filter(isDefined);
    return aggEntries && aggEntries.length > 0 ?
        makeObjectFromEntries(aggEntries)
      : undefined;
  })();

  const vizConfig = (() => {
    try {
      // TODO(jpsyx): use a Zod schema and parse it in VizConfig module
      return urlSearch.vc ? (JSON.parse(urlSearch.vc) as VizConfig) : undefined;
    } catch {
      // Ignore malformed JSON — the viz will fall back to defaults.
      return undefined;
    }
  })();

  const openDataset = (() => {
    try {
      const dataset =
        urlSearch.od ?
          OpenDatasetSchema.parse(JSON.parse(urlSearch.od))
        : undefined;
      if (dataset) {
        return {
          datasetId: dataset.did as OpenDatasetInfo["datasetId"],
          name: dataset.name,
          virtualDatasetId: dataset.vid as OpenDatasetInfo["virtualDatasetId"],
        };
      }
    } catch {
      // Ignore malformed JSON.
    }
    return undefined;
  })();

  const dataExplorerUrlState: DataExplorerUrlState = {
    aggregations,
    vizConfig,
    dsId: urlSearch.ds,
    colNames:
      urlSearch.cols ? urlSearch.cols.split(",").filter(Boolean) : undefined,
    orderByColName: urlSearch.orderBy,
    orderDir: urlSearch.orderDir,
    rawSql: urlSearch.sql,
    openDataset,
  };
  return dataExplorerUrlState;
}
