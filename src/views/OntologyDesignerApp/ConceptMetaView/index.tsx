import { formatDate, where } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { CaseTypeActions } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import { CaseTypeRail } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeRail";
import { CaseTypeStatusesSection } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeStatusesSection";
import { useHydratedConcept } from "@/views/OntologyDesignerApp/ConceptMetaView/useHydratedConcept";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
};

/**
 * One case type: what it is, the attributes its records carry, and the
 * statuses they move through, with its provenance in the rail.
 *
 * The header states the counts a user scans for (records, attributes) and
 * holds the actions on the whole case type, each hidden from a user whose
 * roles do not allow it. Statuses are the only part editable after
 * creation, through the Statuses section's Edit statuses modal.
 */
export function ConceptMetaView({ concept }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [fullConcept] = useHydratedConcept({ concept });
  const [recordCount] = IndividualClient.useGetCount(
    where("concept_id", "eq", concept.id),
  );
  const attributeCount = fullConcept.attributes?.length;

  return (
    <AppView>
      <AppViewHeader
        title={concept.name}
        facts={[
          recordCount === undefined || recordCount === null ? undefined : (
            <Plural value={recordCount} one="# record" other="# records" />
          ),
          attributeCount === undefined ? undefined : (
            <Plural
              value={attributeCount}
              one="# attribute"
              other="# attributes"
            />
          ),
          t`Created ${formatDate(concept.createdAt, { format: "MMM D, YYYY" })}`,
        ]}
        actions={
          <CaseTypeActions concept={concept} fullConcept={fullConcept} />
        }
      />
      <AppViewBody
        rail={
          <CaseTypeRail concept={concept} datasets={fullConcept.datasets} />
        }
      >
        <Stack gap="xl">
          {concept.description ? (
            <AppViewSection title={<Trans>Description</Trans>}>
              <Text maw="72ch">{concept.description}</Text>
            </AppViewSection>
          ) : null}
          <AppViewSection
            title={<Trans>Attributes</Trans>}
            meta={attributeCount}
          >
            <CaseTypeAttributesList
              attributes={fullConcept.attributes}
              datasets={fullConcept.datasets}
            />
          </AppViewSection>
          <CaseTypeStatusesSection concept={concept} />
        </Stack>
      </AppViewBody>
    </AppView>
  );
}
