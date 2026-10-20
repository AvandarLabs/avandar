import { EtlEngine } from "@avandar/etl";
import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { extractSocrataDrive } from "@pipelines/socrata/extractSocrataDrive/extractSocrataDrive";
import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import type {
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
} from "@avandar/etl";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type { ConfiguredDrive } from "@pipelines/socrata/configuredDrives/configuredDrives";

/**
 * Creates the Socrata pipeline's engine. Each configured drive is crawled
 * and resumed on its own, by each dataset's `updatedAt`, so a newly added
 * drive is indexed from scratch while the others only fetch what changed.
 *
 * @param args.discovery - The Discovery API client every drive shares.
 * @param args.drives - Replaces `CONFIGURED_DRIVES`, for tests.
 * @param args.stores - Replaces the Supabase stores, for tests.
 */
export function createSocrataEtlEngine(
  args: EtlDestination &
    Readonly<{
      discovery: SocrataDiscoveryClient;
      drives?: readonly ConfiguredDrive[];
      stores?: EtlStores;
    }>,
): EtlEngineInstance {
  const { discovery, drives = CONFIGURED_DRIVES, ...destination } = args;
  return EtlEngine.create<ConfiguredDrive, SocrataDiscoveryResult>({
    ...destination,
    name: "socrata",
    service: "socrata",
    listDrives: () => {
      return drives;
    },
    getDriveKey: (drive) => {
      return drive.baseUrl;
    },
    extract: ({ drive, window }) => {
      return extractSocrataDrive({ drive, window, discovery });
    },
    getConnectionId: (result) => {
      return result.datasetId;
    },
    transform: ({ drive, connection }) => {
      return [
        makeApiResourceRelationFromSocrataResult({ drive, result: connection }),
      ];
    },
    incremental: {
      getConnectionTimestamp: (result) => {
        return new Date(result.updatedAt);
      },
    },
  });
}
