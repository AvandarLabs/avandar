import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { makeConceptRecordValuesFromRows } from "@/clients/ontology/ConceptRecordValuesClient/makeConceptRecordValuesFromRows/makeConceptRecordValuesFromRows";
import { EXTERNAL_ID_COLUMN } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import { getConceptAttributeColumnsFromConceptId } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptAttributeColumnsFromConceptId";
import { MAX_RESTRICTED_EXTERNAL_IDS } from "@/clients/qetl/QueryMediator/conceptRelation/getConceptRelationPlansFromSql/getConceptRelationPlansFromSql";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ConceptRecordValues } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient.types";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { ServiceClient } from "@avandar/clients";
import type { WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";

type ConceptRecordValuesClientQueries = {
  /**
   * Reads the field values of the given records of one case type from its
   * concept view, one entry per key that names a record, in request order.
   * Accepts at most `MAX_RESTRICTED_EXTERNAL_IDS` distinct keys, and rejects
   * with an error when the case type's fields change while the values are
   * read, which a retry recovers from. The query key holds the whole
   * parameter object, `externalIds` included, so a cached result never
   * answers a request for a different set of records.
   */
  getConceptRecordValues: (params: {
    workspaceId: Workspace.Id;
    conceptId: Concept.Id;
    externalIds: readonly string[];
  }) => Promise<ConceptRecordValues[]>;
};

type IConceptRecordValuesClient = ServiceClient &
  ConceptRecordValuesClientQueries;

/**
 * Throws unless the result has exactly the view's own columns and the ones
 * `attributeColumns` named. Two reads name them, the planner's and this
 * client's, and a field added or renamed between the two can change which
 * column gets a suffix, which would file a value under the wrong field.
 */
function _assertColumnsMatch(
  options: Readonly<{
    resultColumnNames: readonly string[];
    attributeColumns: readonly ConceptAttributeColumn[];
  }>,
): void {
  const expectedNames = new Set([
    EXTERNAL_ID_COLUMN,
    ConceptStatusColumn.COLUMN_NAME,
    ...options.attributeColumns.map((column) => {
      return column.attributeName;
    }),
  ]);
  const resultNames = new Set(options.resultColumnNames);
  const hasSameColumns =
    resultNames.size === expectedNames.size &&
    [...expectedNames].every((name) => {
      return resultNames.has(name);
    });
  if (!hasSameColumns) {
    throw new Error(
      "The case type's fields changed while their values were read. Load them again.",
    );
  }
}

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
        if (externalIds.length > MAX_RESTRICTED_EXTERNAL_IDS) {
          throw new Error(
            `Cannot read ${externalIds.length} records at once. At most ` +
              `${MAX_RESTRICTED_EXTERNAL_IDS} may be read.`,
          );
        }
        const viewName = RelationRef.toTableName({
          kind: "concept",
          id: params.conceptId,
        });
        // The planner reads the case type's fields again for the query, so the
        // two reads run side by side and the result's columns are checked
        // against the ones this read named.
        const [{ attributeColumns }, { data, columns }] = await Promise.all([
          getConceptAttributeColumnsFromConceptId(params.conceptId),
          WorkspaceQuerySession.runQuery({
            workspaceId: params.workspaceId,
            rawSql: `SELECT * FROM ${quoteSqlIdentifier(viewName)}`,
            // The keys travel as data. The planner reads only these records
            // into the spine, so the view computes their rows alone.
            conceptSpineRestrictions: [
              { conceptId: params.conceptId, externalIds },
            ],
          }),
        ]);
        _assertColumnsMatch({
          resultColumnNames: columns.map((column) => {
            return column.name;
          }),
          attributeColumns,
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
