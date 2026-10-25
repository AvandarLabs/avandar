/** Tests how the storage relation cache hands cached payloads to the loader. */

import { MIMEType } from "@avandar/utils";
import { describe, expect, it, vi } from "vitest";
import { probeStorageRelationCache } from "@/clients/qetl/QueryMediator/relationLoading/relationLoading";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: {} };
});

vi.mock(
  "@/clients/qetl/QueryMediator/relationLoading/createRegistryForFetch",
  () => {
    return { createRegistryForFetch: vi.fn() };
  },
);

describe("probeStorageRelationCache", () => {
  it("serves a cached payload stored without a type as Parquet", async () => {
    const relationCache = createInMemoryRelationCache();
    await relationCache.write({
      identity: {
        principal: PRINCIPAL_KEY,
        relation: { kind: "dataset", id: DATASET_ID },
        definition: undefined,
        sourceVersion: undefined,
      },
      columns: "all",
      payload: new Blob(["parquet-bytes"]),
    });

    const { cachedRelations } = await probeStorageRelationCache({
      datasetIds: [DATASET_ID],
      neededByDatasetId: {},
      relationCache,
      principalKey: PRINCIPAL_KEY,
    });

    // `registerParquetFile` refuses an untyped blob, so an entry written
    // before acquisition typed its blobs would otherwise fail every load.
    expect(cachedRelations).toHaveLength(1);
    expect(cachedRelations[0]?.parquetBlob.type).toBe(
      MIMEType.APPLICATION_PARQUET,
    );
    expect(cachedRelations[0]?.parquetBlob.size).toBe(
      "parquet-bytes".length,
    );
  });
});
