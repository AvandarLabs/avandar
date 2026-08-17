import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Menu, Text, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconChevronDown, IconInfoCircle } from "@tabler/icons-react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ReactNode } from "react";

type Props = {
  /**
   * The SQL behind whatever is on screen, or `undefined` when nothing has been
   * run yet. Every save action is disabled without it.
   */
  savableSql: string | undefined;
  queryResultData: UnknownDataFrame;
  queryResultColumns: readonly QueryResultColumn[];
  dateColumns: ReadonlySet<string>;
  workspaceSlug: string;
};

/**
 * The Data Explorer toolbar's Save dropdown.
 *
 * Owns the two save-over/delete mutations for an open dataset alongside the
 * "save as new" and "save to dashboard" actions, because all four are reachable
 * only from this menu and nothing else on the page reads their state.
 */
export function DataExplorerSaveMenu({
  savableSql,
  queryResultData,
  queryResultColumns,
  dateColumns,
  workspaceSlug,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();

  const [saveOverDataset, isSavingOver] = VirtualDatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset saved.`);
    },
    onError: (error) => {
      notifyError(t`Failed to save dataset: ${error.message}`);
    },
  });

  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      // `rawSql` is part of the query key, so clearing it can start a new
      // run. Stamp `structured_change` (the union has no member for a
      // system-initiated clear) so a stale `dataset_opened` from before the
      // delete does not mislabel that run.
      dispatch.setQueryTrigger("structured_change");
      dispatch.setOpenDataset(undefined);
      dispatch.setRawSql(undefined);
      notifySuccess(t`Dataset deleted.`);
    },
    onError: (error) => {
      notifyError(t`Failed to delete dataset: ${error.message}`);
    },
  });

  const isSaveDisabled =
    queryResultData.length === 0 || savableSql === undefined;
  const runAQueryFirstHint =
    savableSql === undefined ?
      <Tooltip label={t`Run a query first.`}>
        <IconInfoCircle size={16} />
      </Tooltip>
    : null;

  return (
    <Menu shadow="md" width={240}>
      <Menu.Target>
        <Button
          variant="outline"
          color="neutral"
          size="compact-sm"
          rightSection={<IconChevronDown size={16} />}
          {...NuxAnchors.props(NuxAnchors.ids.explorerSaveMenu)}
        >
          <Trans>Save</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {state.openDataset ?
          <>
            {state.openDataset.virtualDatasetId ?
              <Menu.Item
                disabled={!state.rawSql || isSavingOver}
                onClick={() => {
                  const virtualDatasetId = state.openDataset?.virtualDatasetId;
                  if (!state.rawSql || !virtualDatasetId) {
                    return;
                  }
                  saveOverDataset({
                    id: virtualDatasetId,
                    data: { rawSql: state.rawSql },
                  });
                }}
              >
                <Trans>Save: {state.openDataset.name}</Trans>
              </Menu.Item>
            : null}
            <Menu.Item
              color="red"
              disabled={isDeletingDataset}
              onClick={() => {
                if (!state.openDataset) {
                  return;
                }
                modals.openConfirmModal({
                  title: t`Delete dataset`,
                  children: (
                    <Text size="sm">
                      <Trans>
                        Permanently delete{" "}
                        <strong>{state.openDataset.name}</strong>?
                      </Trans>
                    </Text>
                  ),
                  labels: {
                    confirm: t`Delete`,
                    cancel: t`Cancel`,
                  },
                  confirmProps: { color: "red" },
                  onConfirm: () => {
                    if (!state.openDataset) {
                      return;
                    }
                    deleteDataset({
                      id: state.openDataset.datasetId,
                    });
                  },
                });
              }}
            >
              <Trans>Delete: {state.openDataset.name}</Trans>
            </Menu.Item>
            <Menu.Divider />
          </>
        : null}
        <Menu.Item
          disabled={isSaveDisabled}
          rightSection={runAQueryFirstHint}
          onClick={() => {
            if (!savableSql) {
              return;
            }
            const modalId = modals.open({
              title: t`Save as new dataset`,
              size: "xl",
              children: (
                <SaveAsNewDatasetForm
                  queryResultData={queryResultData}
                  columns={queryResultColumns}
                  dateColumns={dateColumns}
                  rawSql={savableSql}
                  onSaveSuccess={() => {
                    modals.close(modalId);
                  }}
                />
              ),
            });
          }}
        >
          <Trans>Save as new dataset</Trans>
        </Menu.Item>
        <Menu.Item
          disabled={isSaveDisabled}
          rightSection={runAQueryFirstHint}
          onClick={() => {
            if (!savableSql) {
              return;
            }
            const modalId = modals.open({
              withCloseButton: true,
              size: "lg",
              children: (
                <SaveToDashboardModal
                  rawSql={savableSql}
                  prompt={state.nlPrompt}
                  vizType={state.vizConfig.vizType}
                  vizConfig={state.vizConfig}
                  workspaceSlug={workspaceSlug}
                  onClose={() => {
                    modals.close(modalId);
                  }}
                />
              ),
            });
          }}
        >
          <Trans>Save to dashboard</Trans>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
