import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import { loadConceptSpine } from "@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine";

/**
 * Makes one planned concept queryable: its spine, then its view.
 *
 * The order is required, not stylistic. The view's `FROM` is the spine, and
 * DuckDB binds a view's sources when the view is defined, so a view created
 * ahead of its spine fails outright. The same is true one level up: every
 * contributing dataset must already be loaded, which is why the caller runs
 * this after `loadRelationBytes`.
 *
 * The definition is marked trusted internal SQL, and it has to be: its `FROM`
 * names the spine table, which is deliberately not a relation name, so the
 * fail-closed analyzer cannot account for it and refuses the statement. This is
 * the same mechanism `duckDbParquetLoad` uses for its own `CREATE VIEW`, and it
 * is sound for the same reason: the string is built here from ontology metadata
 * and quoted identifiers, and no caller-supplied SQL reaches it. The analyzer
 * still reports the contributing datasets the definition reads, so the lease
 * and the workspace table assertions still apply to them.
 */
async function _loadConceptRelation(
  options: Readonly<{
    plan: ConceptRelationPlan;
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<void> {
  const spineTableName = await loadConceptSpine({
    ref: options.plan.ref,
    externalIds: options.plan.externalIds,
    datasetDuckDbLease: options.datasetDuckDbLease,
  });

  await DuckDbClient.runRawQuery(
    buildConceptViewSql({
      viewName: RelationRef.toTableName(options.plan.ref),
      spineTableName,
      attributeColumns: options.plan.attributeColumns,
    }),
    {
      datasetDuckDbLease: options.datasetDuckDbLease,
      [TRUSTED_INTERNAL_SQL]: true,
    },
  );
}

/**
 * Registers every planned concept as a DuckDB relation under the query's lease.
 *
 * Sequential rather than concurrent. Two concepts of one query commonly share a
 * contributing dataset, and each spine load is a drop-and-recreate; running
 * them in order keeps the DDL sequence deterministic, and there is nothing to
 * gain from parallelism at the one-or-two concepts a query names.
 *
 * Both artefacts are replaced on every query rather than reused. That is what
 * makes staleness impossible without a freshness rule of its own: the view is
 * only a definition, so rebuilding it is nearly free, and the spine is the one
 * thing that could go stale. Caching the spine is the relation cache's
 * business.
 */
export async function loadConceptRelations(
  options: Readonly<{
    conceptRelations: readonly ConceptRelationPlan[];
    datasetDuckDbLease: DatasetDuckDbLease;
  }>,
): Promise<void> {
  await options.conceptRelations.reduce<Promise<void>>(
    async (priorLoad, plan) => {
      // react-doctor-disable-next-line
      await priorLoad;
      // react-doctor-disable-next-line
      await _loadConceptRelation({
        plan,
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
    },
    Promise.resolve(),
  );
}
