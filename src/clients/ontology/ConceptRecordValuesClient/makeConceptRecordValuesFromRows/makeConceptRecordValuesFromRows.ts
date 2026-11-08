import { makeObjectFromEntries } from "@avandar/utils";
import { EXTERNAL_ID_COLUMN } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptRecordValues } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient.types";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";

/**
 * Turns rows of a concept's view into each record's values, keyed by the id of
 * the attribute each column holds. Used by
 * `ConceptRecordValuesClient.getConceptRecordValues`.
 *
 * Columns are matched through `attributeId`, never by name, because two
 * attributes can share a name and the view suffixes the later one. Records
 * come back in `externalIds` order, and a key with no row is left out.
 */
export function makeConceptRecordValuesFromRows(
  options: Readonly<{
    rows: readonly UnknownRow[];
    attributeColumns: readonly ConceptAttributeColumn[];
    externalIds: readonly string[];
  }>,
): ConceptRecordValues[] {
  const rowsByExternalId = new Map(
    options.rows.map((row) => {
      return [String(row[EXTERNAL_ID_COLUMN]), row] as const;
    }),
  );
  return options.externalIds.flatMap((externalId) => {
    const row = rowsByExternalId.get(externalId);
    if (row === undefined) {
      return [];
    }
    const valueEntries = options.attributeColumns
      .filter((column) => {
        return Object.hasOwn(row, column.attributeName);
      })
      .map((column) => {
        return [column.attributeId, row[column.attributeName]] as const;
      });
    return [
      { externalId, valuesByAttributeId: makeObjectFromEntries(valueEntries) },
    ];
  });
}
