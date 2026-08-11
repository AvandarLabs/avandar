import { createServiceClient } from "@avandar/clients";
import { withQueryHooks } from "@avandar/query-hooks";
import { Registry, where } from "@avandar/utils";
import { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import { CsvFileDatasetClient } from "./source-datasets/CsvFileDatasetClient";
import { GoogleSheetsDatasetClient } from "./source-datasets/GoogleSheetsDatasetClient";
import { OpenDataDatasetClient } from "./source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "./source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "./source-datasets/XlsxFileDatasetClient";

const SourceDatasetClientRegistry = {
  csv_file: CsvFileDatasetClient,
  google_sheets: GoogleSheetsDatasetClient,
  open_data: OpenDataDatasetClient,
  virtual: VirtualDatasetClient,
  xlsx_file: XlsxFileDatasetClient,
} satisfies Registry<DatasetSource.SourceType>;

export const SourceDatasetClient = withQueryHooks(
  createServiceClient("SourceDatasetClient").mixin(() => {
    return {
      members: {
        update: async <TSourceType extends DatasetSource.SourceType>({
          sourceType,
          id,
          data,
        }: {
          sourceType: TSourceType;
          id: DatasetSource.T<TSourceType>["id"];
          data: DatasetSource.T<TSourceType, "Update">;
        }): Promise<DatasetSource.T<TSourceType>> => {
          const SourceClient = SourceDatasetClientRegistry[sourceType];
          const updatedDataset = await SourceClient.update({
            id,
            data,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          return updatedDataset as DatasetSource.T<TSourceType>;
        },
        getByDatasetId: async ({
          sourceType,
          datasetId,
        }: {
          sourceType: DatasetSource.SourceType;
          datasetId: DatasetId;
        }) => {
          const SourceClient = SourceDatasetClientRegistry[sourceType];
          return await SourceClient.getOne(
            where("dataset_id", "eq", datasetId),
          );
        },
      },
    };
  }),
  {
    queryFns: ["getByDatasetId"],
    mutationFns: [],
  },
);
