import { Model } from "@avandar/models";
import { FloatingLoader, ObjectDescriptionList } from "@avandar/ui";
import { assertIsDefined, where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { avaDataTypeLabel } from "$/copy/avaDataTypeLabel";
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
import type { SetOptional } from "type-fest";

/**
 * Caps the table at roughly a dozen rows before it starts scrolling, so a
 * six-column dataset takes six rows of height rather than a fixed box.
 */
const COLUMN_TABLE_MAX_HEIGHT = 420;

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

/**
 * The dataset's columns, with their detected types and descriptions, each
 * row editable in place.
 *
 * The parse settings live in the view's rail and the identity facts in its
 * header, which leaves this the one thing in the metadata tab a user actually
 * edits. Do not fold it back into a description list over the whole dataset
 * record: that gives a column's name the same visual weight as the CSV escape
 * character.
 */
export function DatasetMetadataList({ dataset }: Props): JSX.Element {
  const { t } = useLingui();

  // Only the three shown columns get a header. Anything else falls back to
  // the list's default, which title-cases the key.
  const columnTableHeaders: Partial<Record<keyof DatasetColumn.T, string>> = {
    name: t`Name`,
    dataType: t`Type`,
    description: t`Description`,
  };

  // The table derives its columns from the first row's own keys, so a
  // dataset whose first column happens to have no description would drop the
  // Description column for every other column too. Naming the key on every
  // row keeps the table's shape a property of the model rather than of
  // whichever column sorted first.
  const columnRows = (dataset.columns ?? []).map((column) => {
    return { ...column, description: column.description };
  });

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
        data={columnRows}
        renderAsTable
        editable
        maxHeight={COLUMN_TABLE_MAX_HEIGHT}
        renderTableHeader={(key: keyof DatasetColumn.T) => {
          return columnTableHeaders[key];
        }}
        itemRenderOptions={{
          includeKeys: ["name", "dataType", "description"],
          keyRenderOptions: {
            description: {
              renderAsType: "text",
            },
            dataType: {
              renderAsType: {
                type: "text",
                choices: AvaDataType.Types.map((type) => {
                  return {
                    value: type,
                    label: avaDataTypeLabel(type),
                  };
                }),
              },
              // The translated counterpart, not `toDisplayValue`: this cell is
              // read by the user, and the untranslated identifier would show
              // English in every locale.
              renderValue: avaDataTypeLabel,
            },
          },
        }}
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
