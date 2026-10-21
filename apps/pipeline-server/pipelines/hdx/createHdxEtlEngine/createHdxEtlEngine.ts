import { EtlEngine } from "@avandar/etl";
import { extractHdxDatasets } from "@pipelines/hdx/extractHdxDatasets/extractHdxDatasets";
import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { HDX_SCOPES } from "@pipelines/hdx/hdxScopes";
import { makeApiResourceRelationsFromCkanPackage } from "@pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage";
import type {
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
} from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";
import type { HdxScope } from "@pipelines/hdx/hdxScopes";

/**
 * Creates the HDX pipeline's engine, which crawls the one HDX drive by
 * `metadata_modified` and writes one listing per readable resource. Each
 * drive is crawled once per scope in `HDX_SCOPES`, asking CKAN only for
 * datasets with a resource in that format.
 *
 * @param args.discovery - The CKAN discovery client for HDX.
 * @param args.drive - Replaces `HDX_DRIVE`; `undefined` crawls nothing.
 * @param args.stores - Replaces the Supabase stores, for tests.
 */
export function createHdxEtlEngine(
  args: EtlDestination &
    Readonly<{
      discovery: CkanDiscoveryClient;
      drive?: HdxDrive | undefined;
      stores?: EtlStores;
    }>,
): EtlEngineInstance {
  const { discovery, drive, ...destination } = args;
  const hdxDrive = "drive" in args ? drive : HDX_DRIVE;
  return EtlEngine.create<HdxDrive, CkanPackage, HdxScope>({
    ...destination,
    name: "hdx",
    service: "ckan",
    listDrives: () => {
      return hdxDrive === undefined ? [] : [hdxDrive];
    },
    getDriveKey: (current) => {
      return current.baseUrl;
    },
    listScopes: () => {
      return HDX_SCOPES;
    },
    extract: ({ drive: current, scope, window }) => {
      return extractHdxDatasets({
        drive: current,
        window,
        discovery,
        resourceFormats: [scope.resourceFormat],
      });
    },
    getConnectionId: (ckanPackage) => {
      return ckanPackage.name;
    },
    transform: ({ drive: current, scope, connection }) => {
      return makeApiResourceRelationsFromCkanPackage({
        drive: current,
        ckanPackage: connection,
        resourceFormat: scope.resourceFormat,
      });
    },
    incremental: { getConnectionTimestamp: getHdxDatasetTimestamp },
  });
}
