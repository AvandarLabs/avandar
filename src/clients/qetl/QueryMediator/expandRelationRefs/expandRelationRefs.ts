import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

import { RelationRef } from "$/models/relations/RelationRef/RelationRef";

/**
 * Expands each relation reference to every relation the engine must reach to
 * answer a query naming it.
 *
 * A dataset expands to itself. A concept expands to itself plus every dataset
 * that contributes one of its attributes, because the concept's view reads
 * those datasets' rows directly: without the expansion they are never loaded
 * and the view binds against nothing. (Once subsumption ships, a concept also
 * expands to every subconcept and their contributors.)
 *
 * Pure, and it takes the concept plans rather than reading the ontology itself,
 * because the read that finds a concept's contributors is the same read that
 * builds its columns. Doing it twice would add queries the old dispatch never
 * made.
 *
 * Two properties, both load-bearing rather than tidy:
 *
 * 1. **Idempotent and order-independent.** The result is sorted by kind then id
 *    and de-duplicated, so the same query yields the same list however its
 *    references were discovered. The relation cache hashes this list into a
 *    cache key, and a key that depended on reference order would miss on every
 *    reordering of the same query.
 * 2. **It never returns a short list.** A contributor that cannot be reached is
 *    refused upstream, where the plan is built, rather than silently omitted
 *    here. A short list means a relation gets loaded that nothing authorized,
 *    or authorized rows served under a key that does not mention them.
 */
export function expandRelationRefs(
  options: Readonly<{
    refs: readonly RelationRef.T[];
    conceptRelations: readonly ConceptRelationPlan[];
  }>,
): RelationRef.T[] {
  const contributorRefs = options.conceptRelations.flatMap((plan) => {
    return [
      plan.ref,
      ...plan.contributingDatasetIds.map((id) => {
        return { kind: "dataset", id } as const;
      }),
    ];
  });

  const refsByTableName = new Map<string, RelationRef.T>();
  [...options.refs, ...contributorRefs].forEach((ref) => {
    // Keyed on the table name rather than on the id: two refs of different
    // kinds may carry the same uuid, and the table name is the one string that
    // tells them apart. `RelationRef` has a test pinning exactly that.
    refsByTableName.set(RelationRef.toTableName(ref), ref);
  });

  return [...refsByTableName.values()].sort((left, right) => {
    return (
      left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id)
    );
  });
}
