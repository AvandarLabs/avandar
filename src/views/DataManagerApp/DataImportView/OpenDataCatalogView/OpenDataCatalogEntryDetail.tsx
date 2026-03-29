import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";

type Props = {
  /** Selected catalog entry, or none when nothing is selected. */
  entry: OpenDataCatalogEntryRead | undefined;
  /** When false, add is blocked (e.g. subscription limit). */
  isAddAllowed: boolean;
  /** True while the insert mutation is running. */
  isAdding: boolean;
  /**
   * True while loading `catalog_entries__dataset_column` for the entry (or
   * before the query runs). Add stays disabled until this is false.
   */
  isLoadingColumnMetadata: boolean;
  /** Invoked when the user confirms adding the dataset to the workspace. */
  onAddToWorkspace: () => void;
};

/**
 * Shows full metadata for one open-data catalog entry and an add action.
 */
export function OpenDataCatalogEntryDetail({
  entry,
  isAddAllowed,
  isAdding,
  isLoadingColumnMetadata,
  onAddToWorkspace,
}: Props): JSX.Element {
  if (!entry) {
    return (
      <Stack align="center" justify="center" mih={200} gap="xs">
        <Text c="dimmed" ta="center">
          Select a dataset from the list to view its metadata.
        </Text>
      </Stack>
    );
  }

  const metadataJson =
    entry.metadata !== undefined ?
      JSON.stringify(entry.metadata, undefined, 2)
    : undefined;

  return (
    <ScrollArea mah="70vh" type="scroll">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Title order={4} lineClamp={3}>
            {entry.displayName}
          </Title>

          <ActionIcon
            aria-label="Add dataset to workspace"
            color="primary"
            variant="filled"
            size="lg"
            loading={isAdding || isLoadingColumnMetadata}
            disabled={!isAddAllowed || isAdding || isLoadingColumnMetadata}
            onClick={onAddToWorkspace}
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Group>

        {!isAddAllowed ?
          <Text c="dimmed" size="sm">
            You cannot add more datasets on your current plan. Upgrade to add
            this catalog dataset.
          </Text>
        : null}

        {entry.description ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Description
            </Text>
            <Text size="sm">{entry.description}</Text>
          </Stack>
        : null}

        <Stack gap={4}>
          <Text fw={600} size="sm">
            Organization
          </Text>
          <Text size="sm">{entry.externalOrganizationName}</Text>
        </Stack>

        {entry.externalServiceName ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Service
            </Text>
            <Text size="sm">{entry.externalServiceName}</Text>
          </Stack>
        : null}

        <Stack gap={4}>
          <Text fw={600} size="sm">
            Pipeline
          </Text>
          <Text size="sm">
            {entry.pipelineName} · run {entry.pipelineRunId}
          </Text>
        </Stack>

        {entry.sourceUrl ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Source URL
            </Text>
            <Anchor href={entry.sourceUrl} size="sm" target="_blank">
              {entry.sourceUrl}
            </Anchor>
          </Stack>
        : null}

        {entry.canonicalUrls && entry.canonicalUrls.length > 0 ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Canonical URLs
            </Text>
            <Stack gap={6}>
              {entry.canonicalUrls.map((url) => {
                return (
                  <Anchor key={url} href={url} size="sm" target="_blank">
                    {url}
                  </Anchor>
                );
              })}
            </Stack>
          </Stack>
        : null}

        <Group gap="xl" grow>
          {entry.license ?
            <Stack gap={4}>
              <Text fw={600} size="sm">
                License
              </Text>
              <Text size="sm">{entry.license}</Text>
            </Stack>
          : null}
          {entry.updateFrequency ?
            <Stack gap={4}>
              <Text fw={600} size="sm">
                Update frequency
              </Text>
              <Text size="sm">{entry.updateFrequency}</Text>
            </Stack>
          : null}
        </Group>

        {entry.notes ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Notes
            </Text>
            <Text size="sm">{entry.notes}</Text>
          </Stack>
        : null}

        {metadataJson ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              Raw metadata (JSON)
            </Text>
            <Text
              component="pre"
              size="xs"
              ff="monospace"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {metadataJson}
            </Text>
          </Stack>
        : null}

        <Button
          leftSection={<IconPlus size={18} />}
          loading={isAdding || isLoadingColumnMetadata}
          disabled={!isAddAllowed || isAdding || isLoadingColumnMetadata}
          onClick={onAddToWorkspace}
        >
          Add to workspace
        </Button>
      </Stack>
    </ScrollArea>
  );
}
