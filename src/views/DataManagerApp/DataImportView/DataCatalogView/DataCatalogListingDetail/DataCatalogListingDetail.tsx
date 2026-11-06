import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Button, Collapse, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowLeft, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import {
  getCatalogListingFormat,
  getCatalogListingUpdatedDate,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogInvalidNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogInvalidNotice/DataCatalogInvalidNotice";
import { DataCatalogListingColumns } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail.module.css";
import { DataCatalogUnsupportedNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogUnsupportedNotice/DataCatalogUnsupportedNotice";
import { formatCatalogListingDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/formatCatalogListingDate";
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
  /**
   * Returns to the results. The button is only shown where the detail
   * replaces the list instead of sitting beside it, which the stylesheet
   * decides.
   */
  onBack: () => void;
};

/** The listing's coverage as a date range, or undefined when it has none. */
function _formatCoverage(
  listing: Readonly<DataCatalogListingRead>,
): string | undefined {
  const dates = [listing.coverageStartDate, listing.coverageEndDate]
    .filter((isoDate) => {
      return isoDate !== undefined;
    })
    .map((isoDate) => {
      return formatCatalogListingDate(new Date(isoDate));
    });
  return dates.length === 0 ? undefined : dates.join(" – ");
}

/**
 * Everything the catalog knows about one listing, and the one action on it.
 *
 * The add action sits in a foot that never scrolls, so it stays in reach
 * however long the column list runs. Columns come before provenance because
 * for most listings they are the most telling thing the catalog has.
 *
 * The provenance fields read as a labelled fact list rather than as nine
 * bold-heading-plus-paragraph pairs, which turns a page of short values into
 * a page of headings. There is exactly one add button: a primary action
 * offered twice makes a user check whether the two do the same thing. A
 * listing whose dataset cannot be loaded, or that is a kind of dataset a
 * workspace cannot hold yet, says so and cannot be added.
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
  onBack,
}: Props): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const [isRawMetadataOpen, rawMetadata] = useDisclosure(false);

  if (!listing) {
    return (
      <div className={css.dataCatalogListingDetailIdle}>
        <Text c="dimmed" ta="center" size="sm" maw="34ch">
          <Trans>
            Select a dataset to see its columns, where it comes from, and how
            recently it changed.
          </Trans>
        </Text>
      </div>
    );
  }

  const metadataJson =
    listing.metadata !== undefined
      ? JSON.stringify(listing.metadata, undefined, 2)
      : undefined;
  const isAddPending = isAdding || isWaitingForColumnTypes;
  const isAddBlocked =
    !listing.isWorkspaceLoadable ||
    listing.isInvalid ||
    !isAddAllowed ||
    isAddPending ||
    isLoadingColumnMetadata ||
    offline.isBlocked;
  const updatedDate = getCatalogListingUpdatedDate(listing);
  const coverage = _formatCoverage(listing);
  const summaryFacts = [
    listing.externalOrganizationName,
    getCatalogListingFormat(listing),
    updatedDate
      ? t`Updated ${formatCatalogListingDate(updatedDate)}`
      : undefined,
  ].filter(Boolean);

  return (
    <div className={css.dataCatalogListingDetail}>
      <Stack gap="md" className={css.dataCatalogListingDetailBody}>
        <Button
          variant="subtle"
          color="neutral"
          size="compact-sm"
          className={css.dataCatalogListingDetailBack}
          leftSection={
            <IconArrowLeft
              size={14}
              aria-hidden
              className={css.dataCatalogListingDetailBackIcon}
            />
          }
          onClick={onBack}
        >
          <Trans>All results</Trans>
        </Button>

        <Stack gap={4}>
          <Title order={3} size="h4" lineClamp={3}>
            {listing.displayName}
          </Title>
          <Text size="sm" c="dimmed">
            {summaryFacts.join(" · ")}
          </Text>
        </Stack>

        {!listing.isWorkspaceLoadable ? (
          <DataCatalogUnsupportedNotice
            serviceName={listing.externalOrganizationName}
            sourceUrl={listing.sourceUrl}
          />
        ) : null}

        {listing.isWorkspaceLoadable &&
        listing.isInvalid &&
        listing.invalidDatasetReason ? (
          <DataCatalogInvalidNotice
            serviceName={
              listing.externalServiceName ?? listing.externalOrganizationName
            }
            reason={listing.invalidDatasetReason}
          />
        ) : null}

        {listing.description ? (
          <Text size="sm" maw="70ch">
            {listing.description}
          </Text>
        ) : null}

        <DataCatalogListingColumns
          columns={columns}
          columnTypeState={columnTypeState}
        />

        <AppViewRail.Group>
          {listing.externalServiceName ? (
            <AppViewRail.Fact label={t`Service`}>
              {listing.externalServiceName}
            </AppViewRail.Fact>
          ) : null}
          {coverage ? (
            <AppViewRail.Fact label={t`Covers`}>{coverage}</AppViewRail.Fact>
          ) : null}
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
            <AppViewRail.Fact label={t`Original`}>
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
            <AppViewRail.Fact label={t`Notes`}>
              {listing.notes}
            </AppViewRail.Fact>
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

      <div className={css.dataCatalogListingDetailFoot}>
        {isWaitingForColumnTypes ? (
          <Text size="xs" c="dimmed" role="status">
            <Trans>
              Checking this dataset's columns first. It will be added to your
              workspace as soon as that finishes.
            </Trans>
          </Text>
        ) : null}
        {!isAddAllowed ? (
          <Text c="danger.8" size="xs">
            <Trans>
              You cannot add more datasets on your current plan. Upgrade to add
              this catalog dataset.
            </Trans>
          </Text>
        ) : null}
        <OfflineGated>
          <Button
            leftSection={<IconPlus size={16} />}
            loading={isAddPending || isLoadingColumnMetadata}
            data-disabled={isAddBlocked || undefined}
            aria-disabled={isAddBlocked}
            aria-label={t`Add dataset to workspace`}
            className={css.dataCatalogListingDetailAdd}
            onClick={offline.guard(onAddToWorkspace)}
          >
            <Trans>Add to workspace</Trans>
          </Button>
        </OfflineGated>
      </div>
    </div>
  );
}
