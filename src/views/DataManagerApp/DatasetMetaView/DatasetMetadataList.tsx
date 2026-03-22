import { Model } from "@models/index";
import { FloatingLoader } from "@ui/FloatingLoader/FloatingLoader";
import { notifySuccess } from "@ui/index";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList/ObjectDescriptionList";
import { assertIsDefined, where } from "@utils/index";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import type { ObjectKeyRenderOptionsMap } from "@ui/ObjectDescriptionList/ObjectDescriptionList.types";
import type { CSVFileDataset } from "$/models/datasets/CSVFileDataset";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { SetOptional } from "type-fest";

type DatasetWithColumnsAndSource = SetOptional<
  DatasetWithColumns,
  "columns"
> & {
  source: CSVFileDataset | GoogleSheetsDataset | VirtualDataset.T | undefined;
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
        virtual: "Derived Dataset",
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
  const [dropLocalDataset] = LocalDatasetClient.useDropLocalDataset({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
  });

  const [updateDatasetColumn, isUpdatingDatasetColumn] =
    DatasetColumnClient.useUpdate({
      queriesToInvalidate: [
        DatasetColumnClient.QueryKeys.getAll(
          where("dataset_id", "eq", dataset.id),
        ),
        [DatasetQueryClient.getClientName()],
      ],
      onSuccess: () => {
        notifySuccess("Column description updated successfully!");

        // drop the local column data so it can be re-materialized when the
        // dataset is next loaded. No need to await this promise though.
        dropLocalDataset({ datasetId: dataset.id });
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
        onSubmitChange={async (value) => {
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
            const newDescription =
              datasetColumn.description !== prevDatasetColumn.description ?
                datasetColumn.description
              : undefined;

            // update the column metadata in the backend if any changes were
            // made to the description, data type, or name
            if (
              newDescription !== undefined ||
              newDataType !== undefined ||
              newColumnName !== undefined
            ) {
              updateDatasetColumn({
                id: datasetColumn.id,
                data: {
                  description: newDescription,
                  dataType: newDataType,
                  name: newColumnName,
                },
              });
            }
          }
        }}
      />
      <FloatingLoader
        visible={isUpdatingDatasetColumn}
        label="Updating dataset"
      />
    </>
  );
}
