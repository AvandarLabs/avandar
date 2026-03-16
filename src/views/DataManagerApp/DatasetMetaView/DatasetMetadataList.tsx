import { Model } from "@models/index";
import { FloatingLoader } from "@ui/FloatingLoader/FloatingLoader";
import { notifySuccess } from "@ui/index";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList/ObjectDescriptionList";
import { assertIsDefined, where } from "@utils/index";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { RawDataClient } from "@/clients/datasets/RawDataClient";
import { AppConfig } from "@/config/AppConfig";
import type { ObjectKeyRenderOptionsMap } from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";
import type { CSVFileDataset } from "$/models/datasets/CSVFileDataset";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types";
import type { SetOptional } from "type-fest";

type DatasetWithColumnsAndSource = SetOptional<
  DatasetWithColumns,
  "columns"
> & {
  source: CSVFileDataset | GoogleSheetsDataset | undefined;
};

type Props = {
  dataset: DatasetWithColumnsAndSource;
};

const EXCLUDED_DATASET_METADATA_KEYS = [
  "id",
  "name",
  "description",
  "workspaceId",
  "ownerId",
  "ownerProfileId",
  "dateOfLastSync",
] satisfies ReadonlyArray<keyof DatasetWithColumnsAndSource>;

const DATASET_METADATA_RENDER_OPTIONS = {
  createdAt: {
    renderAsType: "date",
  },
  updatedAt: {
    renderAsType: "date",
  },
  sourceType: {
    renderValue: (value) => {
      return matchLiteral(value, {
        csv_file: "CSV file",
        google_sheets: "Google Sheets",
        _otherwise: value,
      });
    },
  },
  columns: {
    renderAsTable: true,
    maxHeight: 400,
    editable: true,
    itemRenderOptions: {
      keyRenderOptions: {
        description: {
          renderAsType: "text",
        },
        createdAt: {
          renderAsType: "date",
        },
        dataType: {
          renderAsType: {
            type: "text",
            choices: AvaDataTypes.Types.map((type) => {
              return {
                value: type,
                label: AvaDataTypes.toDisplayValue(type),
              };
            }),
          },
          renderValue: AvaDataTypes.toDisplayValue,
        },
      },
      includeKeys: ["name", "dataType", "description"],
    },
  },
  source: {
    excludeKeys: ["createdAt", "id", "datasetId", "updatedAt", "workspaceId"],
  },
} satisfies ObjectKeyRenderOptionsMap<DatasetWithColumnsAndSource>;

export function DatasetMetadataList({ dataset }: Props): JSX.Element {
  const [updateRawColumnMetadata, isUpdatingRawColumnMetadata] =
    RawDataClient.useUpdateRawColumnMetadata({
      queriesToInvalidate: [
        RawDataClient.QueryKeys.getSummary({
          datasetId: dataset.id,
        }),
        RawDataClient.QueryKeys.getPreviewData({
          datasetId: dataset.id,
          numRows: AppConfig.dataManagerApp.maxPreviewRows,
        }),
        DatasetColumnClient.QueryKeys.getAll(
          where("dataset_id", "eq", dataset.id),
        ),
      ],
      onSuccess: ({ newDataType, newColumnName }) => {
        if (newDataType && newColumnName) {
          notifySuccess("Column name and type updated successfully!");
        } else if (newDataType) {
          notifySuccess("Column type updated successfully!");
        } else if (newColumnName) {
          notifySuccess("Column name updated successfully!");
        }
      },
    });

  const [updateDatasetColumn, isUpdatingDatasetColumn] =
    DatasetColumnClient.useUpdate({
      queryToInvalidate: DatasetColumnClient.QueryKeys.getAll(
        where("dataset_id", "eq", dataset.id),
      ),
      onSuccess: () => {
        notifySuccess("Column description updated successfully!");
      },
    });

  return (
    <>
      <ObjectDescriptionList
        data={dataset}
        dateFormat="MMMM D, YYYY"
        includeKeys={["updatedAt", "sourceType", "..."]}
        excludeKeys={EXCLUDED_DATASET_METADATA_KEYS}
        keyRenderOptions={DATASET_METADATA_RENDER_OPTIONS}
        onSubmitChange={(value) => {
          if (Model.isModelOfType(value, "DatasetColumn")) {
            const datasetColumn = value;
            const prevDatasetColumn = dataset.columns?.find((column) => {
              return column.id === value.id;
            });
            assertIsDefined(prevDatasetColumn);
            const newColumnName =
              datasetColumn.name !== prevDatasetColumn.name ?
                datasetColumn.name
              : undefined;
            const newDataType =
              (
                (datasetColumn.dataType as string) !==
                datasetColumn.detectedDataType
              ) ?
                datasetColumn.dataType
              : undefined;
            if (newColumnName !== undefined || newDataType !== undefined) {
              updateRawColumnMetadata({
                columnId: datasetColumn.id,
                datasetId: datasetColumn.datasetId,
                prevColumnName: prevDatasetColumn.name,
                sourceType: dataset.sourceType,
                newColumnName,
                newDataType,
              });
            }

            // update the description
            if (datasetColumn.description !== prevDatasetColumn.description) {
              updateDatasetColumn({
                id: datasetColumn.id,
                data: {
                  description: datasetColumn.description,
                },
              });
            }
          }
        }}
      />
      <FloatingLoader
        visible={isUpdatingRawColumnMetadata || isUpdatingDatasetColumn}
        label="Updating dataset"
      />
    </>
  );
}
