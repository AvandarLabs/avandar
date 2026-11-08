import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { ConceptStatusColumn } from "$/models/queries/ConceptStatusColumn/ConceptStatusColumn.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";

type ModelType = "QueryColumn";

export type QueryColumnId = UUID<ModelType>;

export type QueryColumnRead = Model.Base<
  ModelType,
  {
    id: QueryColumnId;
    baseColumn:
      | DatasetColumnRead
      | ConceptAttributeModel["Read"]
      | ConceptStatusColumn.T;
    aggregation: QueryAggregationTypeT | undefined;
    /**
     * The `QueryResult` column name the SQL gives this projection with `AS`,
     * when it names one explicitly.
     */
    outputAlias?: string;
    /**
     * The column the SQL reads, when it is not `baseColumn.name`: a case
     * type field whose view column was suffixed because the record key, the
     * status, or another field already had that name. The result column is
     * still named after the field.
     */
    sourceColumnName?: string;
    /**
     * The name the result column carries when it is not `baseColumn.name`: a
     * case type field that shares its name, without regard to case, with an
     * earlier field. DuckDB reads two result columns of one name as one, so
     * the later field's result is named after its view column.
     */
    resultColumnName?: string;
  }
>;
