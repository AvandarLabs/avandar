import { EditableDisplayText, Tabs, Tooltip } from "@avandar/ui";
import { formatDate, prop, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Box, Skeleton, Stack } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DatasetActionsMenu } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu";
import { DatasetMetadataList } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetadataList";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetMetaView.module.css";
import { DatasetSourceRail } from "@/views/DataManagerApp/DatasetMetaView/DatasetSourceRail";
import { ActiveColumnContext } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ActiveColumnContext";
import { DatasetColumnOutline } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetColumnOutline/DatasetColumnOutline";
import { DatasetSummaryView } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/DatasetSummaryView";
import { ToggleOfflineOnlyButton } from "@/views/DataManagerApp/DatasetMetaView/ToggleOfflineOnlyButton";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { ReactNode } from "react";

const DATASET_TAB_IDS = ["dataset-metadata", "dataset-summary"] as const;

type DatasetTabId = (typeof DATASET_TAB_IDS)[number];

type Props = {
  dataset: Dataset.T;
};

/**
 * Everything Avandar knows about one dataset.
 *
 * The layout follows the frame every detail view in the app uses: a header
 * band naming the record and stating the handful of facts that identify it,
 * a rail carrying reference material, and a content column that holds only
 * what the user came to read. What lives in the rail changes with the tab:
 * how the file was parsed while reading metadata, the column outline while
 * reading the summary.
 */
