import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PrincipalKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCachePort } from "$/models/relations/RelationCachePort/RelationCachePort.types";
import type {
  DatasetDuckDbLease,
  PublicSnapshotDuckDbOwner,
} from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type { NeededColumnsByDatasetId } from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { Module } from "@avandar/modules";

import { createModuleFactory } from "@avandar/modules";

import { createQetlQueryRunner } from "@/clients/qetl/QueryMediator/queryRunner";

export type IQueryMediator = Module<
  "QueryMediator",
  {
    /** Get the necessary relation to answer the given SQL query. */
    getQueryDependencies: (rawSql: string) => Promise<Dataset.Id[]>;
    /**
     * Plan the concept relations the query names, refusing any the caller may
     * not read. Optional: a session with no ontology access supplies none.
     */
    planConceptRelations?: (rawSql: string) => Promise<ConceptRelationPlan[]>;
    /** Expand direct dependencies to every dataset lease the query may need. */
    getDuckDbLeaseDatasetIds?: (
      queryDependencies: readonly Dataset.Id[],
    ) => Promise<Dataset.Id[]>;
    /** Selects the ownership policy for final DuckDB reads. */
    duckDbReadMode?: "public" | "workspace";
    /** Identifies the public snapshot expected to own final read tables. */
    publicSnapshotDuckDbOwner?: PublicSnapshotDuckDbOwner;

    /** The storage tier this session reads and writes. */
    relationCache: RelationCachePort;
    /** The principal every entry in that tier is scoped to. */
    principalKey: PrincipalKey;
    /** Prepares ownership state after the query's dataset leases are held. */
    prepareDuckDbDatasets?: (
      params: Readonly<{
        datasetIds: readonly Dataset.Id[];
        datasetDuckDbLease: DatasetDuckDbLease;
      }>,
    ) => Promise<void>;
  },
  {
    /**
     * Runs an OLAP query. Use `returnType: "parquet"` to materialize the full
     * result set as a Parquet blob.
     */
    runQuery: {
      <RowObject extends UnknownRow = UnknownRow>(params: {
        rawSql: string;
        returnType?: "js";
        signal?: AbortSignal;
        neededColumnsByDatasetId?: NeededColumnsByDatasetId;
      }): Promise<QueryResult.T<RowObject>>;
      (params: {
        rawSql: string;
        returnType: "parquet";
        signal?: AbortSignal;
        neededColumnsByDatasetId?: NeededColumnsByDatasetId;
      }): Promise<Blob>;
    };
  }
>;

/**
 * This is the powerhouse of Avandar. It powers our Qetl architecture for
 * on-demand ETL queries.
 *
 * Based heavily on Baldacci et. al. (2017)
 * "Qetl: An approach to on-demand ETL from non-owned data sources."
 *
 * In this implementation the relation cache has two tiers. The
 * `QueryableRelationCache` is a local DuckDB database, and it is the only tier
 * queries actually read from. Above it sits the `StorageRelationCache`, backed
 * by IndexedDB, which has more capacity but is never queried: it is an on-disk
 * cache that makes loading a relation into the queryable tier cheap and cuts
 * the number of network requests.
 *
 * Future work will allow this to be abstracted to any database, so that
 * SQLite WASM can be used for transactional Qetl.
 *
 * TODO(jpsyx): this is **far** from a real Qetl implementation. Currently
 * it only operates on full datasets rather than doing any filtering of data,
 * relation management, relation loading, or any other optimizations.
 */
export const QueryMediatorFactory = createModuleFactory<IQueryMediator>(
  "QueryMediator",
  {
    childBuilder: (module) => {
      return { runQuery: createQetlQueryRunner(module.getState()) };
    },
  },
);
