import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Center,
  Group,
  Loader,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PickDatasetsTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { CrosswalkContext } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  draft: CrosswalkDraft.T;
  context: CrosswalkContext;
  isCatalogLoading: boolean;
  /** Called with the newly picked datasets only. */
  onAdd: (datasetIds: readonly Dataset.Id[]) => void;
  onClose: () => void;
};

/**
 * The workspace's datasets the crosswalk can add, by name: those in the
 * catalog (the reducer reads their columns), except the crosswalk's own
 * combined dataset, which would read itself.
 */
function useAddableDatasets(
  options: Readonly<{
    isOpen: boolean;
    context: CrosswalkContext;
    outputDatasetId: Dataset.Id | undefined;
  }>,
): { datasets: Dataset.T[]; isLoading: boolean } {
  const workspace = useCurrentWorkspace();
  const [datasets, isLoading] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: options.isOpen },
  });
  const { context, outputDatasetId } = options;
  const addable = useMemo(() => {
    return (datasets ?? [])
      .filter((dataset) => {
        return (
          context.datasetsById.has(dataset.id) && dataset.id !== outputDatasetId
        );
      })
      .sort((datasetA, datasetB) => {
        return datasetA.name.localeCompare(datasetB.name);
      });
  }, [datasets, context.datasetsById, outputDatasetId]);
  return { datasets: addable, isLoading };
}

/** Each dataset's column count, from the catalog. */
function useColumnCounts(
  datasets: readonly Dataset.T[],
  context: CrosswalkContext,
): ReadonlyMap<Dataset.Id, number> {
  return useMemo(() => {
    return new Map(
      datasets.map((dataset) => {
        const columns = context.datasetsById.get(dataset.id)?.columns ?? [];
        return [dataset.id, columns.length] as const;
      }),
    );
  }, [datasets, context.datasetsById]);
}

/** The newly picked dataset ids, with a toggle and a reset. */
function usePickedIds(): {
  pickedIds: readonly Dataset.Id[];
  toggle: (datasetId: Dataset.Id) => void;
  reset: () => void;
} {
  const [pickedIds, setPickedIds] = useState<readonly Dataset.Id[]>([]);
  const toggle = (datasetId: Dataset.Id): void => {
    setPickedIds((current) => {
      return current.includes(datasetId)
        ? current.filter((id) => {
            return id !== datasetId;
          })
        : [...current, datasetId];
    });
  };
  return {
    pickedIds,
    toggle,
    reset: () => {
      setPickedIds([]);
    },
  };
}

/** The ids of every dataset the crosswalk already holds. */
function useInCrosswalkIds(draft: CrosswalkDraft.T): readonly Dataset.Id[] {
  return useMemo(() => {
    return draft.layouts.flatMap((layout) => {
      return layout.datasetIds;
    });
  }, [draft.layouts]);
}

/**
 * The modal's list: a loader while reading, then the datasets to pick. A
 * dataset with no columns cannot form a layout, so it is shown disabled
 * with the reason.
 */
function AddableDatasetsList(
  props: Readonly<{
    isLoading: boolean;
    datasets: readonly Dataset.T[];
    columnCounts: ReadonlyMap<Dataset.Id, number>;
    pickedIds: readonly Dataset.Id[];
    inCrosswalkIds: readonly Dataset.Id[];
    onToggle: (datasetId: Dataset.Id) => void;
  }>,
): ReactNode {
  const noColumnIds = props.datasets
    .filter((dataset) => {
      return props.columnCounts.get(dataset.id) === 0;
    })
    .map((dataset) => {
      return dataset.id;
    });
  if (props.isLoading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }
  return (
    <ScrollArea.Autosize mah="60vh">
      <PickDatasetsTable
        datasets={props.datasets}
        columnCounts={props.columnCounts}
        pickedDatasetIds={props.pickedIds}
        lockedDatasetIds={props.inCrosswalkIds}
        lockedReason={<Trans>Already in this crosswalk</Trans>}
        unavailableDatasetIds={noColumnIds}
        unavailableReason={<Trans>This dataset has no columns yet.</Trans>}
        emptyMessage={<Trans>There are no datasets you can add.</Trans>}
        onToggle={props.onToggle}
      />
    </ScrollArea.Autosize>
  );
}

/** The modal's Cancel and Add buttons, the Add one counting what it adds. */
function AddDatasetsActions(
  props: Readonly<{
    pickedCount: number;
    onCancel: () => void;
    onAdd: () => void;
  }>,
): ReactNode {
  return (
    <Group justify="flex-end" gap="sm">
      <Button variant="default" onClick={props.onCancel}>
        <Trans>Cancel</Trans>
      </Button>
      <Button disabled={props.pickedCount === 0} onClick={props.onAdd}>
        <Plural
          value={props.pickedCount}
          one="Add # dataset"
          other="Add # datasets"
        />
      </Button>
    </Group>
  );
}

/**
 * **Add datasets**: the workspace's datasets with a checkbox each. Those
 * already in the crosswalk show picked and cannot be unpicked. Removing
 * one happens in the layouts table. Those with no columns show disabled.
 */
export function AddDatasetsModal(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { pickedIds, toggle, reset } = usePickedIds();
  const inCrosswalkIds = useInCrosswalkIds(props.draft);
  const addable = useAddableDatasets({
    isOpen: props.isOpen,
    context: props.context,
    outputDatasetId: props.draft.outputDatasetId,
  });
  const columnCounts = useColumnCounts(addable.datasets, props.context);
  const close = (): void => {
    reset();
    props.onClose();
  };
  return (
    <Modal
      opened={props.isOpen}
      onClose={close}
      title={t`Add datasets`}
      size="lg"
    >
      <Stack gap="md">
        <AddableDatasetsList
          isLoading={addable.isLoading || props.isCatalogLoading}
          datasets={addable.datasets}
          columnCounts={columnCounts}
          pickedIds={pickedIds}
          inCrosswalkIds={inCrosswalkIds}
          onToggle={toggle}
        />
        <AddDatasetsActions
          pickedCount={pickedIds.length}
          onCancel={close}
          onAdd={() => {
            props.onAdd(pickedIds);
            reset();
          }}
        />
      </Stack>
    </Modal>
  );
}
