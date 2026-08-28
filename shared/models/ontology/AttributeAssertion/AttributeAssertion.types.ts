import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { IndividualId } from "$/models/ontology/Individual/Individual.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { UUID } from "@avandar/utils";

export type AttributeAssertionId = UUID<"AttributeAssertion">;

export type AttributeAssertionRead = {
  createdAt: string;
  datasetId: DatasetId | undefined;
  conceptAttributeId: ConceptAttributeId;
  individualId: IndividualId;
  conceptId: ConceptId;
  id: AttributeAssertionId;
  updatedAt: string;
  value: unknown;
  valueSet: unknown[];
  workspaceId: Workspace.Id;
};
