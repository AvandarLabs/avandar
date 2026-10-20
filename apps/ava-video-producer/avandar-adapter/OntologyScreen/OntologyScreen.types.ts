import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";

/** Source-checked metadata read by the ontology presentation leaves. */
export type OntologyConceptProjection = Pick<
  Concept.T,
  "id" | "name" | "description"
>;

type Attribute = NonNullable<Concept.T<"Full">["attributes"]>[number];
type DatasetMapping = Extract<
  NonNullable<Attribute["mapping"]>,
  {
    type: "dataset_column";
  }
>;

/** Attribute fields consumed by the original rows and badges. */
export type OntologyAttributeProjection = Pick<
  Attribute,
  "id" | "name" | "isIdentifier" | "isLabel" | "mappingType"
> & { mapping: Pick<DatasetMapping, "type" | "datasetId"> };

/** Hydrated presentation metadata, without persistence or ownership fields. */
export type OntologyHydrationProjection = OntologyConceptProjection & {
  datasets: Array<Pick<Dataset.T, "id" | "name">>;
  attributes: readonly OntologyAttributeProjection[];
};

/** Checked fixture inputs, separate from the complete-model component seam. */
export type OntologyFixtureProjection = {
  concepts: readonly OntologyConceptProjection[];
  concept: OntologyConceptProjection;
  fullConcept: OntologyHydrationProjection;
};
