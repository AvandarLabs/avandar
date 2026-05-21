import * as duckdb from "@duckdb/duckdb-wasm";
import { describe, expect, it } from "vitest";
import { buildManualDuckDbBundles } from "./duckDbManualBundles";

describe("buildManualDuckDbBundles", () => {
  it("does not register the COI pthread bundle", () => {
    const bundles = buildManualDuckDbBundles();
    expect(bundles.coi).toBeUndefined();
  });

  it("never selects a pthread worker (avoids wasm_threads extensions)", async () => {
    const bundles = buildManualDuckDbBundles();
    const selected = await duckdb.selectBundle(bundles);
    expect(selected.pthreadWorker).toBeNull();
    expect(selected.mainModule).toBe(
      (await duckdb.getPlatformFeatures()).wasmExceptions ?
        bundles.eh?.mainModule
      : bundles.mvp.mainModule,
    );
  });
});
