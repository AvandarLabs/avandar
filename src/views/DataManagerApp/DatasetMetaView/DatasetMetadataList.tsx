import { Model } from "@avandar/models";
import { FloatingLoader, ObjectDescriptionList } from "@avandar/ui";
import {
  assertIsDefined,
  isDefined,
  matchLiteral,
  propEq,
  where,
} from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { useDatasetColumnRenderOptions } from "@/hooks/datasets/useDatasetColumnRenderOptions/useDatasetColumnRenderOptions";
import { notifySuccess } from "@/utils/notifications/notify";
import { getDatasetColumnUpdate } from "@/views/DataManagerApp/DatasetMetaView/getDatasetColumnUpdate/getDatasetColumnUpdate";
import type { ObjectKeyRenderOptionsMap } from "@avandar/ui";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { XlsxFileDataset } from "$/models/datasets/XlsxFileDataset/XlsxFileDataset";
import type { SetOptional } from "type-fest";

type DatasetWithColumnsAndSource = SetOptional<
  DatasetWithColumns,
  "columns"
> & {
  source:
    | CsvFileDataset.T
    | GoogleSheetsDataset.T
    | OpenDataDataset.T
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
  const columnRenderOptions = useDatasetColumnRenderOptions();
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
          ...columnRenderOptions,
          createdAt: {
            renderAsType: "date",
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

  const [updateDatasetColumn, isUpdatingDatasetColumn] =
    DatasetColumnClient.useUpdate({
      queriesToInvalidate: [
        DatasetColumnClient.QueryKeys.getAll(
          where("dataset_id", "eq", dataset.id),
        ),
        [DatasetQueryClient.getClientName()],
      ],
      onSuccess: () => {
        notifySuccess(t`Column updated successfully!`);

        // Drop only the DuckDB view, which is where a renamed or re-typed
        // column is projected, so it gets rebuilt from the parquet on the next
        // query. The parquet itself is untouched and must stay that way: for a
        // dataset the user chose to keep offline-only it is the sole copy, and
        // nothing on the read path checks `isInCloudStorage` before trying to
        // re-download. No need to await this.
        void DuckDbClient.dropTableViewAndFile({
          tableOrViewName: dataset.id,
        });
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
            const editedColumn = value;
            const previousColumn = dataset.columns?.find(
              propEq("id", editedColumn.id),
            );
            assertIsDefined(previousColumn);

            const update = getDatasetColumnUpdate({
              previousColumn,
              editedColumn,
            });
            if (isDefined(update)) {
              updateDatasetColumn({ id: editedColumn.id, data: update });
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
