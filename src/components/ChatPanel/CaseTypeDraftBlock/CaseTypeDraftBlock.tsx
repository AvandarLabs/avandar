import { where } from "@avandar/utils";
import { Box } from "@mantine/core";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { CaseTypeDraftCard } from "./CaseTypeDraftCard";
import { useCaseTypeDraftCreation } from "./useCaseTypeDraftCreation";
import { useCaseTypeDraftEditor } from "./useCaseTypeDraftEditor";
import type { ChatProposedCaseType } from "$/types/chat.types";

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

/**
 * Renders the draft once one exists. Split from the block so the editor and
 * catalog hooks only run for a real draft, rather than behind a conditional.
 */
function CaseTypeDraftCardContainer({
  draft,
}: Readonly<CardProps>): React.ReactNode {
  const workspace = useCurrentWorkspace();
  const dispatch = ChatPanelStateManager.useDispatch();
  const editor = useCaseTypeDraftEditor(draft);
  const { isCreating, createCaseType } = useCaseTypeDraftCreation(workspace.id);

  // Names are read from the catalog rather than the proposal, so a dataset or
  // column the model mislabelled still displays what it really is. Every source
  // dataset is fetched, not just the first, because the card shows them all.
  const sourceDatasetIds = editor.draft.sourceDatasets.map((sourceDataset) => {
    return sourceDataset.datasetId;
  });
  const [datasetColumns] = DatasetColumnClient.useGetAll(
    where("dataset_id", "in", sourceDatasetIds),
  );
  const [datasets] = DatasetClient.useGetAll(
    where("id", "in", sourceDatasetIds),
  );

  const columnNamesById = useMemo(() => {
    return _makeNamesById(datasetColumns);
  }, [datasetColumns]);
  const datasetNamesById = useMemo(() => {
    return _makeNamesById(datasets);
  }, [datasets]);

  return (
    <Box px="md" pb="xs">
      <CaseTypeDraftCard
        editor={editor}
        datasetNamesById={datasetNamesById}
        columnNamesById={columnNamesById}
        isCreating={isCreating}
        onCreate={() => {
          void createCaseType(editor.draft);
        }}
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
  return pendingCaseTypeDraft ?
      <CaseTypeDraftCardContainer draft={pendingCaseTypeDraft} />
    : null;
}
