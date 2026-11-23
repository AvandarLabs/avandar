import { EtlEngine, SYSTEM_CLOCK } from "@avandar/etl";
import { extractGhoDrive } from "@pipelines/gho/extractGhoDrive/extractGhoDrive";
import { makeGhoDimensionRelation } from "@pipelines/gho/makeGhoDimensionRelation/makeGhoDimensionRelation";
import { makeGhoIndicatorRelation } from "@pipelines/gho/makeGhoIndicatorRelation/makeGhoIndicatorRelation";
import { readGhoIndicatorSchemas } from "@pipelines/gho/readGhoIndicatorSchemas/readGhoIndicatorSchemas";
import { match } from "ts-pattern";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  CatalogFieldMapper,
  EtlClock,
  EtlDestination,
  EtlEngineInstance,
  EtlStores,
  EtlWorkspaceLoadabilityRules,
  Relation,
} from "@avandar/etl";
import type {
  GhoConnection,
  GhoCrawlDrive,
  GhoScope,
} from "@pipelines/gho/gho.types";
import type { GhoDrive } from "@pipelines/gho/ghoDrive/ghoDrive";

/** GHO's scopes, crawled in this order. */
const GHO_SCOPES: readonly GhoScope[] = [
  { key: "indicators" },
  { key: "dimensions" },
];

/**
 * The drives as this run crawls them, each with every indicator's schema
 * from one `$metadata` read and the run's check time.
 */
async function _listCrawlDrives(
  args: Readonly<{
    drives: readonly GhoDrive[];
    http: OpenDataHttp;
    clock: EtlClock;
  }>,
): Promise<GhoCrawlDrive[]> {
  return await Promise.all(
    args.drives.map(async (drive) => {
      return {
        ...drive,
        indicatorSchemas: await readGhoIndicatorSchemas({
          http: args.http,
          baseUrl: drive.baseUrl,
        }),
        checkedAt: args.clock.now(),
      };
    }),
  );
}

/** The one relation a probed connection becomes, or none when unmapped. */
function _transformConnection(
  args: Readonly<{
    drive: GhoCrawlDrive;
    connection: GhoConnection;
    mapper: CatalogFieldMapper;
  }>,
): Relation[] {
  const { drive, connection } = args;
  const { fields, problems } = args.mapper.mapFields(
    connection.sourceRecord,
    drive.baseUrl,
  );
  problems.forEach((problem) => {
    console.warn(
      `[gho] ${connection.code} ${problem.field}: ${problem.message}`,
    );
  });
  const { organization1Name } = fields;
  if (organization1Name === undefined) {
    console.warn(
      `[gho] skipped ${connection.code}: organization1_name mapped to nothing`,
    );
    return [];
  }
  const mappedFields = { ...fields, organization1Name };
  return [
    match(connection)
      .with({ kind: "indicator" }, (indicator) => {
        return makeGhoIndicatorRelation({
          drive,
          connection: indicator,
          mappedFields,
        });
      })
      .with({ kind: "dimension" }, (dimension) => {
        return makeGhoDimensionRelation({
          drive,
          connection: dimension,
          mappedFields,
        });
      })
      .exhaustive(),
  ];
}

/**
 * Creates the GHO pipeline's engine, which lists every WHO Global Health
 * Observatory indicator and every dimension's value list as an `odata`
 * listing.
 *
 * Each run reads `$metadata` once, before any crawl, so every indicator's
 * schema is checked against `GHO_FACT_COLUMNS`; a run that cannot read it
 * fails whole. Listing the scopes reads it too. GHO lists no modified
 * times, so the engine has no incremental runs: every run probes every
 * indicator and dimension, and the engine writes only the listings that
 * changed.
 *
 * Each listing's catalog metadata comes from the pipeline config's field
 * mapping. A field that cannot be mapped is left out with a warning, and a
 * record whose `organization1_name` maps to nothing is skipped with a
 * warning. The drive's organization labels are recorded in the drives table.
 *
 * @param args.http - The GHO client, from `createGhoHttpClient`.
 * @param args.drives - The drives to crawl, from `listGhoDrives`.
 * @param args.mapper - The pipeline config's compiled field mapper.
 * @param args.stores - Replaces the Supabase stores, for tests.
 * @param args.clock - Replaces the system clock, for tests.
 * @param args.workspaceLoadability - The formats a workspace cannot load.
 */
export function createGhoEtlEngine(
  args: EtlDestination &
    Readonly<{
      http: OpenDataHttp;
      drives: readonly GhoDrive[];
      mapper: CatalogFieldMapper;
      stores?: EtlStores;
      clock?: EtlClock;
      workspaceLoadability?: EtlWorkspaceLoadabilityRules;
    }>,
): EtlEngineInstance {
  const { http, drives, mapper, ...destination } = args;
  const clock = args.clock ?? SYSTEM_CLOCK;
  return EtlEngine.create<GhoCrawlDrive, GhoConnection, GhoScope>({
    ...destination,
    name: "gho",
    service: "odata",
    listDrives: () => {
      return _listCrawlDrives({ drives, http, clock });
    },
    getDriveKey: (drive) => {
      return drive.baseUrl;
    },
    describeDrive: (drive) => {
      return { organizationLabels: drive.organizationLabels };
    },
    listScopes: () => {
      return GHO_SCOPES;
    },
    extract: ({ drive, scope }) => {
      return extractGhoDrive({ drive, scope, http });
    },
    getConnectionId: (connection) => {
      return `${connection.kind}:${connection.code}`;
    },
    transform: ({ drive, connection }) => {
      return _transformConnection({ drive, connection, mapper });
    },
  });
}
