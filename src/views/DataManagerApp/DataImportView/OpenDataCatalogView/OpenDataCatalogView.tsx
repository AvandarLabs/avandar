import {
  Box,
  BoxProps,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui/notifications/notify";
import { where } from "@utils/filters/where/where";
import { uuid } from "$/lib/uuid";
import Fuse from "fuse.js";
import { useMemo, useState } from "react";
import { CatalogDatasetColumnClient } from "@/clients/catalog-entries/CatalogDatasetColumnClient";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { BetaBadge } from "@/components/common/BetaBadge/BetaBadge";
import {
  FEATUREBASE_FEATURE_REQUEST_BOARD,
  openFeaturebaseFeedbackWidget,
} from "@/components/FeedbackButton/openFeaturebaseFeedbackWidget";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Callout } from "@/lib/ui/Callout";
import { resolveOpenDataDatasetColumnInputs } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/buildOpenDataDatasetColumnInputs";
import { OpenDataCatalogEntryDetail } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryDetail";
import { OpenDataCatalogEntryList } from "@/views/DataManagerApp/DataImportView/OpenDataCatalogView/OpenDataCatalogEntryList";
import type { OpenDataCatalogEntryRead } from "$/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntry.types";

type Props = BoxProps & {
  /** When false, the add action is disabled (subscription limits). */
  isAddAllowed: boolean;
};

/**
 * Browse the public open-data catalog, search entries, inspect metadata, and
 * add a catalog dataset to the current workspace.
 */
export function OpenDataCatalogView({
  isAddAllowed,
  ...boxProps
}: Props): JSX.Element {
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
    const q = debouncedSearch.trim();
    if (!q) {
      return catalogEntries;
    }
    return fuse.search(q).map((result) => {
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
          title: "Dataset added",
          message: `"${dataset.name}" is now in your workspace.`,
        });
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
        title: "Cannot add dataset",
        message:
          "This catalog entry has no column metadata. It cannot be imported " +
          "yet.",
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
      <Stack gap="md">
        <Text>
          Search the data catalog to add open datasets to your workspace.
        </Text>

        <Callout color="warning" messageSize="sm">
          <Text component="div" size="sm">
            The public open data catalog is still in{" "}
            <BetaBadge
              size="xs"
              style={{ verticalAlign: "text-bottom" }}
              withTooltip={false}
            />
            <br />
            We are adding more open datasets as users tell us which datasets
            they want in Avandar. If there is a dataset you would like to see
            here,{" "}
            <UnstyledButton
              type="button"
              aria-label="Tell us which open dataset you want via feedback"
              display="inline"
              p={0}
              h="auto"
              td="underline"
              c="primary"
              fz="sm"
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
            !
          </Text>
        </Callout>

        <TextInput
          aria-label="Search open data catalog"
          leftSection={<IconSearch size={18} />}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
          }}
          placeholder="Search by name, organization, pipeline…"
          value={search}
        />
        {isLoadingCatalog ?
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        : <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Paper p="md" withBorder shadow="none">
              <Stack gap={6}>
                <Text fw={600} size="sm">
                  Catalog ({displayedEntries.length})
                </Text>

                <OpenDataCatalogEntryList
                  displayedEntries={displayedEntries}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </Stack>
            </Paper>

            <Paper p="md" withBorder shadow="none">
              <OpenDataCatalogEntryDetail
                entry={selectedEntry}
                isAddAllowed={isAddAllowed}
                isAdding={isInsertPending}
                isLoadingColumnMetadata={isLoadingCatalogColumns}
                onAddToWorkspace={onAddToWorkspace}
              />
            </Paper>
          </SimpleGrid>
        }
      </Stack>
    </Box>
  );
}
