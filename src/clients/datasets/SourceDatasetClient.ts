import { createServiceClient } from "@clients/index";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { Registry, where } from "@utils/index";
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
        }) => {
          const SourceClient = SourceDatasetClientRegistry[sourceType];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await SourceClient.update({ id, data } as any);
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
