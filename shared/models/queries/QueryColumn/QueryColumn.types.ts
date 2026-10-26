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
    /** Explicit SQL output name for this projection. */
    outputAlias?: string;
  }
>;
