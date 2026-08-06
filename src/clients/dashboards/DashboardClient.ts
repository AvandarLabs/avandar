import { notifyError } from "@ui";
import {
  assertIsDefined,
  makeBucketRecord,
  promiseMap,
  prop,
  where,
} from "@utils";
import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { APIClient } from "@/clients/APIClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { extractDatasetIdsFromDashboardConfig } from "@/clients/dashboards/extractDatasetIdsFromDashboardConfig";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { OpenDatasetParquetStorageClient } from "@/clients/storage/OpenDatasetParquetStorageClient/OpenDatasetParquetStorageClient";
import { PublicDatasetParquetStorageClient } from "@/clients/storage/PublicDatasetParquetStorageClient/PublicDatasetParquetStorageClient";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

export const DashboardClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Dashboard",
    tableName: "dashboards",
    dbTablePrimaryKey: "id",
    parsers: DashboardParsers,
    // dbClient is now injected by createRdbCrudClient; nothing to pass here
    mutations: (config) => {
      return {
        /**
         * Publishes a dashboard (sets isPublic to true) and copies dependent
         * dataset parquet blobs into the public storage bucket so the dashboard
         * can be publicly loadable.
         */
        publishDashboard: async (params: {
          dashboardId: Dashboard.Id;
          /**
           * Optional vanity slug. The caller is responsible for snake-casing /
           * sanitising; the server-side uniqueness constraint catches
           * collisions.
           *
           * Omit the option to preserve the current slug. Use `set` to
           * register a vanity URL or `clear` to remove the existing slug.
           */
          slug?: { action: "set"; value: string } | { action: "clear" };
          /**
           * Per-dataset slice configuration. When provided, replaces any
           * previously-persisted slice config and is also persisted into the
           * dashboard's `config` JSON blob so subsequent re-publishes default
           * to the same selection. When omitted, falls back to whatever is
           * already persisted (or the narrowest default per dataset).
           */
          publishConfig?: PublishSliceConfig.Dashboard;
        }): Promise<Dashboard.T> => {
          const {
            dashboardId,
            slug,
            publishConfig: incomingPublishConfig,
          } = params;
          const logger = config.clientLogger.appendName("publishDashboard");

          const dashboard = await DashboardClient.getById({
            id: dashboardId,
          });
          assertIsDefined(dashboard, { name: "dashboard" });

          const publishConfig: PublishSliceConfig.Dashboard =
            incomingPublishConfig ??
            DashboardSliceBuilder.readDashboardPublishConfig(dashboard.config);

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
                    id: { in: datasetIdCandidates as Dataset.Id[] },
                    workspace_id: { eq: dashboard.workspaceId },
                  },
                });

            const dependentDatasetIds: Dataset.Id[] = datasetsInDashboard.map(
              prop("id"),
            );

            logger.log("Copying dataset parquet blobs to public bucket", {
              dashboardId,
              dependentDatasetIds,
            });

            // Resolve "what columns does the dashboard actually read" once,
            // so the per-dataset materialization step can apply a narrowest
            // projection by default.
            const referenced = DashboardSliceBuilder.extractReferencedColumns({
              dashboardConfig: dashboard.config,
              allDatasetIds: dependentDatasetIds,
            });

            // Fetch dataset columns for every dependent dataset so we can
            // (a) honour custom slice column allow-lists, and (b) skip
            // row-filter clauses that target columns the dataset doesn't
            // actually have.
            const allColumns = await DatasetColumnClient.getAll({
              where: {
                dataset_id: { in: dependentDatasetIds },
                workspace_id: { eq: dashboard.workspaceId },
              },
            });
            const columnsByDataset = makeBucketRecord(allColumns, {
              key: "datasetId",
              valueKey: "name",
            });

            await promiseMap(datasetsInDashboard, async (dataset) => {
              const slice =
                publishConfig.slices[dataset.id] ?? PublishSliceConfig.DEFAULT;
              const availableColumns = columnsByDataset[dataset.id] ?? [];
              const queriedColumns = Array.from(
                referenced.perDataset[dataset.id] ?? new Set<string>(),
              );
              const treatAsAllColumns = referenced.unparseable.has(dataset.id);

              try {
                if (dataset.sourceType === "virtual") {
                  const virtualDataset = await VirtualDatasetClient.getOne(
                    where("dataset_id", "eq", dataset.id),
                  );

                  assertIsDefined(virtualDataset, {
                    name: "virtualDataset",
                  });

                  const materializedSql = DashboardSliceBuilder.buildSliceSql({
                    baseSelectExpr: virtualDataset.rawSql,
                    sliceConfig: slice,
                    availableColumns,
                    queriedColumns,
                    treatAsAllColumns,
                  });

                  const parquetBlob = await WorkspaceQETLClient.runQuery({
                    rawSql: materializedSql,
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

                // Both open_data and regular workspace datasets are
                // queryable from DuckDB by their dataset id (registered as a
                // view name on demand). For the "queried" or "custom" modes
                // we materialize via SQL; for "all_columns" we keep the
                // existing fast path (no transformation, just copy the
                // existing parquet blob into the public bucket).
                const hasRowFilters =
                  slice.mode === "custom" && slice.rowFilters.length > 0;
                const needsMaterialization =
                  slice.mode !== "all_columns" || hasRowFilters;

                if (needsMaterialization) {
                  const baseSelectExpr = `SELECT * FROM "${dataset.id}"`;
                  const materializedSql = DashboardSliceBuilder.buildSliceSql({
                    baseSelectExpr,
                    sliceConfig: slice,
                    availableColumns,
                    queriedColumns,
                    treatAsAllColumns,
                  });

                  const parquetBlob = await WorkspaceQETLClient.runQuery({
                    rawSql: materializedSql,
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

                // "all_columns" + no row filters: fall back to the original
                // direct-copy path (no transformation).
                if (dataset.sourceType === "open_data") {
                  const localDataset = await LocalDatasetClient.getById({
                    id: dataset.id,
                  });

                  let parquetBlob: Blob;

                  if (
                    localDataset !== undefined &&
                    localDataset.parseStatus === "ready" &&
                    localDataset.parquetData
                  ) {
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

                  await PublicDatasetParquetStorageClient.uploadDataset({
                    dashboardId,
                    datasetId: dataset.id,
                    parquetBlob,
                  });

                  return;
                }

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
                  message: `Some datasets are not synced online yet or failed to publish. ${errorMessage}`,
                });
                throw error;
              }
            });
          }

          // Persist incoming slice config into the dashboard's `config`
          // JSON blob so future re-publishes default to the same selection.
          const nextConfig =
            incomingPublishConfig ?
              DashboardSliceBuilder.writeDashboardPublishConfig({
                dashboardConfig: dashboard.config,
                publishConfig,
              })
            : undefined;

          const updateModel: Partial<Dashboard.T> = {
            isPublic: true,
            ...(slug ?
              { slug: slug.action === "set" ? slug.value : undefined }
            : {}),
            ...(nextConfig ?
              {
                config: nextConfig as unknown as Dashboard.T["config"],
              }
            : {}),
          };
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

        /**
         * Check whether a dashboard slug is available for use as a public
         * vanity URL (`/d/<slug>`). Backed by the
         * `POST dashboards/validate-slug` edge function so the lookup runs
         * with admin privileges and isn't gated by RLS.
         */
        validateDashboardSlug: async (options: {
          slug: string;
          /**
           * The dashboard the user is currently editing. Excluded from the
           * "already taken" check so a public dashboard re-publishing with
           * its existing slug still validates as available.
           */
          dashboardId?: Dashboard.Id;
        }): Promise<{ isValid: true } | DashboardSlugValidationFailure> => {
          const logger = config.clientLogger.appendName(
            "validateDashboardSlug",
          );
          logger.log("Checking dashboard slug availability", options);
          return APIClient.post({
            route: "dashboards/validate-slug",
            body: {
              slug: options.slug,
              dashboardId: options.dashboardId,
            },
          });
        },
      };
    },
  }),
  {
    mutationFns: ["publishDashboard", "validateDashboardSlug", "delete"],
  },
);
