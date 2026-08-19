import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";

/**
 * Bytes only, keyed the same way as its `RelationCacheEntry` row. Splitting
 * the payload out of the metadata table is what lets a byte-budget scan sum
 * `RelationCacheEntry.byteSize` without ever reading a blob.
 */
export type RelationCachePayloadRead = {
  identityKey: string;
  parquetBlob: Blob;
};

export type RelationCachePayloadModel = DexieCrudModelSpec<{
  modelName: "RelationCachePayload";
  primaryKey: "identityKey";
  primaryKeyType: string;
  dbTypes: {
    DBRead: RelationCachePayloadRead;
    DBUpdate: Partial<RelationCachePayloadRead>;
  };
  modelTypes: {
    Read: RelationCachePayloadRead;
    Update: Partial<RelationCachePayloadRead>;
  };
}>;
