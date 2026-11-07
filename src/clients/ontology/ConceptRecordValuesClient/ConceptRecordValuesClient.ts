import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { makeConceptRecordValuesFromRows } from "@/clients/ontology/ConceptRecordValuesClient/makeConceptRecordValuesFromRows/makeConceptRecordValuesFromRows";
import { getConceptAttributeColumnsFromConceptId } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptAttributeColumnsFromConceptId";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptRecordValues } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient.types";
import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

type ConceptRecordValuesClientQueries = {
  /**
   * Reads the field values of the given records of one case type from its
   * concept view, one entry per key that names a record, in request order.
   * Accepts at most 500 keys. The query key holds the whole parameter object,
   * `externalIds` included, so a cached result never answers a request for a
   * different set of records.
   */
  getConceptRecordValues: (params: {
    workspaceId: Workspace.Id;
    conceptId: Concept.Id;
    externalIds: readonly string[];
  }) => Promise<ConceptRecordValues[]>;
};

type IConceptRecordValuesClient = ServiceClient &
  ConceptRecordValuesClientQueries;

function _createConceptRecordValuesClient(): WithLogger<
  WithQueryHooks<
    IConceptRecordValuesClient,
    keyof ConceptRecordValuesClientQueries,
    never
  >
> {
  const baseClient = createServiceClient("ConceptRecordValuesClient");
  return withLogger(baseClient, (clientLogger) => {
    const queries: ConceptRecordValuesClientQueries = {
      getConceptRecordValues: async (params) => {
        const logger = clientLogger.appendName("getConceptRecordValues");
        const externalIds = removeDuplicates(params.externalIds);
        if (externalIds.length === 0) {
          return [];
        }
        const { attributeColumns } =
          await getConceptAttributeColumnsFromConceptId(params.conceptId);
        const viewName = RelationRef.toTableName({
          kind: "concept",
          id: params.conceptId,
        });
        const { data } = await WorkspaceQuerySession.runQuery({
          workspaceId: params.workspaceId,
          rawSql: `SELECT * FROM ${quoteSqlIdentifier(viewName)}`,
          // The keys travel as data. The planner reads only these records
          // into the spine, so the view computes their rows alone.
          conceptSpineRestrictions: [
            { conceptId: params.conceptId, externalIds },
          ],
        });
        logger.log("Read record values", {
          conceptId: params.conceptId,
          recordCount: data.length,
        });
        return makeConceptRecordValuesFromRows({
          rows: data,
          attributeColumns,
          externalIds,
        });
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      { queryFns: ["getConceptRecordValues"], mutationFns: [] },
    );
  });
}

/**
 * Reads case type records' field values through the case type's concept
 * view, the one place values are computed. Use it wherever a screen shows a
 * record's fields, for example the record page's Details rail.
 */
export const ConceptRecordValuesClient = _createConceptRecordValuesClient();
