import type { RelationCacheEntry } from "$/models/relations/RelationCachePort/RelationCachePort.types";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";

/**
 * The metadata-only row for one cached relation. Never carries the payload
 * (`RelationCachePayload` does), so a byte-budget scan over this table never
 * deserializes a blob.
 */
export type RelationCacheEntryModel = DexieCrudModelSpec<{
  modelName: "RelationCacheEntry";
  primaryKey: "identityKey";
  primaryKeyType: string;
  dbTypes: {
    DBRead: RelationCacheEntry;
    DBUpdate: Partial<RelationCacheEntry>;
  };
  modelTypes: {
    Read: RelationCacheEntry;
    Update: Partial<RelationCacheEntry>;
  };
}>;
