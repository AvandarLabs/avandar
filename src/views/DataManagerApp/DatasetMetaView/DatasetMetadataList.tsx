import { Model } from "@avandar/models";
import { FloatingLoader, ObjectDescriptionList } from "@avandar/ui";
import { assertIsDefined, matchLiteral, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { notifySuccess } from "@/utils/notifications/notify";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { PdfFileDataset } from "$/models/datasets/PdfFileDataset/PdfFileDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { ObjectKeyRenderOptionsMap } from "@avandar/ui";
import type { SetOptional } from "type-fest";

type DatasetWithColumnsAndSource = SetOptional<
  DatasetWithColumns,
  "columns"
> & {
  source:
    | CsvFileDataset.T
    | GoogleSheetsDataset.T
    | OpenDataDataset.T
    | PdfFileDataset.T
    | VirtualDataset.T
    | XlsxFileDataset.T
    | undefined;
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

// eslint-disable-next-line max-len
function useDatasetMetadataRenderOptions(): ObjectKeyRenderOptionsMap<DatasetWithColumnsAndSource> {
  const { t } = useLingui();
  return {
    createdAt: {
      renderAsType: "date",
    },
    updatedAt: {
      renderAsType: "date",
    },
    sourceType: {
      renderValue: (value) => {
        return matchLiteral(value, {
          csv_file: t`CSV file`,
          google_sheets: t`Google Sheets`,
          open_data: t`Open Data`,
          pdf_file: t`PDF file`,
          virtual: t`Derived Dataset`,
          xlsx_file: t`Excel file`,
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
              choices: AvaDataType.Types.map((type) => {
                return {
                  value: type,
                  label: AvaDataType.toDisplayValue(type),
                };
              }),
            },
            renderValue: AvaDataType.toDisplayValue,
          },
        },
        includeKeys: ["name", "dataType", "description"],
      },
    },
    source: {
      excludeKeys: ["createdAt", "id", "datasetId", "updatedAt", "workspaceId"],
    },
  } satisfies ObjectKeyRenderOptionsMap<DatasetWithColumnsAndSource>;
}

export function DatasetMetadataList({ dataset }: Props): JSX.Element {
  const { t } = useLingui();
  const datasetMetadataRenderOptions = useDatasetMetadataRenderOptions();
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
        notifySuccess(t`Column description updated successfully!`);

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
        keyRenderOptions={datasetMetadataRenderOptions}
        onSubmitChange={async (value) => {
          if (Model.isOfModelType(value, "DatasetColumn")) {
            const datasetColumn = value as DatasetColumn.T;
            const prevDatasetColumn = dataset.columns?.find((column) => {
              return column.id === datasetColumn.id;
            });
            assertIsDefined(prevDatasetColumn);

            const newColumnName =
              datasetColumn.name !== prevDatasetColumn.name
                ? datasetColumn.name
                : undefined;
            const newDataType =
              (datasetColumn.dataType as string) !==
              datasetColumn.detectedDataType
                ? datasetColumn.dataType
                : undefined;
            const newDescription =
              datasetColumn.description !== prevDatasetColumn.description
                ? datasetColumn.description
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
        label={t`Updating dataset`}
      />
    </>
  );
}
