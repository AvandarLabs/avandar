import { Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Button,
  Collapse,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryDetail/OpenDataCatalogEntryDetail.module.css";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";
import type { ReactNode } from "react";

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
 * Everything the catalog knows about one entry, and the one action on it.
 *
 * The provenance fields read as a labelled fact list rather than as nine
 * bold-heading-plus-paragraph pairs, which turns a page of short values into
 * a page of headings. There is exactly one add button: a primary action
 * offered twice makes a user check whether the two do the same thing.
 */
export function OpenDataCatalogEntryDetail({
  entry,
  isAddAllowed,
  isAdding,
  isLoadingColumnMetadata,
  onAddToWorkspace,
}: Props): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const [isRawMetadataOpen, rawMetadata] = useDisclosure(false);

  if (!entry) {
    return (
      <Stack align="center" justify="center" mih={200} gap="xs" p="lg">
        <Text c="dimmed" ta="center" size="sm" maw="34ch">
          <Trans>
            Pick a dataset on the left to read what it covers, who publishes
            it, and how often it updates.
          </Trans>
        </Text>
      </Stack>
    );
  }

  const metadataJson =
    entry.metadata !== undefined
      ? JSON.stringify(entry.metadata, undefined, 2)
      : undefined;
  const isAddBlocked =
    !isAddAllowed || isAdding || isLoadingColumnMetadata || offline.isBlocked;

  return (
    <Stack gap="md" className={css.openDataCatalogEntryDetail}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Title
          order={4}
          lineClamp={3}
          className={css.openDataCatalogEntryDetailTitle}
        >
          {entry.displayName}
        </Title>
        <OfflineGated>
          <Button
            leftSection={<IconPlus size={16} />}
            loading={isAdding || isLoadingColumnMetadata}
            data-disabled={isAddBlocked || undefined}
            aria-disabled={isAddBlocked}
            aria-label={t`Add dataset to workspace`}
            onClick={offline.guard(onAddToWorkspace)}
          >
            <Trans>Add to workspace</Trans>
          </Button>
        </OfflineGated>
      </Group>

      {!isAddAllowed ? (
        <Text c="danger.8" size="sm">
          <Trans>
            You cannot add more datasets on your current plan. Upgrade to add
            this catalog dataset.
          </Trans>
        </Text>
      ) : null}

      {entry.description ? (
        <Text size="sm" maw="70ch">
          {entry.description}
        </Text>
      ) : null}

      <AppViewRail.Group>
        <AppViewRail.Fact label={t`Organization`}>
          {entry.externalOrganizationName}
        </AppViewRail.Fact>
        {entry.externalServiceName ? (
          <AppViewRail.Fact label={t`Service`}>
            {entry.externalServiceName}
          </AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Pipeline`}>
          <Trans>
            {entry.pipelineName} · run {entry.pipelineRunId}
          </Trans>
        </AppViewRail.Fact>
        {entry.license ? (
          <AppViewRail.Fact label={t`License`}>
            {entry.license}
          </AppViewRail.Fact>
        ) : null}
        {entry.updateFrequency ? (
          <AppViewRail.Fact label={t`Updates`}>
            {entry.updateFrequency}
          </AppViewRail.Fact>
        ) : null}
        {entry.sourceUrl ? (
          <AppViewRail.Fact label={t`Source`}>
            <Anchor href={entry.sourceUrl} size="xs" target="_blank">
              {entry.sourceUrl}
            </Anchor>
          </AppViewRail.Fact>
        ) : null}
        {entry.canonicalUrls && entry.canonicalUrls.length > 0 ? (
          <AppViewRail.Fact label={t`Canonical`}>
            <Stack gap={2}>
              {entry.canonicalUrls.map((url) => {
                return (
                  <Anchor key={url} href={url} size="xs" target="_blank">
                    {url}
                  </Anchor>
                );
              })}
            </Stack>
          </AppViewRail.Fact>
        ) : null}
        {entry.notes ? (
          <AppViewRail.Fact label={t`Notes`}>{entry.notes}</AppViewRail.Fact>
        ) : null}
      </AppViewRail.Group>

      {metadataJson ? (
        <Stack gap="xs" align="flex-start">
          <Button
            variant="subtle"
            color="neutral"
            size="compact-xs"
            rightSection={
              <IconChevronDown
                size={14}
                className={
                  isRawMetadataOpen
                    ? css.openDataCatalogEntryDetailChevronOpen
                    : css.openDataCatalogEntryDetailChevronClosed
                }
              />
            }
            aria-expanded={isRawMetadataOpen}
            onClick={rawMetadata.toggle}
          >
            <Trans>Raw metadata</Trans>
          </Button>
          <Collapse expanded={isRawMetadataOpen} w="100%">
            <Text component="pre" size="xs" className={css.openDataCatalogEntryDetailRawMetadata}>
              {metadataJson}
            </Text>
          </Collapse>
        </Stack>
      ) : null}
    </Stack>
  );
}
