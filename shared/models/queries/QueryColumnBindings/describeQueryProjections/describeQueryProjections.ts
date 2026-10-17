import { Model } from "@avandar/models";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import { buildSqlExpressionKey } from "$/models/queries/QueryColumnBindings/buildSqlExpressionKey.ts";
import { makeRelationRefFromQueryDataSource } from "$/models/relations/RelationRef/makeRelationRefFromQueryDataSource.ts";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type { ProjectionDescriptor } from "$/models/queries/QueryColumnBindings/QueryColumnBindings.ts";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.ts";

/** Describes selected projections using their authoritative aggregation map. */
export function describeQueryProjections(
  query: Readonly<StructuredQuery.Partial>,
): ProjectionDescriptor[] {
  if (!query.dataSource || query.nestedSubquery || query.joins.length > 0) {
    return [];
  }
  const source = Model.getTypedId(query.dataSource);
  const table = RelationRef.toTableName(
    makeRelationRefFromQueryDataSource(query.dataSource),
  );
  return query.queryColumns.map((column) => {
    const base = Model.getTypedId(column.baseColumn);
    const aggregation = query.aggregations[column.id];
    return {
      id: column.id,
      identity: "structured",
      expressionKey: JSON.stringify([
        "model",
        [source.__type, source.id],
        [base.__type, base.id],
        aggregation === "group_by" ? "none" : (aggregation ?? "none"),
      ]),
      sqlExpressionKey: buildSqlExpressionKey({
        table,
        column: column.baseColumn.name,
        aggregation,
      }),
      outputName: QueryColumn.getDerivedColumnName({ ...column, aggregation }),
    };
  });
}
