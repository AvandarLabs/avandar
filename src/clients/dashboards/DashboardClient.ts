import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { notifyError } from "@ui/notifications/notify";
import { where } from "@utils/filters/where/where";
import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { promiseMap } from "@/lib/utils/promises";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type {
  Dashboard,
  DashboardId,
} from "$/models/Dashboard/Dashboard.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

export const DashboardClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "Dashboard",
    tableName: "dashboards",
    dbTablePrimaryKey: "id",
    parsers: DashboardParsers,
    mutations: (config) => {
      return {
        /**
         * Publishes a dashboard (sets isPublic to true) and copies dependent
         * dataset parquet blobs into the public storage bucket so the dashboard
         * can be publicly loadable.
         */
        publishDashboard: async (params: {
          dashboardId: DashboardId;
        }): Promise<Dashboard> => {
          const { dashboardId } = params;
          const logger = config.clientLogger.appendName("publishDashboard");

          const { data: dbDashboard } = await config.dbClient
            .from("dashboards")
            .select("*")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", dashboardId as any)
            .single()
            .throwOnError();

          const dashboard: Dashboard =
            config.parsers.fromDBReadToModelRead(dbDashboard);

          const datasetIdCandidates = extractDatasetIdsFromDashboardConfig(
            dashboard.config,
          );

          // if there are dataset IDs in our dashboard config, then we need to
          // copy them to public storage. They are dependencies of the
          // dashboard.
          if (datasetIdCandidates.length > 0) {
            const datasets =
              datasetIdCandidates.length === 0 ?
                []
              : await DatasetClient.getAll(
                  where("id", "in", datasetIdCandidates as DatasetId[]),
                );

            const datasetsInDashboardWorkspace = datasets.filter((dataset) => {
              return dataset.workspaceId === dashboard.workspaceId;
            });

            const dependentDatasetIds: DatasetId[] =
              datasetsInDashboardWorkspace.map((d) => {
                return d.id;
              });

            logger.log("Copying dataset parquet blobs to public bucket", {
              dashboardId,
              dependentDatasetIds,
            });

            await promiseMap(dependentDatasetIds, async (datasetId) => {
              try {
                const parquetBlob =
                  await DatasetParquetStorageClient.downloadDataset({
                    workspaceId: dashboard.workspaceId,
                    datasetId,
                    throwIfNotFound: true,
                  });

                await PublicDatasetParquetStorageClient.uploadDataset({
                  dashboardId,
                  datasetId,
                  parquetBlob,
                });
              } catch (error: unknown) {
                const errorMessage: string =
                  error instanceof Error ? error.message : String(error);

                notifyError({
                  title: "Unable to publish dashboard",
                  message:
                    "Some datasets are not synced online yet or failed to publish. " +
                    errorMessage,
                });
                throw error;
              }
            });
          }

          const updateModel: Partial<Dashboard> = { isPublic: true };
          const dbUpdate =
            config.parsers.fromModelUpdateToDBUpdate(updateModel);

          const { data: updatedDBDashboard } = await config.dbClient
            .from("dashboards")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(dbUpdate as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("id", dashboardId as any)
            .select("*")
            .single()
            .throwOnError();

          return config.parsers.fromDBReadToModelRead(updatedDBDashboard);
        },
      };
    },
  }),
  {
    mutationFns: ["publishDashboard", "delete"],
  },
);
