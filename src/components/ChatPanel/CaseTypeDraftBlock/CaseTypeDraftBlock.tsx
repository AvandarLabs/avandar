import { where } from "@avandar/utils";
import { Box } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
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
 * The catalog the card reads for its source datasets: names, column types,
 * and each dataset's date columns.
 *
 * Names are read from the catalog rather than the proposal, so a dataset or
 * column the model mislabelled still displays what it really is. Every source
 * dataset is fetched, not just the first, because the card shows them all.
 * The proposal's datasets are fetched rather than the edited draft's: the
 * card can only remove a dataset, and the editor needs the date columns
 * before it exists.
 */
function useDraftCatalog(draft: ChatProposedCaseType) {
  const sourceDatasetIds = draft.sourceDatasets.map((sourceDataset) => {
    return sourceDataset.datasetId;
  });
  const [datasetColumns] = DatasetColumnClient.useGetAll(
    where("dataset_id", "in", sourceDatasetIds),
  );
  const [datasets] = DatasetClient.useGetAll(
    where("id", "in", sourceDatasetIds),
  );
  return useMemo(() => {
    return {
      columnNamesById: _makeNamesById(datasetColumns),
      columnDataTypesById: Object.fromEntries(
        (datasetColumns ?? []).map((column) => {
          return [column.id, column.dataType];
        }),
      ),
      dateColumnOptionsByDatasetId:
        _makeDateColumnOptionsByDatasetId(datasetColumns),
      datasetNamesById: _makeNamesById(datasets),
    };
  }, [datasetColumns, datasets]);
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
    columnNamesById,
    columnDataTypesById,
    dateColumnOptionsByDatasetId,
    datasetNamesById,
  } = useDraftCatalog(draft);
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
