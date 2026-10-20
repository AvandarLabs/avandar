import { EtlEngine } from "@avandar/etl";
import { extractHdxDatasets } from "@pipelines/hdx/extractHdxDatasets/extractHdxDatasets";
import { getHdxDatasetTimestamp } from "@pipelines/hdx/getHdxDatasetTimestamp/getHdxDatasetTimestamp";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { makeApiResourceRelationsFromCkanPackage } from "@pipelines/hdx/makeApiResourceRelationsFromCkanPackage/makeApiResourceRelationsFromCkanPackage";
import type {
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
} from "@avandar/etl";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";
import type { HdxDrive } from "@pipelines/hdx/hdxDrive";

/**
 * Creates the HDX pipeline's engine, which crawls the one HDX drive by
 * `metadata_modified` and writes one listing per readable resource.
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
  return EtlEngine.create<HdxDrive, CkanPackage>({
    ...destination,
    name: "hdx",
    service: "ckan",
    listDrives: () => {
      return hdxDrive === undefined ? [] : [hdxDrive];
    },
    getDriveKey: (current) => {
      return current.baseUrl;
    },
    extract: ({ drive: current, window }) => {
      return extractHdxDatasets({ drive: current, window, discovery });
    },
    getConnectionId: (ckanPackage) => {
      return ckanPackage.name;
    },
    transform: ({ drive: current, connection }) => {
      return makeApiResourceRelationsFromCkanPackage({
        drive: current,
        ckanPackage: connection,
      });
    },
    incremental: { getConnectionTimestamp: getHdxDatasetTimestamp },
  });
}
