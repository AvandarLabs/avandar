import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource.types.ts";
import type { RelationRefT } from "$/models/relations/RelationRef/RelationRef.types.ts";

import { match } from "ts-pattern";

/**
 * Converts the data source a structured query was built against into the
 * relation reference the query engine names it by.
 *
 * The two are deliberately different things, and conflating them is the
 * mistake this function exists to prevent. A `QueryDataSource` is a **model
 * row**: a whole dataset or concept as it is stored, with a name, a workspace,
 * timestamps and everything else a row carries. A `RelationRefT` is a
 * **reference**: a kind and an id, and nothing else, which is all the registry,
 * the wrappers, the cache key and the authorization checks are allowed to
 * depend on. So this is the one place a row narrows to a reference, and it
 * never travels in the other direction: there is no way back from a reference
 * to a row without reading it.
 *
 * The `kind` comes from the model type rather than from the shape of the id,
 * because both ids are UUIDs and a table name is the only place the two are
 * ever told apart by shape (see `RelationRef.fromTableName`).
 */
export function makeRelationRefFromQueryDataSource(
  dataSource: QueryDataSource,
): RelationRefT {
  return match(dataSource)
    .with({ __type: "Concept" }, (concept) => {
      return { kind: "concept", id: concept.id } as const;
    })
    .with({ __type: "Dataset" }, (dataset) => {
      return { kind: "dataset", id: dataset.id } as const;
    })
    .exhaustive();
}
