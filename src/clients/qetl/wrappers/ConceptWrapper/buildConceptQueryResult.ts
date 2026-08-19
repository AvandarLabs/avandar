import { makeObjectFromEntries, pickProps } from "@avandar/utils";
import { uuid } from "$/lib/uuid";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

/**
 * Builds a {@link QueryResult} out of the raw rows `AttributeAssertionClient`
 * returns, remapping each row from attribute ids to the attribute names the
 * rest of the query pipeline expects columns to be keyed by.
 *
 * Lives beside the concept wrapper because both the wrapper's `pushDown` and
 * the structured-query concept branch shape rows this way, and the two must
 * not drift. This module imports no client, so importing it costs nothing.
 */
export function buildConceptQueryResult(
  attributes: readonly ConceptAttribute.T[],
  rows: ReadonlyArray<Record<ConceptAttribute.Id, unknown>>,
): QueryResult.T<UnknownRow> {
  const queryResultColumns: QueryResult.Column[] = attributes.map(
    pickProps(["name", "dataType"]),
  );

  return {
    id: uuid<QueryResult.Id>(),
    // Mapping over `attributes` rather than over the derived columns keeps
    // each attribute's id in hand, so no per-row lookup back into
    // `attributes` is needed.
    data: rows.map((row) => {
      return makeObjectFromEntries(
        attributes.map((attribute) => {
          return [attribute.name, row[attribute.id]];
        }),
      );
    }),
    columns: queryResultColumns,
    numRows: rows.length,
  };
}
