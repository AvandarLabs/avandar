import { where } from "@avandar/utils";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { readDatasetRelationSchema } from "@/clients/qetl/wrappers/DatasetParquetWrapper/readDatasetRelationSchema";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { RelationCapabilities } from "$/models/relations/RelationCapabilities/RelationCapabilities.types";
import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  AcquiredRelation,
  SourceWrapper,
} from "$/models/relations/SourceWrapper/SourceWrapper.types";

type DatasetRef = Extract<RelationRef.T, { kind: "dataset" }>;

const CAPABILITIES = {
  relations: "single",
  acquisitionUnit: { kind: "whole-relation" },

  /**
   * A virtual dataset is defined by SQL that is executed in full to produce
   * Parquet; there is no interface to hand it an extra filter, so nothing can
   * be pushed down.
   */
  predicatePushdown: "none",
  aggregatePushdown: false,
  wholeRelationAcquirable: "yes",
  maxRowsPerCall: "unbounded",
  maxBytesPerCall: "unbounded",

  /**
   * A virtual dataset's materialization is not invalidated when its SQL is
   * edited, so there is no token that tells us it changed. Declaring `none`
   * keeps the mediator from believing it has a freshness answer here.
   */
  freshnessSignal: "none",

  /**
   * The defining SQL may reorder or reshape rows on every run, so a row's
   * position is not an identity either.
   */
  rowIdentity: "none",

  /** One nested query produces the whole relation, so it is one snapshot. */
  multiCallAtomicity: true,
  quotaScope: { kind: "none" },
  grantedScope: [],
} satisfies RelationCapabilities;

type VirtualDatasetWrapperOptions = {
  /**
   * Runs the virtual dataset's defining SQL and returns Parquet bytes.
   *
   * Required, and bound per query rather than per wrapper, because the nested
   * query must run under the caller's DuckDB dataset lease: it loads further
   * tables into the shared queryable relation cache, so it cannot open a lease
   * of its own.
   * `WrapperContext` carries no lease, so the caller closes over it.
   */
  runParquetQuery: (params: Readonly<{ rawSql: string }>) => Promise<Blob>;

  /** Reads the defining SQL. Injected so a test needs no client. */
  getRawSql?: (ref: DatasetRef) => Promise<string>;
};

async function _getRawSql(ref: DatasetRef): Promise<string> {
  const sourceDatasets = await VirtualDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", [ref.id]));
  const sourceDataset = sourceDatasets[0];
  if (!sourceDataset) {
    throw new Error(`No virtual source record for dataset '${ref.id}'`);
  }
  return sourceDataset.rawSql;
}

/**
 * Acquires a `virtual` dataset by executing its defining SQL, which is the
 * recursive case: the query that materializes this relation is itself a QETL
 * query that may acquire other relations first.
 */
export function createVirtualDatasetWrapper(
  options: Readonly<VirtualDatasetWrapperOptions>,
): SourceWrapper<DatasetRef> {
  const getRawSql = options.getRawSql ?? _getRawSql;

  return {
    name: "virtual-dataset",
    capabilities: CAPABILITIES,

    handles: (ref): ref is DatasetRef => {
      return ref.kind === "dataset";
    },

    describe: async (ref) => {
      return await readDatasetRelationSchema(ref.id);
    },

    // The column subset is ignored: the defining SQL fixes the result's
    // columns, and a returned superset satisfies the request.
    acquire: async ({ ref }): Promise<AcquiredRelation> => {
      return {
        ref,
        parquetBlob: await options.runParquetQuery({
          rawSql: await getRawSql(ref),
        }),
        sourceVersion: undefined,
      };
    },
  };
}
