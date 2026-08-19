import { Trans, useLingui } from "@lingui/react/macro";
import { Menu } from "@mantine/core";
import { modals } from "@mantine/modals";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ReactNode } from "react";

type Props = {
  savableSql: string;
  queryResultData: UnknownDataFrame;
  queryResultColumns: readonly QueryResult.Column[];
  dateColumns: ReadonlySet<string>;
  workspaceSlug: string;
  isSaveDisabled: boolean;
  runAQueryFirstHint: ReactNode;
  shouldForceCreateMode: boolean;
};

function _openSaveAsNewDatasetModal(options: {
  dateColumns: ReadonlySet<string>;
  queryResultColumns: readonly QueryResult.Column[];
  queryResultData: UnknownDataFrame;
  savableSql: string;
  title: string;
}): void {
  const modalId = modals.open({
    title: options.title,
    size: "xl",
    children: (
      <SaveAsNewDatasetForm
        queryResultData={options.queryResultData}
        columns={options.queryResultColumns}
        dateColumns={options.dateColumns}
        rawSql={options.savableSql}
        onSaveSuccess={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}

function _openSaveToDashboardModal(options: {
  forceCreateMode: boolean;
  nlPrompt: string | undefined;
  savableSql: string;
  vizConfig: ReturnType<typeof DataExplorerStateManager.useState>["vizConfig"];
  workspaceSlug: string;
}): void {
  const modalId = modals.open({
    withCloseButton: true,
    size: "lg",
    children: (
      <SaveToDashboardModal
        rawSql={options.savableSql}
        prompt={options.nlPrompt}
        vizType={options.vizConfig.vizType}
        vizConfig={options.vizConfig}
        workspaceSlug={options.workspaceSlug}
        forceCreateMode={options.forceCreateMode}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}

/** Save-as-dataset and save-to-dashboard items in the Explorer Save menu. */
export function DataExplorerSaveAsMenuItems({
  savableSql,
  queryResultData,
  queryResultColumns,
  dateColumns,
  workspaceSlug,
  isSaveDisabled,
  runAQueryFirstHint,
  shouldForceCreateMode,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const state = DataExplorerStateManager.useState();
  return (
    <>
      <Menu.Item
        disabled={isSaveDisabled}
        rightSection={runAQueryFirstHint}
        onClick={() => {
          _openSaveAsNewDatasetModal({
            dateColumns,
            queryResultColumns,
            queryResultData,
            savableSql,
            title: t`Save as new dataset`,
          });
        }}
      >
        <Trans>Save as new dataset</Trans>
      </Menu.Item>
      <Menu.Item
        disabled={isSaveDisabled}
        rightSection={runAQueryFirstHint}
        {...NuxAnchors.props(NuxAnchors.ids.explorerSaveToDashboardItem)}
        onClick={() => {
          _openSaveToDashboardModal({
            forceCreateMode: shouldForceCreateMode,
            nlPrompt: state.nlPrompt,
            savableSql,
            vizConfig: state.vizConfig,
            workspaceSlug,
          });
        }}
      >
        <Trans>Save to dashboard</Trans>
      </Menu.Item>
    </>
  );
}
