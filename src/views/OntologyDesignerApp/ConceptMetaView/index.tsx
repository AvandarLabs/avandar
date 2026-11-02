import { Paper } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Container, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconBlocks } from "@tabler/icons-react";
import { CaseTypeActions } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeActions";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import { useHydratedConcept } from "@/views/OntologyDesignerApp/ConceptMetaView/useHydratedConcept";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concept: Concept.T;
};

/**
 * Case type detail: name, description, attributes, and sync/delete actions.
 */
export function ConceptMetaView({ concept }: Props): JSX.Element {
  const [fullConcept] = useHydratedConcept({ concept });

  return (
    <Container py="md">
      <Stack gap="lg" maw={720}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" align="flex-start" wrap="nowrap" miw={0}>
            <ThemeIcon radius="md" size={40} variant="light">
              <IconBlocks size={22} stroke={1.5} aria-hidden />
            </ThemeIcon>
            <Stack gap={4} miw={0}>
              <Title order={2} fw={650}>
                {concept.name}
              </Title>
              <Text size="sm" c="dimmed">
                <Trans>A type of record you manage</Trans>
              </Text>
              {concept.description ? (
                <Text c="dimmed">{concept.description}</Text>
              ) : null}
            </Stack>
          </Group>
          <CaseTypeActions concept={concept} fullConcept={fullConcept} />
        </Group>
        <Paper p="md">
          <Stack gap="md">
            <Title order={4}>
              <Trans>Attributes</Trans>
            </Title>
            <CaseTypeAttributesList
              attributes={fullConcept.attributes}
              datasets={fullConcept.datasets}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
