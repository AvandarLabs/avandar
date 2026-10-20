import { createInMemoryObjectStore } from "@etl/stores/InMemoryObjectStore/createInMemoryObjectStore";
import { describe, expect, it } from "vitest";

describe("createInMemoryObjectStore", () => {
  it("is not changed by editing the uploaded bytes afterwards", async () => {
    const store = createInMemoryObjectStore();
    const bytes = new Uint8Array([1, 2, 3]);
    await store.upload({ path: "a.parquet", bytes, contentType: "x" });

    bytes[0] = 9;

    expect(store.getObject("a.parquet")).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("is not changed by editing the bytes a read returns", async () => {
    const store = createInMemoryObjectStore();
    await store.upload({
      path: "a.parquet",
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "x",
    });

    const read = store.getObject("a.parquet");
    if (read !== undefined) {
      read[0] = 9;
    }

    expect(store.getObject("a.parquet")).toEqual(new Uint8Array([1, 2, 3]));
  });
});
