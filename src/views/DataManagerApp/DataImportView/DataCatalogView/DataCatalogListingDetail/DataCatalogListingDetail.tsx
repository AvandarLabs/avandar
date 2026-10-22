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
import { DataCatalogListingColumns } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail.module.css";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { ColumnTypeState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import type { ReactNode } from "react";

type Props = {
  /** Selected catalog listing, or none when nothing is selected. */
  listing: DataCatalogListingRead | undefined;
  /** The selected listing's columns, as stored. */
  columns: readonly DataCatalogRelationColumn.T[];
  /** Whether the selected listing's column types are confirmed yet. */
  columnTypeState: ColumnTypeState;
  /** When false, add is blocked (e.g. subscription limit). */
  isAddAllowed: boolean;
  /** True while the insert mutation is running. */
  isAdding: boolean;
  /**
   * True while "Add to workspace" waits for the listing's column types to
   * be confirmed before it saves.
   */
  isWaitingForColumnTypes: boolean;
  /**
   * True while loading `data_catalog_listings__relation_columns` for the
   * listing (or before the query runs). Add stays disabled until this is
   * false.
   */
  isLoadingColumnMetadata: boolean;
  /** Invoked when the user confirms adding the dataset to the workspace. */
  onAddToWorkspace: () => void;
};

/**
 * Everything the catalog knows about one listing, and the one action on it.
 *
 * The provenance fields read as a labelled fact list rather than as nine
 * bold-heading-plus-paragraph pairs, which turns a page of short values into
 * a page of headings. There is exactly one add button: a primary action
 * offered twice makes a user check whether the two do the same thing.
 */
export function DataCatalogListingDetail({
  listing,
  columns,
  columnTypeState,
  isAddAllowed,
  isAdding,
  isWaitingForColumnTypes,
  isLoadingColumnMetadata,
  onAddToWorkspace,
}: Props): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const [isRawMetadataOpen, rawMetadata] = useDisclosure(false);

  if (!listing) {
    return (
      <Stack align="center" justify="center" mih={200} gap="xs" p="lg">
        <Text c="dimmed" ta="center" size="sm" maw="34ch">
          <Trans>
            Pick a dataset on the left to read what it covers, who publishes it,
            and how often it updates.
          </Trans>
        </Text>
      </Stack>
    );
  }

  const metadataJson =
    listing.metadata !== undefined
      ? JSON.stringify(listing.metadata, undefined, 2)
      : undefined;
  const isAddPending = isAdding || isWaitingForColumnTypes;
  const isAddBlocked =
    !isAddAllowed ||
    isAddPending ||
    isLoadingColumnMetadata ||
    offline.isBlocked;

  return (
    <Stack gap="md" className={css.dataCatalogListingDetail}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
        <Title
          order={4}
          lineClamp={3}
          className={css.dataCatalogListingDetailTitle}
        >
          {listing.displayName}
        </Title>
        <OfflineGated>
          <Button
            leftSection={<IconPlus size={16} />}
            loading={isAddPending || isLoadingColumnMetadata}
            data-disabled={isAddBlocked || undefined}
            aria-disabled={isAddBlocked}
            aria-label={t`Add dataset to workspace`}
            onClick={offline.guard(onAddToWorkspace)}
          >
            <Trans>Add to workspace</Trans>
          </Button>
        </OfflineGated>
      </Group>

      {isWaitingForColumnTypes ? (
        <Text size="sm" c="dimmed" role="status">
          <Trans>
            Checking this dataset's columns first. It will be added to your
            workspace as soon as that finishes.
          </Trans>
        </Text>
      ) : null}

      {!isAddAllowed ? (
        <Text c="danger.8" size="sm">
          <Trans>
            You cannot add more datasets on your current plan. Upgrade to add
            this catalog dataset.
          </Trans>
        </Text>
      ) : null}

      {listing.description ? (
        <Text size="sm" maw="70ch">
          {listing.description}
        </Text>
      ) : null}

      <AppViewRail.Group>
        <AppViewRail.Fact label={t`Organization`}>
          {listing.externalOrganizationName}
        </AppViewRail.Fact>
        {listing.externalServiceName ? (
          <AppViewRail.Fact label={t`Service`}>
            {listing.externalServiceName}
          </AppViewRail.Fact>
        ) : null}
        <AppViewRail.Fact label={t`Pipeline`}>
          <Trans>
            {listing.pipelineName} · run {listing.pipelineRunId}
          </Trans>
        </AppViewRail.Fact>
        {listing.license ? (
          <AppViewRail.Fact label={t`License`}>
            {listing.license}
          </AppViewRail.Fact>
        ) : null}
        {listing.updateFrequency ? (
          <AppViewRail.Fact label={t`Updates`}>
            {listing.updateFrequency}
          </AppViewRail.Fact>
        ) : null}
        {listing.sourceUrl ? (
          <AppViewRail.Fact label={t`Source`}>
            <Anchor href={listing.sourceUrl} size="xs" target="_blank">
              {listing.sourceUrl}
            </Anchor>
          </AppViewRail.Fact>
        ) : null}
        {listing.canonicalUrls && listing.canonicalUrls.length > 0 ? (
          <AppViewRail.Fact label={t`Canonical`}>
            <Stack gap={2}>
              {listing.canonicalUrls.map((url) => {
                return (
                  <Anchor key={url} href={url} size="xs" target="_blank">
                    {url}
                  </Anchor>
                );
              })}
            </Stack>
          </AppViewRail.Fact>
        ) : null}
        {listing.notes ? (
          <AppViewRail.Fact label={t`Notes`}>{listing.notes}</AppViewRail.Fact>
        ) : null}
      </AppViewRail.Group>

      <DataCatalogListingColumns
        columns={columns}
        columnTypeState={columnTypeState}
      />

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
                    ? css.dataCatalogListingDetailChevronOpen
                    : css.dataCatalogListingDetailChevronClosed
                }
              />
            }
            aria-expanded={isRawMetadataOpen}
            onClick={rawMetadata.toggle}
          >
            <Trans>Raw metadata</Trans>
          </Button>
          <Collapse expanded={isRawMetadataOpen} w="100%">
            <Text
              component="pre"
              size="xs"
              className={css.dataCatalogListingDetailRawMetadata}
            >
              {metadataJson}
            </Text>
          </Collapse>
        </Stack>
      ) : null}
    </Stack>
  );
}
