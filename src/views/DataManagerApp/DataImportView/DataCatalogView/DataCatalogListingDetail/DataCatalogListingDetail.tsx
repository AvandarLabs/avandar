import { ActionIcon } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Spoiler, Stack, Text, Title } from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowsMaximize,
  IconPlus,
} from "@tabler/icons-react";
import clsx from "clsx";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { DatasetPreviewSection } from "@/components/DatasetPreviewSection/DatasetPreviewSection";
import { AppViewRail } from "@/components/layouts/AppView/AppViewRail/AppViewRail";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { useOfflineGate } from "@/lib/hooks/browser/useOfflineGate/useOfflineGate";
import { buildOrganizationLine } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOrganizationLine/buildOrganizationLine";
import { getCatalogListingUpdatedDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/catalogListingFilters/catalogListingFilters";
import { DataCatalogInvalidNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogInvalidNotice/DataCatalogInvalidNotice";
import { DataCatalogListingColumns } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import { DataCatalogAboutGroup } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogAboutGroup";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail.module.css";
import { DataCatalogPublishedByGroup } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogPublishedByGroup";
import { DataCatalogSourceGroup } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogSourceGroup";
import { DataCatalogTechnicalDetails } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogTechnicalDetails";
import { DataCatalogUnsupportedNotice } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogUnsupportedNotice/DataCatalogUnsupportedNotice";
import { formatCatalogListingDate } from "@/views/DataManagerApp/DataImportView/DataCatalogView/formatCatalogListingDate";
import type { DataCatalogDrive } from "$/models/data-catalog-listings/DataCatalogDrive/DataCatalogDrive";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { ColumnTypeState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";
import type { CatalogListingPreviewState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/useCatalogListingPreview/useCatalogListingPreview";
import { useMemo, type ReactNode } from "react";

/**
 * How tall the description runs before "Show more": about six lines of
 * small text, enough to read what a dataset is without pushing its facts
 * below the fold.
 */
const DESCRIPTION_MAX_HEIGHT = 130;

/**
 * The preview grid's height in the narrow pane: tall enough for a dozen rows
 * without burying the facts below it. Full screen gives it the default.
 */
const PANE_PREVIEW_GRID_HEIGHT = 360;

type Props = {
  /** Selected catalog listing, or none when nothing is selected. */
  listing: DataCatalogListingRead | undefined;
  /**
   * The drive the selected listing came from, which names its organization
   * levels. Undefined while it loads or when the listing has no drive.
   */
  drive: DataCatalogDrive.T | undefined;
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
  /** Narrows the catalog to one of the listing's topics. */
  onSelectTopic: (domain: string) => void;
  /** Narrows the catalog to one of the listing's keywords. */
  onAddKeyword: (tag: string) => void;
  /** The first rows of the listing's data. */
  preview: CatalogListingPreviewState;
  /**
   * True when the detail fills the full-screen modal: the facts move into a
   * rail beside the content, and the modal's header carries the title.
   */
  isExpanded?: boolean;
  /**
   * Opens the detail in full screen. The expand button is shown only when
   * this is set and the detail is not already expanded.
   */
  onExpand?: () => void;
};

/**
 * The listing's description. In the pane it folds after a few lines so the
 * facts stay above the fold. Full screen has the room to show all of it.
 */
function ListingDescription({
  description,
  isExpanded,
}: {
  description: string;
  isExpanded: boolean;
}): ReactNode {
  const { t } = useLingui();
  const text = (
    <Text size="sm" className={css.dataCatalogListingDetailDescription}>
      {description}
    </Text>
  );
  if (isExpanded) {
    return <Stack maw="70ch">{text}</Stack>;
  }
  return (
    <Spoiler
      maxHeight={DESCRIPTION_MAX_HEIGHT}
      showLabel={t`Show more`}
      hideLabel={t`Show less`}
      maw="70ch"
      classNames={{ control: css.dataCatalogListingDetailSpoilerControl }}
    >
      {text}
    </Spoiler>
  );
}

/**
 * Everything the catalog knows about one listing, and the one action on it.
 *
 * The add action sits in a foot that never scrolls, so it stays in reach
 * however long the column list runs.
 *
 * Values a user scans sit in the line under the title. Anything that needs a
 * label sits in a labelled fact group (who published it, what it is about,
 * where it comes from), each left out when it has nothing to show, rather
 * than as bold-heading-plus-paragraph pairs that turn a page of short values
 * into a page of headings. How the catalog indexed the listing is reference
 * only an expert reads, so it waits behind a disclosure at the end.
 *
 * Under the columns sits a preview of the listing's first rows, read without
 * adding it to the workspace. The pane is narrow, so the expand button opens
 * the same detail in a full-screen modal, where the facts move into a rail
 * beside the description, columns, and preview.
 *
 * There is exactly one add button: a primary action offered twice makes a
 * user check whether the two do the same thing. A listing whose dataset
 * cannot be loaded, or that is a kind of dataset a workspace cannot hold
 * yet, says so and cannot be added.
 */
export function DataCatalogListingDetail({
  listing,
  columns,
  columnTypeState,
  isAddAllowed,
  isAdding,
  isWaitingForColumnTypes,
  isLoadingColumnMetadata,
  drive,
  onAddToWorkspace,
  onBack,
  onSelectTopic,
  onAddKeyword,
  preview,
  isExpanded = false,
  onExpand,
}: Props): ReactNode {
  const { t } = useLingui();
  const offline = useOfflineGate();
  const dateColumnNames = useMemo(() => {
    return _dateColumnNamesForGrid(preview.preview?.dateColumnNames);
  }, [preview.preview?.dateColumnNames]);

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

  const isAddPending = isAdding || isWaitingForColumnTypes;
  const isAddBlocked =
    !listing.isWorkspaceLoadable ||
    listing.isInvalid ||
    !isAddAllowed ||
    isAddPending ||
    isLoadingColumnMetadata ||
    offline.isBlocked;
  const updatedDate = getCatalogListingUpdatedDate(listing);
  const summaryFacts = [
    buildOrganizationLine(listing),
    updatedDate
      ? t`Updated ${formatCatalogListingDate(updatedDate)}`
      : undefined,
  ].filter(Boolean);

  const factsRail = (
    <AppViewRail>
      <DataCatalogPublishedByGroup listing={listing} drive={drive} />
      <DataCatalogAboutGroup
        listing={listing}
        onSelectTopic={onSelectTopic}
        onAddKeyword={onAddKeyword}
      />
      <DataCatalogSourceGroup listing={listing} />
    </AppViewRail>
  );

  return (
    <div className={css.dataCatalogListingDetail}>
      {/*
       * Keyed by listing so another listing opens scrolled to the top, with
       * its description, keywords, and technical details folded again.
       */}
      <Stack
        key={listing.id}
        gap="md"
        className={css.dataCatalogListingDetailBody}
      >
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

        <Group gap="sm" align="flex-start" wrap="nowrap">
          <Stack gap={4} flex={1} miw={0}>
            {isExpanded ? null : (
              <Title order={3} size="h4" lineClamp={3}>
                {listing.displayName}
              </Title>
            )}
            <Text size="sm" c="dimmed">
              {summaryFacts.join(" · ")}
            </Text>
          </Stack>
          {onExpand && !isExpanded ? (
            <ActionIcon
              variant="subtle"
              color="neutral"
              tooltip={t`Open in full screen`}
              aria-label={t`Open in full screen`}
              onClick={onExpand}
            >
              <IconArrowsMaximize size={16} aria-hidden />
            </ActionIcon>
          ) : null}
        </Group>

        {!listing.isWorkspaceLoadable ? (
          <DataCatalogUnsupportedNotice
            serviceName={listing.organization1Name}
            sourceUrl={listing.sourceUrl}
          />
        ) : null}

        {listing.isWorkspaceLoadable &&
        listing.isInvalid &&
        listing.invalidDatasetReason ? (
          <DataCatalogInvalidNotice
            serviceName={
              listing.externalServiceName ?? listing.organization1Name
            }
            reason={listing.invalidDatasetReason}
          />
        ) : null}

        <div
          className={clsx(
            css.dataCatalogListingDetailLayout,
            isExpanded && css.dataCatalogListingDetailLayoutIsExpanded,
          )}
        >
          <Stack
            gap={isExpanded ? "xl" : "md"}
            className={css.dataCatalogListingDetailMain}
          >
            {listing.description ? (
              <ListingDescription
                description={listing.description}
                isExpanded={isExpanded}
              />
            ) : null}

            {isExpanded ? null : factsRail}

            <DataCatalogListingColumns
              columns={columns}
              columnTypeState={columnTypeState}
            />

            {preview.isAvailable ? (
              <DatasetPreviewSection
                columnNames={preview.preview?.columnNames ?? []}
                rows={preview.preview?.rows}
                maxPreviewRows={GlobalAppConfig.dataManagerApp.maxPreviewRows}
                dateColumnNames={dateColumnNames}
                isLoading={preview.isLoading}
                isError={preview.isError}
                gridHeight={isExpanded ? undefined : PANE_PREVIEW_GRID_HEIGHT}
              />
            ) : null}

            <DataCatalogTechnicalDetails listing={listing} />
          </Stack>
          {isExpanded ? (
            <aside className={css.dataCatalogListingDetailRail}>
              {factsRail}
            </aside>
          ) : null}
        </div>
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

/**
 * The date columns the preview grid should format. A list becomes the set
 * the grid queries. Anything else, including a preview restored from a cache
 * that stored a Set as JSON, counts as no date columns, so the grid still
 * renders.
 */
function _dateColumnNamesForGrid(
  dateColumnNames: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (!Array.isArray(dateColumnNames)) {
    return undefined;
  }
  return new Set(dateColumnNames);
}
