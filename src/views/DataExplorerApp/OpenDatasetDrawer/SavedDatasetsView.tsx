import { useMutation } from "@hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconSearch, IconTrash } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { where } from "@utils";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { dropPlanTempViews } from "@/components/ChatPanel/PlanStateManager/planExecutor";
import { rehydratePlan } from "@/components/ChatPanel/PlanStateManager/planRehydrate";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildSelectAllPreviewSQL } from "@/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL";
import css from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal.module.css";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { ChatPlan } from "$/types/chat.types";

type Props = {
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;
};

/**
 * Returns the localized label for a given dataset source type.
 */
function useSourceTypeLabels(): Record<DatasetSource.SourceType, string> {
  const { t } = useLingui();
  return {
    csv_file: t`CSV`,
    xlsx_file: t`Excel`,
    google_sheets: t`Google Sheets`,
    open_data: t`Open data`,
    virtual: t`Derived`,
  };
}

/**
 * Lists every saved dataset in the workspace. Opening a derived (virtual)
 * dataset runs its stored SQL; opening any other dataset runs
 * `SELECT * FROM "<datasetId>" LIMIT 100` so the user lands on the dataset's
 * raw rows in the Data Explorer canvas.
 */
export function SavedDatasetsView({ onOpen }: Props): JSX.Element {
  const { t } = useLingui();
  const sourceTypeLabels = useSourceTypeLabels();
  const workspace = useCurrentWorkspace();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const [selectedDatasetId, setSelectedDatasetId] = useState<DatasetId | null>(
    null,
  );
  const planDispatch = PlanStateManager.useDispatch();
  const planState = PlanStateManager.useState();

  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: true },
  });

  const filtered = useMemo(() => {
    return (datasets ?? []).filter((dataset) => {
      if (!debouncedSearch) {
        return true;
      }
      return dataset.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    });
  }, [datasets, debouncedSearch]);

  const selectedDataset = useMemo(() => {
    if (!selectedDatasetId) {
      return null;
    }
    return filtered.find((dataset) => {
      return dataset.id === selectedDatasetId;
    });
  }, [filtered, selectedDatasetId]);

  useEffect(() => {
    if (
      selectedDatasetId !== null &&
      !filtered.some((dataset) => {
        return dataset.id === selectedDatasetId;
      })
    ) {
      setSelectedDatasetId(null);
    }
  }, [filtered, selectedDatasetId]);

  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset deleted.`);
    },
    onError: (error) => {
      notifyError(t`Failed to delete dataset: ${error.message}`);
    },
  });

  const [loadVirtualDataset, isLoadingVirtualDataset] = useMutation({
    mutationFn: async (dataset: Dataset.T) => {
      const virtualDataset = await VirtualDatasetClient.getOne(
        where("dataset_id", "eq", dataset.id),
      );
      if (!virtualDataset) {
        throw new Error(t`Could not load the dataset's SQL query.`);
      }
      return { dataset, virtualDataset };
    },
    onSuccess: async ({
      dataset,
      virtualDataset,
    }: {
      dataset: Dataset.T;
      virtualDataset: VirtualDataset.T;
    }) => {
      onOpen(
        {
          datasetId: dataset.id,
          name: dataset.name,
          sourceType: "virtual",
          virtualDatasetId: virtualDataset.id,
        },
        virtualDataset.rawSQL,
      );

      if (virtualDataset.planSteps) {
        if (planState.nodes.length > 0) {
          void dropPlanTempViews({
            planId: planState.planId ?? undefined,
            nodes: planState.nodes,
          });
        }
        const planId = `vdataset_${virtualDataset.id}`;
        await rehydratePlan({
          planId,
          plan: virtualDataset.planSteps as ChatPlan,
          dispatch: planDispatch,
        });
      }
    },
    onError: (error: Error) => {
      notifyError(error.message);
    },
  });

  const openAsRawPreview = (dataset: Dataset.T) => {
    onOpen(
      {
        datasetId: dataset.id,
        name: dataset.name,
        sourceType: dataset.sourceType,
      },
      buildSelectAllPreviewSQL(dataset.id),
    );
  };

  const onOpenSelected = () => {
    if (!selectedDataset) {
      return;
    }
    match(selectedDataset.sourceType)
      .with("virtual", () => {
        loadVirtualDataset(selectedDataset);
      })
      .with("csv_file", "xlsx_file", "google_sheets", "open_data", () => {
        openAsRawPreview(selectedDataset);
      })
      .exhaustive();
  };

  const onDeleteClick = (dataset: Dataset.T) => {
    modals.openConfirmModal({
      title: t`Delete dataset`,
      children: (
        <Text size="sm">
          <Trans>
            Are you sure you want to permanently delete{" "}
            <strong>{dataset.name}</strong>? This cannot be undone.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Delete`, cancel: t`Cancel` },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteDataset({ id: dataset.id });
        if (selectedDatasetId === dataset.id) {
          setSelectedDatasetId(null);
        }
      },
    });
  };

  const isBusy = isLoadingVirtualDataset || isDeletingDataset;

  return (
    <div className={css.savedPanel}>
      <TextInput
        placeholder={t`Search datasets...`}
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
        }}
      />

      {isLoadingDatasets ?
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      : filtered.length === 0 ?
        <Text c="dimmed" size="sm" className={css.emptyState}>
          <Trans>No saved datasets found.</Trans>
        </Text>
      : <div role="listbox" aria-label={t`Saved datasets`} className={css.list}>
          {filtered.map((dataset) => {
            const isSelected = dataset.id === selectedDatasetId;
            return (
              <UnstyledButton
                key={dataset.id}
                role="option"
                aria-selected={isSelected}
                className={clsx(css.row, isSelected ? css.rowSelected : null)}
                onClick={() => {
                  setSelectedDatasetId(dataset.id);
                }}
              >
                <Text size="sm" className={css.rowName}>
                  {dataset.name}
                </Text>
                <Badge
                  color="neutral"
                  variant="light"
                  size="sm"
                  className={css.rowType}
                >
                  {sourceTypeLabels[dataset.sourceType] ?? dataset.sourceType}
                </Badge>
                <ActionIcon
                  size="md"
                  variant="subtle"
                  color="red"
                  className={css.rowDelete}
                  disabled={isBusy}
                  aria-label={t`Delete ${dataset.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteClick(dataset);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </UnstyledButton>
            );
          })}
        </div>
      }

      {selectedDataset ?
        <Group className={css.footer} justify="flex-end">
          <Button loading={isBusy} onClick={onOpenSelected}>
            <Trans>Open {selectedDataset.name}</Trans>
          </Button>
        </Group>
      : null}
    </div>
  );
}
