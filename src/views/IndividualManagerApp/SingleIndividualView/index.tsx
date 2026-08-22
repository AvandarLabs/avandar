import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { RecordAttributeRow } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";

import { Paper } from "@avandar/ui";
import {
  isNonNullish,
  makeIdLookupMap,
  makeMap,
  prop,
  propEq,
  unknownToString,
  where,
} from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Container, Loader, Stack, Title } from "@mantine/core";
import { useMemo } from "react";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ActivityBlock } from "@/views/IndividualManagerApp/SingleIndividualView/ActivityBlock";
import { RecordAttributesList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAttributesList";

type HydratedIndividual = Individual.T & {
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
function useHydratedIndividual({
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

type Props = {
  concept: Concept.T;
  individual: Individual.T;
};

export function SingleIndividualView({
  concept,
  individual,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [hydratedIndividual, isLoadingHydratedIndividual] =
    useHydratedIndividual({
      concept,
      individual,
    });

  const attributeRows: RecordAttributeRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceType: assertion.sourceType,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <Container py="md">
      <Stack gap="lg" maw={720}>
        <Title order={2} fw={650}>
          {isLoadingHydratedIndividual ? (
            <Loader size="sm" />
          ) : (
            unknownToString(hydratedIndividual.name)
          )}
        </Title>
        <Paper p="lg">
          <Stack gap="lg">
            <Title order={4}>
              <Trans>Details</Trans>
            </Title>
            {attributeRows === undefined ? (
              <Loader />
            ) : (
              <RecordAttributesList attributes={attributeRows} />
            )}
          </Stack>
        </Paper>
        <Paper p="lg">
          <ActivityBlock />
        </Paper>
      </Stack>
    </Container>
  );
}
