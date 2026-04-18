import { createSupabaseCRUDClient } from "@clients/SupabaseCRUDClient/createSupabaseCRUDClient";
import { notifyError } from "@ui/notifications/notify";
import { where } from "@utils/filters/where/where";
import { assertIsDefined, prop } from "@utils/index";
import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/VirtualDatasetClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { OpenDatasetParquetStorageClient } from "@/clients/storage/OpenDatasetParquetStorageClient/OpenDatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { promiseMap } from "@/lib/utils/promises";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

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
          dashboardId: Dashboard.Id;
        }): Promise<Dashboard.T> => {
          const { dashboardId } = params;
          const logger = config.clientLogger.appendName("publishDashboard");

          const dashboard = await DashboardClient.getById({
            id: dashboardId,
          });
          assertIsDefined(dashboard, { name: "dashboard" });

          const datasetIdCandidates = extractDatasetIdsFromDashboardConfig(
            dashboard.config,
          );

          // if there are dataset IDs in our dashboard config, then we need to
          // copy them to public storage. They are dependencies of the
          // dashboard.
          if (datasetIdCandidates.length > 0) {
            const datasetsInDashboard =
              datasetIdCandidates.length === 0 ?
                []
              : await DatasetClient.getAll({
                  where: {
                    id: { in: datasetIdCandidates as DatasetId[] },
                    workspace_id: { eq: dashboard.workspaceId },
                  },
                });

            const dependentDatasetIds: DatasetId[] = datasetsInDashboard.map(
              prop("id"),
            );

            logger.log("Copying dataset parquet blobs to public bucket", {
              dashboardId,
              dependentDatasetIds,
            });

            await promiseMap(datasetsInDashboard, async (dataset) => {
              try {
                if (dataset.sourceType === "virtual") {
                  const virtualDataset = await VirtualDatasetClient.getOne(
                    where("dataset_id", "eq", dataset.id),
                  );

                  assertIsDefined(virtualDataset, {
                    name: "virtualDataset",
                  });

                  const innerSql = virtualDataset.rawSQL
                    .trim()
                    .replace(/;\s*$/, "");
                  const materializedSql = `SELECT * FROM (${innerSql}) AS _virtual_publish`;

                  const parquetBlob = await WorkspaceQETLClient.runQuery({
                    rawSQL: materializedSql,
                    workspaceId: dashboard.workspaceId,
                    returnType: "parquet",
                  });

                  await PublicDatasetParquetStorageClient.uploadDataset({
                    dashboardId,
                    datasetId: dataset.id,
                    parquetBlob,
                  });

                  return;
                }
                if (dataset.sourceType === "open_data") {
                  // Open data is public at source; we still mirror a copy into
                  // the public bucket for the published dashboard.
                  const localDataset = await LocalDatasetClient.getById({
                    id: dataset.id,
                  });

                  let parquetBlob: Blob;

                  if (localDataset !== undefined) {
                    parquetBlob = localDataset.parquetData;
                  } else {
                    const openDataDataset = await OpenDataDatasetClient.getOne(
                      where("dataset_id", "eq", dataset.id),
                    );

                    assertIsDefined(openDataDataset, {
                      name: "openDataDataset",
                    });

                    parquetBlob =
                      await OpenDatasetParquetStorageClient.download({
                        catalogEntryId: openDataDataset.catalogEntryId,
                      });
                  }

                  // TODO(jpsyx): this is hugely inefficient but the easiest way
                  // for now. An open dataset should not require re-uploading.
                  // It is slow. Instead, public dashboards should be able to
                  // download directly from the open data buckets.
                  await PublicDatasetParquetStorageClient.uploadDataset({
                    dashboardId,
                    datasetId: dataset.id,
                    parquetBlob,
                  });

                  return;
                }

                // TODO(jpsyx): downloading is probably unnecessary if it
                // already exists in indexed DB. Either way, we shouldn't
                // default to uploading the full dataset. We should find the
                // relevant facts and dice (the superset of all data) and
                // upload only that. Or ask the user if they want to make all
                // dataset available in the dashboard (if they want to let the
                // users do their own exploration).
                const parquetBlob =
                  await DatasetParquetStorageClient.downloadDataset({
                    workspaceId: dashboard.workspaceId,
                    datasetId: dataset.id,
                    throwIfNotFound: true,
                  });

                await PublicDatasetParquetStorageClient.uploadDataset({
                  dashboardId,
                  datasetId: dataset.id,
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

          const updateModel: Partial<Dashboard.T> = { isPublic: true };
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
