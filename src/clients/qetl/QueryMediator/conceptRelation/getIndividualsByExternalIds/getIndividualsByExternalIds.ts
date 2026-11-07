import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { partition } from "@/lib/utils/arrays/partition/partition";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

/**
 * How many record keys one Postgres read names. The keys travel in the
 * request URL as a PostgREST `in` list, so the bound keeps that URL short.
 */
export const MAX_EXTERNAL_IDS_PER_READ = 50;

/**
 * Whether a key can travel inside a PostgREST `in` list unchanged.
 *
 * `postgrest-js` wraps a list value in double quotes when it holds `,`, `(`,
 * or `)`, but never escapes a `"` or a `\` inside it, and PostgREST reads both
 * as list syntax. A key holding either is read with an equality filter
 * instead, whose value PostgREST takes verbatim.
 */
function _isListSafeExternalId(externalId: string): boolean {
  return !externalId.includes('"') && !externalId.includes("\\");
}

function _splitIntoBatches(externalIds: readonly string[]): string[][] {
  const batchCount = Math.ceil(externalIds.length / MAX_EXTERNAL_IDS_PER_READ);
  return Array.from({ length: batchCount }, (_, batchIndex) => {
    return externalIds.slice(
      batchIndex * MAX_EXTERNAL_IDS_PER_READ,
      (batchIndex + 1) * MAX_EXTERNAL_IDS_PER_READ,
    );
  });
}

/**
 * Reads the records of one concept whose keys are among `externalIds`. A key
 * that names no record is left out, and each key is read once.
 *
 * Use it when a caller needs a few records by key rather than a whole
 * concept, for example to build a spine restricted to the records one page
 * shows. Reads go through the CRUD client's filters, never through SQL text.
 */
export async function getIndividualsByExternalIds(
  options: Readonly<{
    conceptId: Concept.Id;
    externalIds: readonly string[];
  }>,
): Promise<Individual.T[]> {
  const [listSafeIds, otherIds] = partition(
    removeDuplicates(options.externalIds),
    _isListSafeExternalId,
  );
  const reads = [
    ..._splitIntoBatches(listSafeIds).map((batch) => {
      return IndividualClient.getAll({
        where: {
          concept_id: { eq: options.conceptId },
          external_id: { in: batch },
        },
      });
    }),
    ...otherIds.map((externalId) => {
      return IndividualClient.getAll({
        where: {
          concept_id: { eq: options.conceptId },
          external_id: { eq: externalId },
        },
      });
    }),
  ];
  return (await Promise.all(reads)).flat();
}
