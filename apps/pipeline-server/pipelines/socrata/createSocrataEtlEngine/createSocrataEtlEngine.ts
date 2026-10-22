import { ETL_DEFAULT_SCOPE, EtlEngine } from "@avandar/etl";
import { attachSocrataCsvHeaders } from "@pipelines/socrata/attachSocrataCsvHeaders/attachSocrataCsvHeaders";
import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { extractSocrataDrive } from "@pipelines/socrata/extractSocrataDrive/extractSocrataDrive";
import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import type { SocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type {
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
} from "@avandar/etl";
import type { SocrataDataset } from "@pipelines/socrata/attachSocrataCsvHeaders/attachSocrataCsvHeaders";
import type {
  ConfiguredDrive,
  SocrataScope,
} from "@pipelines/socrata/configuredDrives/configuredDrives";
import type { SocrataCsvHeaderReader } from "@pipelines/socrata/createSocrataCsvHeaderReader/createSocrataCsvHeaderReader";

/**
 * Creates the Socrata pipeline's engine. Each configured drive is crawled
 * and resumed on its own, by each dataset's `updatedAt`, so a newly added
 * drive is indexed from scratch while the others only fetch what changed.
 *
 * @param args.discovery - The Discovery API client every drive shares.
 * @param args.readCsvHeader - Reads a dataset's CSV export header, which
 *   names its columns.
 * @param args.drives - Replaces `CONFIGURED_DRIVES`, for tests.
 * @param args.stores - Replaces the Supabase stores, for tests.
 */
export function createSocrataEtlEngine(
  args: EtlDestination &
    Readonly<{
      discovery: SocrataDiscoveryClient;
      readCsvHeader: SocrataCsvHeaderReader;
      drives?: readonly ConfiguredDrive[];
      stores?: EtlStores;
    }>,
): EtlEngineInstance {
  const {
    discovery,
    readCsvHeader,
    drives = CONFIGURED_DRIVES,
    ...destination
  } = args;
  return EtlEngine.create<ConfiguredDrive, SocrataDataset, SocrataScope>({
    ...destination,
    name: "socrata",
    service: "socrata",
    listDrives: () => {
      return drives;
    },
    getDriveKey: (drive) => {
      return drive.baseUrl;
    },
    listScopes: (drive) => {
      return drive.scopes ?? [ETL_DEFAULT_SCOPE];
    },
    extract: ({ drive, scope, window }) => {
      return attachSocrataCsvHeaders({
        pages: extractSocrataDrive({ drive, scope, window, discovery }),
        drive,
        readCsvHeader,
      });
    },
    getConnectionId: (result) => {
      return result.datasetId;
    },
    transform: ({ drive, connection }) => {
      const relation = makeApiResourceRelationFromSocrataResult({
        drive,
        result: connection,
      });
      return relation === undefined ? [] : [relation];
    },
    incremental: {
      getConnectionTimestamp: (result) => {
        return new Date(result.updatedAt);
      },
    },
  });
}