export function DatasetMetaView({ dataset }: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  // The user-facing name of every source type, keyed by the stored enum
  // value. Inline because this view is the only thing that names a single
  // dataset's origin.
  const sourceLabels = useMemo((): Record<DatasetSource.SourceType, string> => {
    return {
      csv_file: t`CSV file`,
      google_sheets: t`Google Sheets`,
      open_data: t`Open data`,
      pdf_file: t`PDF file`,
      virtual: t`Derived dataset`,
      xlsx_file: t`Excel file`,
    };
  }, [t]);
  const [appRoles] = useUserAppRoles();
  // True when the user has no data_sources app role; in that case the dataset
  // is visible only through a resource share. We mark it in the header; it
  // never blocks rendering.
  const isShareOnlyAccess = !!appRoles && !appRoles.data_sources;

  const [activeTab, setActiveTab] = useState<DatasetTabId>("dataset-metadata");
  const [activeColumnName, setActiveColumnName] = useState<
    string | undefined
  >();

  const [sourceDataset, isLoadingSourceDataset] =
    DatasetClient.useGetSourceDataset({
      datasetId: dataset.id,
      sourceType: dataset.sourceType,
    });
  const [previewData, isLoadingPreviewData] =
    DatasetQueryClient.useGetPreviewData({
      datasetId: dataset.id,
      numRows: GlobalAppConfig.dataManagerApp.maxPreviewRows,
      workspaceId: workspace.id,
    });
  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll(where("dataset_id", "eq", dataset.id));
  const [datasetMeta, isLoadingDatasetMeta] =
    DatasetQueryClient.useGetDatasetMeta({
      datasetId: dataset.id,
      workspaceId: workspace.id,
      useQueryOptions: {
        staleTime: Infinity,
        refetchOnMount: false,
        retry: false,
        refetchOnWindowFocus: false,
      },
    });
  const [updateDataset, isUpdatePending] = DatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset updated successfully!`);
    },
    onError: (err) => {
      notifyError(t`There was an error on update: ${err.message}`);
    },
  });

  const datasetWithColumnsAndSource = useMemo(() => {
    return {
      ...dataset,
      source:
        !isLoadingSourceDataset && sourceDataset ? sourceDataset : undefined,
      columns: datasetColumns,
    };
  }, [dataset, datasetColumns, isLoadingSourceDataset, sourceDataset]);

  const isLoadingFullDataset = isLoadingPreviewData || isLoadingDatasetColumns;
  const datasetColumnNames = datasetColumns?.map(prop("name")) ?? [];

  // Temporal columns arrive from DuckDB as epoch milliseconds, so the grid
  // has to be told which ones to format. Without this a date column reads as
  // "1,579,651,200,000", which is the preview's whole job failing quietly.
  const dateColumnNames = useMemo(() => {
    return new Set(
      (datasetColumns ?? [])
        .filter((column) => {
          return AvaDataType.isTemporal(column.dataType);
        })
        .map(prop("name")),
    );
  }, [datasetColumns]);
  const [datasetName, setDatasetName] = useState(dataset.name);
  const [datasetDescription, setDatasetDescription] = useState(
    dataset.description ?? "",
  );

  useEffect(() => {
    setDatasetName(dataset.name);
  }, [dataset.id, dataset.name]);

  useEffect(() => {
    setDatasetDescription(dataset.description ?? "");
  }, [dataset.description, dataset.id]);

  const canToggleOfflineOnly =
    datasetWithColumnsAndSource.source !== undefined &&
    "isInCloudStorage" in datasetWithColumnsAndSource.source &&
    // This toggle is currently only supported for CSV, Excel, and PDF
    // datasets (the manually-uploaded, parquet-backed source types).
    (dataset.sourceType === "csv_file" ||
      dataset.sourceType === "xlsx_file" ||
      dataset.sourceType === "pdf_file");

  const numColumns = datasetColumns?.length ?? datasetMeta?.columns.length;

  const headerFacts = [
    sourceLabels[dataset.sourceType],
    isLoadingDatasetMeta || datasetMeta === undefined ? (
      // A span, not the default div: the facts line is a paragraph, and a
      // block element inside it is invalid HTML that React reports as a
      // hydration error. `display="inline-block"` styles the box but does
      // not change what the parser is allowed to nest.
      <Skeleton
        key="rows"
        component="span"
        height={12}
        width={72}
        display="inline-block"
      />
    ) : (
      t`${datasetMeta.rows.toLocaleString(i18n.locale)} rows`
    ),
    numColumns === undefined ? undefined : t`${numColumns} columns`,
    t`Updated ${formatDate(dataset.updatedAt, { format: "MMM D, YYYY" })}`,
  ];

  const rail =
    activeTab === "dataset-summary" ? (
      <DatasetColumnOutline
        columns={datasetMeta?.columns ?? []}
        numRows={datasetMeta?.rows ?? 0}
        activeColumnName={activeColumnName}
      />
    ) : (
      <DatasetSourceRail
        dataset={dataset}
        source={datasetWithColumnsAndSource.source}
      />
    );

  return (
    <AppView>
      <AppViewHeader
        title={
          <EditableDisplayText
            name={t`dataset name`}
            value={datasetName}
            onChange={setDatasetName}
            onSave={(newName) => {
              updateDataset({
                id: dataset.id,
                data: { name: newName.trim() },
              });
            }}
            onCancel={() => {
              setDatasetName(dataset.name);
            }}
            isSaving={isUpdatePending}
            isSaveDisabled={datasetName.trim().length < 2}
            minRows={1}
            maxRows={2}
            error={
              datasetName.trim().length > 0 && datasetName.trim().length < 2
                ? t`Dataset name must be at least 2 characters.`
                : undefined
            }
            emptyDisplayText={t`Untitled dataset`}
            displayTextProps={{ fz: "inherit", fw: "inherit", m: 0 }}
            fz="inherit"
            fw="inherit"
          />
        }
        facts={headerFacts}
        actions={
          <>
            {isShareOnlyAccess ? (
              <Tooltip
                label={t`You can view this dataset because it was shared with you.`}
              >
                <Badge variant="light" color="neutral" size="sm">
                  <Trans>Shared with you</Trans>
                </Badge>
              </Tooltip>
            ) : null}
            {canToggleOfflineOnly &&
            datasetWithColumnsAndSource.source !== undefined &&
            "isInCloudStorage" in datasetWithColumnsAndSource.source ? (
              <ToggleOfflineOnlyButton
                isInCloudStorage={
                  datasetWithColumnsAndSource.source.isInCloudStorage
                }
                dataSource={datasetWithColumnsAndSource.source}
              />
            ) : null}
            <ShareResourceButton
              resourceName={dataset.name}
              resourceType="dataset"
              resourceId={dataset.id}
            />
            <DatasetActionsMenu
              dataset={dataset}
              googleSheetSource={
                sourceDataset?.__type === "GoogleSheetsDataset"
                  ? sourceDataset
                  : undefined
              }
            />
          </>
        }
      />

      <ActiveColumnContext.Provider value={setActiveColumnName}>
        <AppViewBody rail={rail}>
          <Tabs
            tabIds={DATASET_TAB_IDS}
            value={activeTab}
            classNames={{ list: css.datasetMetaViewTabList }}
            renderTabHeader={{
              "dataset-metadata": t`Metadata`,
              // The onboarding tutorial's first payoff points here. It has to
              // be the TAB and not the panel: this view opens on Metadata, so
              // the summary itself is not mounted when the tutorial arrives,
              // and a tooltip anchored to the panel would wait out its timeout
              // against an element that does not exist yet.
              "dataset-summary": (
                <span {...NuxAnchors.props(NuxAnchors.ids.datasetSummaryTab)}>
                  {t`Data Summary`}
                </span>
              ),
            }}
            renderTabPanel={{
              "dataset-metadata": () => {
                return (
                  <Stack gap="xl">
                    <Box maw="72ch">
                      <EditableDisplayText
                        name={t`description`}
                        value={datasetDescription}
                        textarea
                        onChange={setDatasetDescription}
                        isSaving={isUpdatePending}
                        emptyDisplayText={t`No description yet. Add one so teammates know what this dataset covers.`}
                        onSave={(newDescription) => {
                          const descriptionToSave =
                            newDescription.trim().length === 0
                              ? undefined
                              : newDescription;

                          updateDataset({
                            id: dataset.id,
                            data: { description: descriptionToSave },
                          });
                        }}
                        onCancel={() => {
                          setDatasetDescription(dataset.description ?? "");
                        }}
                      />
                    </Box>

                    <AppViewSection
                      title={<Trans>Columns</Trans>}
                      meta={numColumns === undefined ? undefined : numColumns}
                    >
                      <DatasetMetadataList
                        dataset={datasetWithColumnsAndSource}
                      />
                    </AppViewSection>

                    <AppViewSection
                      title={<Trans>Data preview</Trans>}
                      meta={
                        previewData === undefined
                          ? undefined
                          : t`First ${previewData.length} rows`
                      }
                    >
                      {isLoadingPreviewData ? (
                        <Skeleton height={320} radius="sm" />
                      ) : previewData ? (
                        <DataGrid
                          columnNames={datasetColumnNames}
                          data={previewData}
                          dateColumns={dateColumnNames}
                          dateFormat="YYYY-MM-DD"
                        />
                      ) : null}
                    </AppViewSection>
                  </Stack>
                );
              },
              "dataset-summary": () => {
                return isLoadingFullDataset ||
                  !previewData ||
                  !datasetColumns ? null : (
                  <DatasetSummaryView datasetId={dataset.id} />
                );
              },
            }}
            onTabChange={(tabId) => {
              setActiveTab(tabId);
              if (tabId === "dataset-summary") {
                NuxEvents.emit("dataset.summaryOpened", {
                  datasetId: dataset.id,
                });
              }
            }}
          />
        </AppViewBody>
      </ActiveColumnContext.Provider>
    </AppView>
  );
}
