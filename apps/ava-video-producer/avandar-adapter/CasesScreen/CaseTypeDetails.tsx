import { Paper } from "@avandar/ui";
import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconBlocks } from "@tabler/icons-react";
import { CaseTypeAttributesList } from "@/views/OntologyDesignerApp/ConceptMetaView/CaseTypeAttributesList";
import type { ComponentProps } from "react";

type Props = {
  caseType: { id: string; name: string; description: string };
  attributes: NonNullable<
    ComponentProps<typeof CaseTypeAttributesList>["attributes"]
  >;
  datasets: NonNullable<
    ComponentProps<typeof CaseTypeAttributesList>["datasets"]
  >;
};

/**
 * The layout is the product's ConceptMetaView. Only its data hooks and
 * mutating action callbacks are replaced by the approved fixture binding.
 */
export function CaseTypeDetails({ caseType, attributes, datasets }: Props) {
  return (
    <Container py="md">
      <Stack gap="lg" maw={720}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" align="flex-start" wrap="nowrap" miw={0}>
            <ThemeIcon radius="md" size={40} variant="light">
              <IconBlocks size={22} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={4} miw={0}>
              <Title order={2} fw={650}>
                {caseType.name}
              </Title>
              <Text size="sm" c="dimmed">
                A type of record you manage
              </Text>
              <Text c="dimmed">{caseType.description}</Text>
            </Stack>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button
              data-video-target="cases-view-records"
              size="compact-sm"
              variant="light"
              rightSection={<IconArrowRight size={16} />}
            >
              View records
            </Button>
            <Button size="compact-sm" variant="light">
              Sync records
            </Button>
            <Button size="compact-sm" variant="subtle" color="danger">
              Delete
            </Button>
          </Group>
        </Group>
        <Paper p="md">
          <Stack gap="md">
            <Title order={4}>Attributes</Title>
            <CaseTypeAttributesList
              attributes={attributes}
              datasets={datasets}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
