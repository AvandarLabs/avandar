import { Box } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { makeDateColumnOptions } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { CaseTypeDraftCard } from "./CaseTypeDraftCard";
import { useCaseTypeDraftCreation } from "./useCaseTypeDraftCreation";
import { useCaseTypeDraftEditor } from "./useCaseTypeDraftEditor";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ChatProposedCaseType } from "$/types/chat.types";
import type { DateColumnOption } from "@/components/caseFields/makeDateColumnOptions/makeDateColumnOptions";

type CardProps = {
  draft: ChatProposedCaseType;
};

function _makeNamesById(
  records: ReadonlyArray<{ id: string; name: string }> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    (records ?? []).map((record) => {
      return [record.id, record.name];
    }),
  );
}

/** Each source dataset's date and timestamp columns, as picker options. */
function _makeDateColumnOptionsByDatasetId(
  columns: readonly DatasetColumn.T[] | undefined,
): Readonly<Record<string, DateColumnOption[]>> {
  const datasetIds = [
    ...new Set(
      (columns ?? []).map((column) => {
        return column.datasetId;
      }),
    ),
  ];
  return Object.fromEntries(
    datasetIds.map((datasetId) => {
      return [
        datasetId,
        makeDateColumnOptions(
          (columns ?? []).filter((column) => {
            return column.datasetId === datasetId;
          }),
        ),
      ];
    }),
  );
}

/**
 * The workspace catalog the card reads while a draft is edited: every
 * dataset, so one the model left out can still be joined, plus each
 * dataset's columns, types, and date columns.
 *
 * Names are read from the catalog rather than the proposal, so a dataset or
 * column the model mislabelled still displays what it really is.
 */
function useDraftCatalog() {
  const [datasetsWithColumns] = DatasetClient.useGetAllDatasetsWithColumns();
  return useMemo(() => {
    const datasets = datasetsWithColumns ?? [];
    const columns = datasets.flatMap((dataset) => {
      return dataset.columns;
    });
    return {
      datasets: datasets.map((dataset) => {
        return { id: dataset.id, name: dataset.name };
      }),
      columnsByDatasetId: Object.fromEntries(
        datasets.map((dataset) => {
          return [dataset.id, dataset.columns];
        }),
      ),
      columnNamesById: _makeNamesById(columns),
      columnDataTypesById: Object.fromEntries(
        columns.map((column) => {
          return [column.id, column.dataType];
        }),
      ),
      dateColumnOptionsByDatasetId: _makeDateColumnOptionsByDatasetId(columns),
      datasetNamesById: _makeNamesById(datasets),
    };
  }, [datasetsWithColumns]);
}

/**
 * Renders the draft once one exists. Split from the block so the editor and
 * catalog hooks only run for a real draft, rather than behind a conditional.
 */
function CaseTypeDraftCardContainer({
  draft,
}: Readonly<CardProps>): React.ReactNode {
  const workspace = useCurrentWorkspace();
  const dispatch = ChatPanelStateManager.useDispatch();
  const {
    datasets,
    columnsByDatasetId,
    columnNamesById,
    columnDataTypesById,
    dateColumnOptionsByDatasetId,
    datasetNamesById,
  } = useDraftCatalog();
  const editor = useCaseTypeDraftEditor({
    proposedDraft: draft,
    dateColumnOptionsByDatasetId,
  });
  const { isCreating, createCaseType } = useCaseTypeDraftCreation(workspace.id);
  const canCreateCaseType = useHasPermission(
    "case_types__can_create_case_type",
  );

  return (
    <Box px="md" pb="xs">
      <CaseTypeDraftCard
        editor={editor}
        datasets={datasets}
        columnsByDatasetId={columnsByDatasetId}
        datasetNamesById={datasetNamesById}
        columnNamesById={columnNamesById}
        columnDataTypesById={columnDataTypesById}
        dateColumnOptionsByDatasetId={dateColumnOptionsByDatasetId}
        isCreating={isCreating}
        onCreate={
          canCreateCaseType
            ? () => {
                void createCaseType(editor.draft);
              }
            : undefined
        }
        onDismiss={() => {
          dispatch.setPendingCaseTypeDraft(undefined);
        }}
      />
    </Box>
  );
}

/** Renders the pending case type draft above the composer. */
export function CaseTypeDraftBlock(): React.ReactNode {
  const { pendingCaseTypeDraft } = ChatPanelStateManager.useState();
  return pendingCaseTypeDraft ? (
    <CaseTypeDraftCardContainer draft={pendingCaseTypeDraft} />
  ) : null;
}
