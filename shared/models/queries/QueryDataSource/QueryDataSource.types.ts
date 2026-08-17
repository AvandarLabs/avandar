import type { Model } from "@avandar/models";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { ConceptModel } from "$/models/ontology/Concept/Concept.types.ts";

export type QueryDataSource = DatasetModel["Read"] | ConceptModel["Read"];
export type QueryDataSourceTypedId = Model.TypedId<QueryDataSource>;
export type QueryDataSourceId = QueryDataSource["id"];
