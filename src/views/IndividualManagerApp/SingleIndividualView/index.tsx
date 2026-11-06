import {
  isNonNullish,
  makeIdLookupMap,
  makeMap,
  prop,
  propEq,
  unknownToString,
  where,
} from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Skeleton, VisuallyHidden } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AttributeAssertionClient } from "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { CaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";
import css from "@/views/IndividualManagerApp/SingleIndividualView/SingleIndividualView.module.css";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { UserProfile } from "$/models/User/UserProfile";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

/** Stands in for the members until they load, one array for every render. */
const EMPTY_MEMBERS: readonly UserProfile.WithRole[] = [];

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

  /** A comment to scroll to and highlight, from a copied comment link. */
  highlightedCommentId: string | undefined;
};

/**
 * A case's record page: its name and case type in the header band, its
 * activity feed and composer in the content column, and its fields in the
 * properties rail.
 */
export function SingleIndividualView({
  concept,
  individual,
  highlightedCommentId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [hydratedIndividual, isLoadingHydratedIndividual] =
    useHydratedIndividual({
      concept,
      individual,
    });
  const [members] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId: individual.workspaceId,
  });

  const attributeRows: CaseDetailsRow[] | undefined = useMemo(() => {
    if (!hydratedIndividual.assertions) {
      return undefined;
    }
    return hydratedIndividual.assertions.map((assertion) => {
      return {
        id: assertion.conceptAttributeId,
        name: assertion.attributeName ?? t`Loading...`,
        value: assertion.value,
        sourceName: assertion.sourceName,
      };
    });
  }, [hydratedIndividual.assertions, t]);

  return (
    <AppView>
      <AppViewHeader
        title={
          isLoadingHydratedIndividual ? (
            <>
              <Skeleton
                component="span"
                height={24}
                width={200}
                display="inline-block"
                aria-hidden
              />
              <VisuallyHidden>{t`Loading case`}</VisuallyHidden>
            </>
          ) : (
            unknownToString(hydratedIndividual.name)
          )
        }
        facts={[concept.name]}
      />
      {
        // The body's own padding would leave a gap under the composer, which
        // docks to the bottom of the scroller. This view pays the same gutter
        // itself, minus the bottom.
      }
      <AppViewBody
        noPadding
        rail={<CaseDetailsRail attributes={attributeRows} />}
      >
        <div className={css.content}>
          <CaseActivityFeed
            workspaceId={individual.workspaceId}
            individualId={individual.id}
            members={members ?? EMPTY_MEMBERS}
            highlightedCommentId={highlightedCommentId}
          />
        </div>
      </AppViewBody>
    </AppView>
  );
}
