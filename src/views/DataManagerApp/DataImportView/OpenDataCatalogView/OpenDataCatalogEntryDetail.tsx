import { Trans, useLingui } from "@lingui/react/macro";
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
import { Tooltip } from "@ui";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/offline/useOfflineGate";
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
  const { t } = useLingui();
  const offline = useOfflineGate();
  if (!entry) {
    return (
      <Stack align="center" justify="center" mih={200} gap="xs">
        <Text c="dimmed" ta="center">
          <Trans>Select a dataset from the list to view its metadata.</Trans>
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

          <OfflineGated>
            <Tooltip
              label={t`Add to your workspace`}
              disabled={offline.isBlocked}
            >
              <ActionIcon
                aria-label={t`Add dataset to workspace`}
                color="primary"
                variant="filled"
                size="lg"
                loading={isAdding || isLoadingColumnMetadata}
                data-disabled={
                  (
                    !isAddAllowed ||
                    isAdding ||
                    isLoadingColumnMetadata ||
                    offline.isBlocked
                  ) ?
                    true
                  : undefined
                }
                aria-disabled={
                  !isAddAllowed ||
                  isAdding ||
                  isLoadingColumnMetadata ||
                  offline.isBlocked
                }
                onClick={offline.guard(onAddToWorkspace)}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </OfflineGated>
        </Group>

        {!isAddAllowed ?
          <Text c="dimmed" size="sm">
            <Trans>
              You cannot add more datasets on your current plan. Upgrade to add
              this catalog dataset.
            </Trans>
          </Text>
        : null}

        {entry.description ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Description</Trans>
            </Text>
            <Text size="sm">{entry.description}</Text>
          </Stack>
        : null}

        <Stack gap={4}>
          <Text fw={600} size="sm">
            <Trans>Organization</Trans>
          </Text>
          <Text size="sm">{entry.externalOrganizationName}</Text>
        </Stack>

        {entry.externalServiceName ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Service</Trans>
            </Text>
            <Text size="sm">{entry.externalServiceName}</Text>
          </Stack>
        : null}

        <Stack gap={4}>
          <Text fw={600} size="sm">
            <Trans>Pipeline</Trans>
          </Text>
          <Text size="sm">
            <Trans>
              {entry.pipelineName} · run {entry.pipelineRunId}
            </Trans>
          </Text>
        </Stack>

        {entry.sourceUrl ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Source URL</Trans>
            </Text>
            <Anchor href={entry.sourceUrl} size="sm" target="_blank">
              {entry.sourceUrl}
            </Anchor>
          </Stack>
        : null}

        {entry.canonicalUrls && entry.canonicalUrls.length > 0 ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Canonical URLs</Trans>
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
                <Trans>License</Trans>
              </Text>
              <Text size="sm">{entry.license}</Text>
            </Stack>
          : null}
          {entry.updateFrequency ?
            <Stack gap={4}>
              <Text fw={600} size="sm">
                <Trans>Update frequency</Trans>
              </Text>
              <Text size="sm">{entry.updateFrequency}</Text>
            </Stack>
          : null}
        </Group>

        {entry.notes ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Notes</Trans>
            </Text>
            <Text size="sm">{entry.notes}</Text>
          </Stack>
        : null}

        {metadataJson ?
          <Stack gap={4}>
            <Text fw={600} size="sm">
              <Trans>Raw metadata (JSON)</Trans>
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
          <Trans>Add to workspace</Trans>
        </Button>
      </Stack>
    </ScrollArea>
  );
}
