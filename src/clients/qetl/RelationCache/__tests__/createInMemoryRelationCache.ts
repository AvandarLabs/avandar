import {
  coversColumns,
  normalizeColumns,
} from "$/models/relations/RelationCacheKey/RelationCacheKey";
import type {
  RelationCacheEntry,
  RelationCachePort,
} from "$/models/relations/RelationCachePort/RelationCachePort.types";

/**
 * An in-memory `RelationCachePort` for tests that need a real storage tier
 * rather than a stub.
 *
 * Faithful in the ways the mediator depends on: an entry is only served to the
 * principal that wrote it, `probe` returns hits and misses without touching a
 * payload, `readPayload` is a separate call that can independently return
 * nothing so the "metadata survived, payload did not" path is reachable, and
 * column coverage uses `coversColumns` so a finite entry does not serve a
 * wider request. Matching still ignores `definition`.
 */
export function createInMemoryRelationCache(): RelationCachePort & {
  /** Drops a payload while leaving its metadata, to test a torn write. */
  dropPayload: (principal: string, datasetId: string) => void;
  /** Every identity key currently stored, for assertions about writes. */
  storedKeys: () => string[];
} {
  const entriesByKey = new Map<
    string,
    { entry: RelationCacheEntry; payload: Blob | undefined }
  >();

  const toKey = (principal: string, relationId: string): string => {
    return `${principal}||${relationId}`;
  };

  return {
    probe: async (keys) => {
      const hits: Array<{
        key: (typeof keys)[number];
        entry: RelationCacheEntry;
      }> = [];
      const misses: Array<{
        key: (typeof keys)[number];
        growFrom: RelationCacheEntry | undefined;
      }> = [];
      keys.forEach((key) => {
        const stored = entriesByKey.get(
          toKey(key.principal, key.relation.id),
        );
        if (stored === undefined) {
          misses.push({ key, growFrom: undefined });
          return;
        }
        if (coversColumns(stored.entry.columns, key.columns)) {
          hits.push({ key, entry: stored.entry });
          return;
        }
        misses.push({ key, growFrom: stored.entry });
      });
      return { hits, misses };
    },

    readPayload: async (entry) => {
      return entriesByKey.get(entry.identityKey)?.payload;
    },

    write: async (write) => {
      const identityKey = toKey(
        write.identity.principal,
        write.identity.relation.id,
      );
      entriesByKey.set(identityKey, {
        entry: {
          identityKey,
          relationKind: write.identity.relation.kind,
          definitionKind: write.identity.definition?.kind,
          sourceVersion: write.identity.sourceVersion,
          byteSize: write.payload.size,
          lastQueriedAt: 0,
          writtenAt: 0,
          freshnessCheckedAt: undefined,
          principalKey: write.identity.principal,
          tableName: write.identity.relation.id,
          definitionToken: "",
          columns: normalizeColumns(write.columns),
          staleAt: undefined,
        },
        payload: write.payload,
      });
    },

    touch: async (identityKey) => {
      const stored = entriesByKey.get(identityKey);
      if (stored) {
        stored.entry = { ...stored.entry, lastQueriedAt: 1 };
      }
    },

    evict: async (refs, principal) => {
      refs.forEach((ref) => {
        entriesByKey.delete(toKey(principal, ref.id));
      });
    },

    evictToBudget: async () => {},

    dropPayload: (principal, datasetId) => {
      const stored = entriesByKey.get(toKey(principal, datasetId));
      if (stored) {
        stored.payload = undefined;
      }
    },

    storedKeys: () => {
      return [...entriesByKey.keys()];
    },
  };
}
