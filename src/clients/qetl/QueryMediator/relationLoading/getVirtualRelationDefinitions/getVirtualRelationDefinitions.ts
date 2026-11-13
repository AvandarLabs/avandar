import { where } from "@avandar/utils";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { LogicalDefinition } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";

/** The definition kind a virtual dataset's cached rows are keyed by. */
const VIRTUAL_SQL_DEFINITION_KIND = "virtual_sql";

/**
 * A virtual dataset's defining SQL as the definition its cached rows are
 * stored and probed under, so an edited definition is a miss.
 */
export function makeVirtualRelationDefinition(
  rawSql: string,
): LogicalDefinition {
  return { kind: VIRTUAL_SQL_DEFINITION_KIND, text: rawSql };
}

/**
 * Each virtual dataset's definition among `datasetIds`, read from the same
 * cached virtual records acquisition reads, so a probe's token and the rows
 * stored under it come from the same SQL. Other datasets are left out: they
 * have no defining text. Used by the query runner before it probes the
 * storage tier.
 *
 * A failed read is logged and finds no definitions, so the query still runs:
 * every other dataset is served as before, and a virtual dataset probes with
 * no definition, so it is served only from rows cached before its definition
 * was keyed, and otherwise acquired again.
 */
export async function getVirtualRelationDefinitions(
  datasetIds: readonly Dataset.Id[],
): Promise<Record<string, LogicalDefinition>> {
  if (datasetIds.length === 0) {
    return {};
  }
  try {
    const sources = await VirtualDatasetClient.withCache(AvaQueryClient)
      .withEnsureQueryData()
      .getAll(where("dataset_id", "in", datasetIds));
    return Object.fromEntries(
      sources.map((source) => {
        return [source.datasetId, makeVirtualRelationDefinition(source.rawSql)];
      }),
    );
  } catch (error) {
    Logger.error(
      "Could not read virtual dataset definitions; the query runs without them",
      { error },
    );
    return {};
  }
}
