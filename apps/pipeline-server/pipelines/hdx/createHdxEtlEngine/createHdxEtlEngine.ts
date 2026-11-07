import { EtlEngine } from "@avandar/etl";
import { createHdxFileColumnReader } from "@pipelines/hdx/createHdxFileColumnReader/createHdxFileColumnReader";
import { extractHdxDatasets } from "@pipelines/hdx/extractHdxDatasets/extractHdxDatasets";
import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { HDX_SCOPES } from "@pipelines/hdx/hdxScopes";
import { makeApiResourceRelationsFromCkanPackage } from "@pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";
import type {
  CatalogFieldMapper,
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
  EtlWorkspaceLoadabilityRules,
} from "@avandar/etl";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";
import type { HdxScope } from "@pipelines/hdx/hdxScopes";
import type { HdxFileColumnReader } from "@pipelines/hdx/readHdxResourceColumns/readHdxResourceColumns";

/**
 * Creates the HDX pipeline's engine, which crawls the HDX drive by
 * `metadata_modified` and writes one listing per resource. Only a hosted
 * CSV or Parquet resource whose columns can be read is workspace-loadable.
 * Each drive is crawled once per scope in `HDX_SCOPES`, asking CKAN only for
 * datasets with a resource in that format, or for every dataset in the
 * scope that covers every other format.
 *
 * Each package's catalog metadata comes from the pipeline config's field
 * mapping. A field that cannot be mapped is left out with a warning, and a
 * package whose `organization1_name` maps to nothing is skipped with a
 * warning. The drive's organization labels are recorded in the drives table.
 *
 * @param args.discovery - The CKAN discovery client for HDX.
 * @param args.drives - The drives to crawl, from `listHdxDrives`. An empty
 *   list crawls nothing.
 * @param args.mapper - The pipeline config's compiled field mapper.
 * @param args.stores - Replaces the Supabase stores, for tests.
 * @param args.readFileColumns - Replaces the DuckDB reader that resources
 *   without usable HDX headers fall back to, for tests.
 * @param args.workspaceLoadability - The formats a workspace cannot load.
 */
export function createHdxEtlEngine(
  args: EtlDestination &
    Readonly<{
      discovery: CkanDiscoveryClient;
      drives: readonly HdxDrive[];
      mapper: CatalogFieldMapper;
      stores?: EtlStores;
      readFileColumns?: HdxFileColumnReader;
      workspaceLoadability?: EtlWorkspaceLoadabilityRules;
    }>,
): EtlEngineInstance {
  const { discovery, drives, mapper, readFileColumns, ...destination } = args;
  return EtlEngine.create<HdxDrive, CkanPackage, HdxScope>({
    ...destination,
    name: "hdx",
    service: "ckan",
    listDrives: () => {
      return drives;
    },
    getDriveKey: (current) => {
      return current.baseUrl;
    },
    describeDrive: (current) => {
      return { organizationLabels: current.organizationLabels };
    },
    listScopes: () => {
      return HDX_SCOPES;
    },
    extract: ({ drive: current, scope, window }) => {
      return extractHdxDatasets({
        drive: current,
        window,
        discovery,
        resourceFormats:
          scope.resourceFormat === undefined
            ? undefined
            : [scope.resourceFormat],
      });
    },
    getConnectionId: (ckanPackage) => {
      return ckanPackage.name;
    },
    transform: async ({ drive: current, scope, connection, metrics }) => {
      const { fields, problems } = mapper.mapFields(
        connection.sourceRecord,
        current.baseUrl,
      );
      problems.forEach((problem) => {
        console.warn(
          `[hdx] ${connection.name} ${problem.field}: ${problem.message}`,
        );
      });
      const { organization1Name } = fields;
      if (organization1Name === undefined) {
        console.warn(
          `[hdx] skipped ${connection.name}: organization1_name mapped to nothing`,
        );
        return [];
      }
      return await makeApiResourceRelationsFromCkanPackage({
        drive: current,
        ckanPackage: connection,
        scope,
        metrics,
        mappedFields: { ...fields, organization1Name },
        readFileColumns:
          readFileColumns ??
          createHdxFileColumnReader({ baseUrl: current.baseUrl }),
      });
    },
    incremental: { getConnectionTimestamp: getHdxDatasetTimestamp },
  });
}
