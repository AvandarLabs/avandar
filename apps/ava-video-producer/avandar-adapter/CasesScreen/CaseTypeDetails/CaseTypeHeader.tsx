import { Button, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBlocks } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = { caseType: { id: string; name: string; description: string } };
/** Show case-type identity and the product's available metadata actions. */
export function CaseTypeHeader({ caseType }: Readonly<Props>): ReactNode {
  return (
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
  );
}
