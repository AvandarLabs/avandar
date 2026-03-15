import { Model } from "@models/index";
import { notifyError, notifySuccess } from "@ui/index";
import { ObjectDescriptionList } from "@ui/ObjectDescriptionList/ObjectDescriptionList";
import { matchLiteral } from "@utils/strings/matchLiteral/matchLiteral";
import { AvaDataTypes } from "$/models/datasets/AvaDataType/AvaDataTypes";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
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
  const [updateDatasetColumn] = DatasetColumnClient.useUpdate({
    queryToInvalidate: DatasetColumnClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset column updated successfully!");
    },
    onError: (err) => {
      notifyError(`There was an error on update: ${err.message}`);
    },
  });

  return (
    <ObjectDescriptionList
      data={dataset}
      dateFormat="MMMM D, YYYY"
      includeKeys={["updatedAt", "sourceType", "..."]}
      excludeKeys={EXCLUDED_DATASET_METADATA_KEYS}
      keyRenderOptions={DATASET_METADATA_RENDER_OPTIONS}
      onSubmitChange={(value) => {
        if (Model.isModel(value, "DatasetColumn")) {
          const datasetColumn = value;
          // try and cast the dataset column to the correct type here

          updateDatasetColumn({
            id: datasetColumn.id,
            data: datasetColumn,
          });
        }
      }}
    />
  );
}
