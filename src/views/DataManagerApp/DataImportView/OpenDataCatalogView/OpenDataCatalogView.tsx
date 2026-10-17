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
import { CatalogListingColumnClient } from "@/clients/catalog-listings/CatalogListingColumnClient";
import { OpenDataCatalogListingClient } from "@/clients/catalog-listings/OpenDataCatalogListingClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { BetaBadge } from "@/components/badges/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/buildOpenDataDatasetColumnInputs";
import { OpenDataCatalogListingDetail } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogListingDetail/OpenDataCatalogListingDetail";
import { OpenDataCatalogListingList } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogListingList/OpenDataCatalogListingList";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogView.module.css";
import type { OpenDataCatalogListingRead } from "$/models/catalog-listings/OpenDataCatalogListing/OpenDataCatalogListing.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

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
export function OpenDataCatalogView({
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
    OpenDataCatalogListingClient.useGetAll({});

  const [catalogListingColumns = [], isLoadingCatalogColumns] =
    CatalogListingColumnClient.useGetAll({
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

  const selectedListing: OpenDataCatalogListingRead | undefined = useMemo(
    () => {
    if (!selectedId) {
      return undefined;
    }
    return catalogListings.find((listing) => {
      return listing.id === selectedId;
    });
  }, [catalogListings, selectedId]);

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

  function onAddToWorkspace(): void {
    if (!selectedListing) {
      return;
    }

    const columnInputs = resolveOpenDataDatasetColumnInputs({
      catalogColumns: catalogListingColumns,
      metadata: selectedListing.metadata,
    });

    if (!columnInputs) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`This catalog listing has no column metadata. It cannot be imported yet.`,
      });
      return;
    }

    insertOpenDataDataset({
      catalogListingId: selectedListing.id,
      columns: columnInputs,
      datasetDescription: selectedListing.description ?? "",
      datasetId: uuid(),
      datasetName: selectedListing.displayName,
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
          <div className={css.openDataCatalogViewBrowser}>
            {displayedListings.length === 0 ? (
              /*
               * The catalog has listings; this query matched none of them. One
               * message spanning the frame rather than a "no matches" note in
               * the list beside a "pick one on the left" note in the detail:
               * the second cannot be acted on, and two apologies for one
               * situation read as two situations.
               */
              <div className={css.openDataCatalogViewBrowserEmpty}>
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
                <div className={css.openDataCatalogViewBrowserList}>
                  <Text
                    component="h4"
                    className={css.openDataCatalogViewBrowserListTitle}
                  >
                    <Trans>Catalog ({displayedListings.length})</Trans>
                  </Text>
                  <OpenDataCatalogListingList
                    displayedListings={displayedListings}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>

                <div className={css.openDataCatalogViewBrowserDetail}>
                  <OpenDataCatalogListingDetail
                    listing={selectedListing}
                    isAddAllowed={isAddAllowed}
                    isAdding={isInsertPending}
                    isLoadingColumnMetadata={isLoadingCatalogColumns}
                    onAddToWorkspace={onAddToWorkspace}
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
