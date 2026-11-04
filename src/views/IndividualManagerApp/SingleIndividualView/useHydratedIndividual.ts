import {
  isNonNullish,
  makeIdLookupMap,
  makeMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Individual } from "$/models/ontology/Individual/Individual";

/** A record with its case type's attributes and its attribute values. */
export type HydratedIndividual = Individual.T & {
  identifierAttribute?: ConceptAttribute.T;
  labelAttribute?: ConceptAttribute.T;
  attributes?: ConceptAttribute.T[];
  assertions?: Array<
    AttributeAssertion.T & {
      attributeName?: string;
      sourceType?: DatasetSource.SourceType;
      sourceName?: string;
    }
  >;
  labelValue?: AttributeAssertion.T;
};

/**
 * Hydrates an individual with its concept attributes and their assertions.
 */
export function useHydratedIndividual({
  concept,
  individual,
}: {
  concept: Concept.T;
  individual: Individual.T;
}): [HydratedIndividual, boolean] {
  // TODO(jpsyx): move this to a generalized implementation of useHydration
  const [conceptAttributes, isLoadingConceptAttributes] =
    ConceptAttributeClient.useGetAll({
      where: { concept_id: { eq: concept.id } },
    });
  const [attributeAssertions, isLoadingAttributeAssertions] =
    AttributeAssertionClient.withLogger().useGetAttributeAssertions({
      workspaceId: individual.workspaceId,
      individualId: individual.id,
      conceptAttributes: conceptAttributes ?? [],
    });

  const datasetIds = useMemo(() => {
    return [
      ...new Set(
        (attributeAssertions ?? []).map(prop("datasetId")).filter(isNonNullish),
      ),
    ];
  }, [attributeAssertions]);

  const [datasets] = DatasetClient.useGetAll(where("id", "in", datasetIds));

  const datasetsMap = useMemo(() => {
    return datasets ? makeMap(datasets, { keyFn: prop("id") }) : undefined;
  }, [datasets]);

  // TODO(jpsyx): move this to a module that can also use cacheing.
  const hydratedIndividual = useMemo(() => {
    let configInfo = undefined;
    let assertionsInfo = undefined;
    let attributesById:
      | Map<ConceptAttribute.Id, ConceptAttribute.T>
      | undefined = undefined;

    if (conceptAttributes) {
      const identifierAttribute = conceptAttributes.find(
        propEq("isIdentifier", true),
      );
      const labelAttribute = conceptAttributes.find(propEq("isLabel", true));
      attributesById = makeIdLookupMap(conceptAttributes);
      configInfo = {
        identifierAttribute,
        labelAttribute,
        attributes: conceptAttributes,
      };
    }

    if (attributeAssertions) {
      const assertionsByAttributeId = makeMap(attributeAssertions, {
        keyFn: prop("conceptAttributeId"),
        valueFn: (assertion) => {
          const config = attributesById?.get(assertion.conceptAttributeId);
          const dataset = assertion.datasetId
            ? datasetsMap?.get(assertion.datasetId)
            : undefined;
          return {
            ...assertion,
            attributeName: config?.name,
            sourceType: dataset?.sourceType ?? dataset?.sourceType,
            sourceName: dataset?.name,
          };
        },
      });

      const labelAttributeId = configInfo?.labelAttribute?.id;

      assertionsInfo = {
        assertions: [...assertionsByAttributeId.values()],
        labelValue: labelAttributeId
          ? assertionsByAttributeId.get(labelAttributeId)
          : undefined,
      };
    }

    return {
      ...individual,
      ...configInfo,
      ...assertionsInfo,
    };
  }, [individual, conceptAttributes, attributeAssertions, datasetsMap]);

  return [
    hydratedIndividual,
    isLoadingConceptAttributes || isLoadingAttributeAssertions,
  ];
}
