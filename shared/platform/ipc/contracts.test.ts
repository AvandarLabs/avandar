import { describe, expect, expectTypeOf, it } from "vitest";
import { AuthContracts } from "$/platform/ipc/contracts/AuthContracts.ts";
import { DatasetBlobContracts } from "$/platform/ipc/contracts/DatasetBlobContracts.ts";
import {
  defineIpcContract,
  type IpcContract,
} from "$/platform/ipc/contracts/defineIpcContract.ts";
import { DuckDbContracts } from "$/platform/ipc/contracts/DuckDbContracts.ts";
import { RdbContracts } from "$/platform/ipc/contracts/RdbContracts.ts";
import { ServerApiContracts } from "$/platform/ipc/contracts/ServerApiContracts.ts";

describe("defineIpcContract", () => {
  it("returns a typed contract handle with the supplied name", () => {
    const contract = defineIpcContract<
      { rowId: string },
      { row: { id: string; name: string } | null }
    >("rdb.getById");

    expect(contract.name).toBe("rdb.getById");
    expect(typeof contract.parseRequest).toBe("function");
    expect(typeof contract.parseResponse).toBe("function");
  });

  it("parseRequest / parseResponse are identity casts at runtime (Phase 2)", () => {
    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.identity",
    );
    const req = { a: 1 };
    const res = { b: 2 };
    expect(contract.parseRequest(req)).toBe(req);
    expect(contract.parseResponse(res)).toBe(res);
  });

  it("preserves request/response types via the phantom slots", () => {
    type Req = { sql: string; params: unknown[] };
    type Res = { rows: Array<Record<string, unknown>> };
    const contract: IpcContract<Req, Res> = defineIpcContract<Req, Res>(
      "rdb.run",
    );

    expectTypeOf(contract.__request).toEqualTypeOf<Req>();
    expectTypeOf(contract.__response).toEqualTypeOf<Res>();
  });
});

describe("concrete contracts", () => {
  it("declares every RDB channel with the documented name", () => {
    expect(RdbContracts.run.name).toBe("rdb.run");
    expect(RdbContracts.query.name).toBe("rdb.query");
    expect(RdbContracts.transaction.name).toBe("rdb.transaction");
  });

  it("declares every DuckDB channel", () => {
    expect(DuckDbContracts.runRawQuery.name).toBe("duckdb.runRawQuery");
    expect(DuckDbContracts.loadParquetFromDatasetBlobStore.name).toBe(
      "duckdb.loadParquetFromDatasetBlobStore",
    );
    expect(DuckDbContracts.loadFromSourcePath.name).toBe(
      "duckdb.loadFromSourcePath",
    );
  });

  it("declares every dataset-blob channel", () => {
    expect(DatasetBlobContracts.put.name).toBe("datasetBlob.put");
    expect(DatasetBlobContracts.get.name).toBe("datasetBlob.get");
    expect(DatasetBlobContracts.delete.name).toBe("datasetBlob.delete");
    expect(DatasetBlobContracts.exists.name).toBe("datasetBlob.exists");
    expect(DatasetBlobContracts.list.name).toBe("datasetBlob.list");
    expect(DatasetBlobContracts.stat.name).toBe("datasetBlob.stat");
  });

  it("declares every auth channel", () => {
    expect(AuthContracts.signIn.name).toBe("auth.signIn");
    expect(AuthContracts.signOut.name).toBe("auth.signOut");
    expect(AuthContracts.getSession.name).toBe("auth.getSession");
    expect(AuthContracts.refreshIfNeeded.name).toBe("auth.refreshIfNeeded");
  });

  it("declares every server-api channel", () => {
    expect(ServerApiContracts.rpc.name).toBe("serverApi.rpc");
    expect(ServerApiContracts.invokeFunction.name).toBe(
      "serverApi.invokeFunction",
    );
  });

  it("contract names are unique across the entire surface", () => {
    const allContracts = [
      ...Object.values(RdbContracts),
      ...Object.values(DuckDbContracts),
      ...Object.values(DatasetBlobContracts),
      ...Object.values(AuthContracts),
      ...Object.values(ServerApiContracts),
    ];
    const names = allContracts.map((c) => {
      return c.name;
    });
    expect(new Set(names).size).toBe(names.length);
  });
});
