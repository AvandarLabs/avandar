import { ETL_DEFAULT_SCOPE, EtlEngine } from "@avandar/etl";
import { extractSocrataDrive } from "@pipelines/socrata/extractSocrataDrive/extractSocrataDrive";
import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type {
  CatalogFieldMapper,
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
  EtlWorkspaceLoadabilityRules,
} from "@avandar/etl";
import type {
  ConfiguredDrive,
  SocrataScope,
} from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * Creates the Socrata pipeline's engine. Each configured drive is crawled
 * and resumed on its own, by each asset's `updatedAt`, so a newly added
 * drive is indexed from scratch while the others only fetch what changed.
 * Every asset becomes a listing. Only a dataset or filtered view with
 * exported columns, in a format the rules allow, is workspace-loadable.
 *
 * Each result's catalog metadata comes from the pipeline config's field
 * mapping. A field that cannot be mapped is left out with a warning, and a
 * result whose `organization1_name` maps to nothing is skipped with a
 * warning. Each drive's organization labels are recorded in the drives
 * table.
 *
 * @param args.discovery - The Discovery API client every drive shares.
 * @param args.drives - The drives to crawl, from `listConfiguredDrives`.
 * @param args.mapper - The pipeline config's compiled field mapper.
 * @param args.stores - Replaces the Supabase stores, for tests.
 * @param args.workspaceLoadability - The formats a workspace cannot load.
 */
export function createSocrataEtlEngine(
  args: EtlDestination &
    Readonly<{
      discovery: SocrataDiscoveryClient;
      drives: readonly ConfiguredDrive[];
      mapper: CatalogFieldMapper;
      stores?: EtlStores;
      workspaceLoadability?: EtlWorkspaceLoadabilityRules;
    }>,
): EtlEngineInstance {
  const { discovery, drives, mapper, ...destination } = args;
  return EtlEngine.create<
    ConfiguredDrive,
    SocrataDiscoveryResult,
    SocrataScope
  >({
    ...destination,
    name: "socrata",
    service: "socrata",
    listDrives: () => {
      return drives;
    },
    getDriveKey: (drive) => {
      return drive.baseUrl;
    },
    describeDrive: (drive) => {
      return { organizationLabels: drive.organizationLabels };
    },
    listScopes: (drive) => {
      return drive.scopes ?? [ETL_DEFAULT_SCOPE];
    },
    extract: ({ drive, scope, window }) => {
      return extractSocrataDrive({ drive, scope, window, discovery });
    },
    getConnectionId: (result) => {
      return result.datasetId;
    },
    transform: ({ drive, connection }) => {
      const { fields, problems } = mapper.mapFields(
        connection.sourceRecord,
        drive.baseUrl,
      );
      problems.forEach((problem) => {
        console.warn(
          `[socrata] drive ${drive.baseUrl}: ${connection.datasetId} ${problem.field}: ${problem.message}`,
        );
      });
      const { organization1Name } = fields;
      if (organization1Name === undefined) {
        console.warn(
          `[socrata] drive ${drive.baseUrl}: skipped ${connection.datasetId}: organization1_name mapped to nothing`,
        );
        return [];
      }
      return [
        makeApiResourceRelationFromSocrataResult({
          drive,
          result: connection,
          mappedFields: { ...fields, organization1Name },
        }),
      ];
    },
    incremental: {
      getConnectionTimestamp: (result) => {
        return new Date(result.updatedAt);
      },
    },
  });
}
