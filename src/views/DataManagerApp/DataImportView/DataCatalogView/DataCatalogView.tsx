import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Group,
  Button,
  Loader,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch, IconWorldSearch } from "@tabler/icons-react";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { uuid } from "$/lib/uuid";
import { DataCatalogListingClient } from "@/clients/data-catalog-listings/DataCatalogListingClient";
import { DataCatalogRelationColumnClient } from "@/clients/data-catalog-listings/DataCatalogRelationColumnClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { BetaBadge } from "@/components/badges/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnTypeVerifications } from "@/lib/openData/ColumnTypeVerifications";
import { isColumnTypeVerificationDue } from "@/lib/openData/verifyOpenDataColumnTypes/verifyOpenDataColumnTypes";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/DataCatalogView/buildOpenDataDatasetColumnInputs";
import { DataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingDetail/DataCatalogListingDetail";
import { DataCatalogListingList } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingList/DataCatalogListingList";
import css from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogView.module.css";
import { readCatalogColumnsForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/readCatalogColumnsForAdding/readCatalogColumnsForAdding";
import {
  useColumnTypeVerificationStatus,
  useVerifyColumnTypesOnDwell,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/useVerifyColumnTypesOnDwell/useVerifyColumnTypesOnDwell";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogListingRead } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing.types";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ColumnTypeState } from "@/views/DataManagerApp/DataImportView/DataCatalogView/DataCatalogListingColumns/DataCatalogListingColumns";

/**
 * Whether the open listing's column types are known: `checking` while they
 * are unverified or stale and not known to have failed, `failed` when the
 * last verification on this page failed, otherwise `verified`.
 */
function _toColumnTypeState(
  listing: DataCatalogListingRead | undefined,
  status: ReturnType<typeof useColumnTypeVerificationStatus>,
): ColumnTypeState {
  if (status === "verifying") {
    return "checking";
  }
  if (listing === undefined || !isColumnTypeVerificationDue(listing)) {
    return "verified";
  }
  return status === "failed" ? "failed" : "checking";
}

type Props = BoxProps & {
  /** When false, the add action is disabled (subscription limits). */
  isAddAllowed: boolean;

  /**
   * When set, this callback is invoked with the newly saved dataset after
   * a successful catalog-listing import.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

/**
 * Browse the public open-data catalog, search listings, inspect metadata, and
 * add a catalog dataset to the current workspace.
 *
 * A search field over a two-pane browser, split by a hairline. The panes are
 * regions of one surface rather than bordered cards: nesting cards costs four
 * edges and four paddings to say "these are two lists".
 */
export function DataCatalogView({
  isAddAllowed,
  onSaveSuccess,
  ...boxProps
}: Props): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 150);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const [catalogListings = [], isLoadingCatalog] =
    DataCatalogListingClient.useGetAll({});

  const [catalogListingColumns = [], isLoadingCatalogColumns] =
    DataCatalogRelationColumnClient.useGetAll({
      ...where("catalog_listing_id", "eq", selectedId),
      useQueryOptions: {
        enabled: selectedId !== undefined,
      },
    });

  const fuse = useMemo(() => {
    return new Fuse(catalogListings, {
      ignoreLocation: true,
      keys: [
        { name: "displayName", weight: 2 },
        "description",
        "externalOrganizationName",
        "pipelineName",
        "externalServiceName",
        "notes",
      ],
      threshold: 0.35,
    });
  }, [catalogListings]);

  const displayedListings = useMemo(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      return catalogListings;
    }
    return fuse.search(query).map((result) => {
      return result.item;
    });
  }, [catalogListings, debouncedSearch, fuse]);

  const selectedListing: DataCatalogListingRead | undefined = useMemo(() => {
    if (!selectedId) {
      return undefined;
    }
    return catalogListings.find((listing) => {
      return listing.id === selectedId;
    });
  }, [catalogListings, selectedId]);

  useVerifyColumnTypesOnDwell({
    listing: selectedListing,
    coordinator: ColumnTypeVerifications,
  });
  const columnTypeVerificationStatus = useColumnTypeVerificationStatus({
    catalogListingId: selectedListing?.id,
    coordinator: ColumnTypeVerifications,
  });
  // The listing whose "Add to workspace" is waiting for its column types to
  // be verified before it saves.
  const [waitingToAddListingId, setWaitingToAddListingId] = useState<
    DataCatalogListing.Id | undefined
  >();

  const [insertOpenDataDataset, isInsertPending] =
    DatasetClient.useInsertOpenDataDataset({
      onSuccess: (dataset) => {
        notifySuccess({
          title: t`Dataset added`,
          message: t`"${dataset.name}" is now in your workspace.`,
        });
        onSaveSuccess?.(dataset);
      },
      queriesToInvalidate: [DatasetClient.QueryKeys.getAll()],
    });

  async function _readColumnsForAdding(
    listing: DataCatalogListingRead,
  ): Promise<readonly DataCatalogRelationColumn.T[] | undefined> {
    setWaitingToAddListingId(listing.id);
    try {
      return await readCatalogColumnsForAdding({
        listing,
        coordinator: ColumnTypeVerifications,
        readColumns: (catalogListingId) => {
          return DataCatalogRelationColumnClient.getAll(
            where("catalog_listing_id", "eq", catalogListingId),
          );
        },
      });
    } catch (error) {
      Logger.warn("Could not verify a catalog listing's columns to add it", {
        catalogListingId: listing.id,
        error,
      });
      notifyError({
        title: t`Cannot add dataset yet`,
        message: t`We couldn't check this dataset's columns. Try adding it again.`,
      });
      return undefined;
    } finally {
      setWaitingToAddListingId(undefined);
    }
  }

  async function onAddToWorkspace(): Promise<void> {
    if (!selectedListing) {
      return;
    }
    const listing = selectedListing;
    const columns = await _readColumnsForAdding(listing);
    if (columns === undefined) {
      return;
    }
    const columnInputs = resolveOpenDataDatasetColumnInputs({
      catalogColumns: [...columns],
      metadata: listing.metadata,
    });
    if (!columnInputs) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`This catalog listing has no column metadata. It cannot be imported yet.`,
      });
      return;
    }
    insertOpenDataDataset({
      catalogListingId: listing.id,
      columns: columnInputs,
      datasetDescription: listing.description ?? "",
      datasetId: uuid(),
      datasetName: listing.displayName,
      workspaceId: workspace.id,
    });
  }

  const requestDatasetButton = (
    <Button
      variant="default"
      onClick={() => {
        openFeaturebaseFeedbackWidget({
          boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
        });
      }}
    >
      <Trans>Request a dataset</Trans>
    </Button>
  );

  // Nothing published yet. The search field and the two-pane browser are both
  // affordances for choosing among things, so with nothing to choose they are
  // dead chrome: a box that can only ever answer "no results" and a pane that
  // asks the user to pick from an empty list. The activation state replaces
  // all of it and carries the one move that does something, which is telling
  // us what to publish next. Same rule the no-datasets route follows.
  if (!isLoadingCatalog && catalogListings.length === 0) {
    return (
      <Box {...boxProps}>
        <AppSlateEmptyState
          icon={<IconWorldSearch size={32} stroke={1.5} aria-hidden />}
          title={t`Nothing in the catalog yet`}
          message={
            <Trans>
              Avandar prepares public datasets and publishes them here. The
              catalog grows from what people ask for, so tell us which one you
              need.
            </Trans>
          }
          action={requestDatasetButton}
        />
      </Box>
    );
  }

  return (
    <Box {...boxProps}>
      <Stack gap="sm">
        <TextInput
          aria-label={t`Search open data catalog`}
          leftSection={<IconSearch size={16} stroke={1.6} />}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
          }}
          placeholder={t`Search by name, organization, pipeline…`}
          value={search}
        />

        <Text size="xs" c="dimmed" maw="70ch">
          <Trans>
            The catalog is still in{" "}
            <BetaBadge
              size="xs"
              style={{ verticalAlign: "text-bottom" }}
              withTooltip={false}
            />{" "}
            and grows as people tell us what they need. Missing a dataset?{" "}
            <UnstyledButton
              type="button"
              aria-label={t`Tell us which open dataset you want via feedback`}
              display="inline"
              p={0}
              h="auto"
              td="underline"
              c="primary"
              fz="xs"
              fw={500}
              style={{ verticalAlign: "baseline" }}
              onClick={() => {
                openFeaturebaseFeedbackWidget({
                  boardName: FEATUREBASE_FEATURE_REQUEST_BOARD,
                });
              }}
            >
              tell us
            </UnstyledButton>
            .
          </Trans>
        </Text>

        {isLoadingCatalog ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <div className={css.dataCatalogViewBrowser}>
            {displayedListings.length === 0 ? (
              /*
               * The catalog has listings; this query matched none of them. One
               * message spanning the frame rather than a "no matches" note in
               * the list beside a "pick one on the left" note in the detail:
               * the second cannot be acted on, and two apologies for one
               * situation read as two situations.
               */
              <div className={css.dataCatalogViewBrowserEmpty}>
                <Text size="sm" c="dimmed" ta="center" maw="42ch">
                  <Trans>
                    No catalog dataset matches “{debouncedSearch.trim()}”.
                  </Trans>
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => {
                    setSearch("");
                  }}
                >
                  <Trans>Clear search</Trans>
                </Button>
              </div>
            ) : (
              <>
                <div className={css.dataCatalogViewBrowserList}>
                  <Text
                    component="h4"
                    className={css.dataCatalogViewBrowserListTitle}
                  >
                    <Trans>Catalog ({displayedListings.length})</Trans>
                  </Text>
                  <DataCatalogListingList
                    displayedListings={displayedListings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>

                <div className={css.dataCatalogViewBrowserDetail}>
                  <DataCatalogListingDetail
                    listing={selectedListing}
                    columns={catalogListingColumns}
                    columnTypeState={_toColumnTypeState(
                      selectedListing,
                      columnTypeVerificationStatus,
                    )}
                    isAddAllowed={isAddAllowed}
                    isAdding={isInsertPending}
                    isWaitingForColumnTypes={
                      waitingToAddListingId !== undefined &&
                      waitingToAddListingId === selectedListing?.id
                    }
                    isLoadingColumnMetadata={isLoadingCatalogColumns}
                    onAddToWorkspace={() => {
                      void onAddToWorkspace();
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Stack>
    </Box>
  );
}
