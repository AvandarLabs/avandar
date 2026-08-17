import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { ConceptAttributeModel } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

type ModelType = "QueryColumn";

export type QueryColumnId = UUID<ModelType>;

export type QueryColumnRead = Model.Base<
  ModelType,
  {
    id: QueryColumnId;
    baseColumn: DatasetColumnRead | ConceptAttributeModel["Read"];
    aggregation: QueryAggregationTypeT | undefined;
  }
>;
