import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Concept } from "$/models/ontology/Concept/Concept";

import { where } from "@avandar/utils";
import { useMemo } from "react";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";

/**
 * Given a concept, finish hydrating it.
 *
 * We query for its attributes and value mappings and add them to the config.
 *
 * @param options
 * @param options.concept
 */
export function useHydratedConcept({ concept }: { concept: Concept.T }): [
  Concept.T<"Full">,
  {
    isLoadingAttributes: boolean;
    isLoadingDatasets: boolean;
    isLoadingAttributeMappings: boolean;
  },
] {
  const [conceptAttributes, isLoadingAttributes] =
    ConceptAttributeClient.useGetAll(where("concept_id", "eq", concept.id));

  const [mappings, isLoadingAttributeMappings] =
    ConceptAttributeClient.useGetAllAttributeMappings({
      attributes: conceptAttributes,
      useQueryOptions: {
        enabled: !!conceptAttributes,
      },
    });

  const datasetsToLoad = useMemo(() => {
    const datasetIds = new Set<DatasetId>();
    mappings?.forEach((mapping) => {
      if (mapping.type === "dataset_column") {
        datasetIds.add(mapping.datasetId);
      }
    });
    return [...datasetIds];
  }, [mappings]);

  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("id", "in", datasetsToLoad),
    useQueryOptions: {
      enabled: datasetsToLoad.length > 0,
    },
  });

  const hydratedConcept: Concept.T<"Full"> = useMemo(() => {
    return {
      ...concept,
      datasets,
      attributes: conceptAttributes?.map((attribute) => {
        const { mappingType } = attribute;
        const mapping = mappings?.find((candidate) => {
          return candidate.conceptAttributeId === attribute.id;
        });

        return {
          ...attribute,
          mappingType,
          mapping,
        };
      }),
    };
  }, [concept, datasets, conceptAttributes, mappings]);

  return [
    hydratedConcept,
    {
      isLoadingAttributes,
      isLoadingDatasets,
      isLoadingAttributeMappings,
    },
  ];
}
