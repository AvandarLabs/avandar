import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  BoxProps,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { uuid } from "$/lib/uuid";
import { CatalogDatasetColumnClient } from "@/clients/catalog-entries/CatalogDatasetColumnClient";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { BetaBadge } from "@/components/badges/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/buttons/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/buildOpenDataDatasetColumnInputs";
import { OpenDataCatalogEntryDetail } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryDetail";
import { OpenDataCatalogEntryList } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryList";
import css from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogView.module.css";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = BoxProps & {
  /** When false, the add action is disabled (subscription limits). */
  isAddAllowed: boolean;

  /**
   * When set, this callback is invoked with the newly saved dataset after
   * a successful catalog-entry import.
   */
  onSaveSuccess?: (dataset: Dataset.T) => void;
};

/**
 * Browse the public open-data catalog, search entries, inspect metadata, and
 * add a catalog dataset to the current workspace.
 *
 * A search field over a two-pane browser, split by a hairline. The two panes
 * used to be bordered cards inside a bordered card inside the page's card,
 * which cost four edges and four paddings to say "these are two lists".
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

  const [catalogEntries = [], isLoadingCatalog] =
    OpenDataCatalogEntryClient.useGetAll({});

  const [catalogDatasetColumns = [], isLoadingCatalogColumns] =
    CatalogDatasetColumnClient.useGetAll({
      ...where("catalog_entry_id", "eq", selectedId),
      useQueryOptions: {
        enabled: selectedId !== undefined,
      },
    });

  const fuse = useMemo(() => {
    return new Fuse(catalogEntries, {
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
  }, [catalogEntries]);

  const displayedEntries = useMemo(() => {
    const query = debouncedSearch.trim();
    if (!query) {
      return catalogEntries;
    }
    return fuse.search(query).map((result) => {
      return result.item;
    });
  }, [catalogEntries, debouncedSearch, fuse]);

  const selectedEntry: OpenDataCatalogEntryRead | undefined = useMemo(() => {
    if (!selectedId) {
      return undefined;
    }
    return catalogEntries.find((entry) => {
      return entry.id === selectedId;
    });
  }, [catalogEntries, selectedId]);

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
    if (!selectedEntry) {
      return;
    }

    const columnInputs = resolveOpenDataDatasetColumnInputs({
      catalogColumns: catalogDatasetColumns,
      metadata: selectedEntry.metadata,
    });

    if (!columnInputs) {
      notifyError({
        title: t`Cannot add dataset`,
        message: t`This catalog entry has no column metadata. It cannot be imported yet.`,
      });
      return;
    }

    insertOpenDataDataset({
      catalogEntryId: selectedEntry.id,
      columns: columnInputs,
      datasetDescription: selectedEntry.description ?? "",
      datasetId: uuid(),
      datasetName: selectedEntry.displayName,
      workspaceId: workspace.id,
    });
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
          <div className={css.browser}>
            <div className={css.browserList}>
              <Text component="h4" className={css.browserListTitle}>
                <Trans>Catalog ({displayedEntries.length})</Trans>
              </Text>
              <OpenDataCatalogEntryList
                displayedEntries={displayedEntries}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            <div className={css.browserDetail}>
              <OpenDataCatalogEntryDetail
                entry={selectedEntry}
                isAddAllowed={isAddAllowed}
                isAdding={isInsertPending}
                isLoadingColumnMetadata={isLoadingCatalogColumns}
                onAddToWorkspace={onAddToWorkspace}
              />
            </div>
          </div>
        )}
      </Stack>
    </Box>
  );
}
