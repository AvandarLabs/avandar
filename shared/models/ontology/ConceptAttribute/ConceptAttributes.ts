import type { AttributeMappingType } from "$/models/ontology/AttributeMapping/AttributeMapping.types.ts";

export const ConceptAttributes = {
  AttributeMappingTypesMetadata: {
    manual_entry: {
      type: "manual_entry",
      displayName: "Manual entry",
    },
    dataset_column: {
      type: "dataset_column",
      displayName: "Dataset column value",
    },
  } as const satisfies {
    [T in AttributeMappingType]: {
      type: T;
      displayName: string;
    };
  },
};
