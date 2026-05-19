import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDbContracts } from "$/platform/ipc/contracts/DuckDbContracts";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createDuckDbService } from "../../services/createDuckDbService/createDuckDbService";
import { createIpcServer } from "../createIpcServer/createIpcServer";
import { registerDuckDbHandlers } from "./registerDuckDbHandlers";
import type { ReplyEnvelope, RequestEnvelope } from "$/platform/ipc/envelopes";

type FakeTransport = {
  on: (channel: string, callback: (message: unknown) => void) => void;
  send: (channel: string, message: unknown) => void;
  channels: Map<string, Array<(message: unknown) => void>>;
  replies: Array<{ channel: string; message: ReplyEnvelope }>;
};

function createFakeTransport(): FakeTransport {
  const channels = new Map<string, Array<(message: unknown) => void>>();
  const replies: Array<{ channel: string; message: ReplyEnvelope }> = [];
  return {
    channels,
    replies,
    on(channel, callback) {
      const list = channels.get(channel) ?? [];
      list.push(callback);
      channels.set(channel, list);
    },
    send(channel, message) {
      replies.push({ channel, message: message as ReplyEnvelope });
    },
  };
}

async function callHandler<TReq>(
  transport: FakeTransport,
  contractName: string,
  request: TReq,
): Promise<ReplyEnvelope> {
  const listeners = transport.channels.get(contractName) ?? [];
  expect(listeners.length).toBe(1);
  const envelope: RequestEnvelope = {
    id: `req-${Date.now()}`,
    payload: request,
  };
  const repliesBefore = transport.replies.length;
  listeners[0]!(envelope);
  /*
   * Handlers reply via a Promise microtask; flush once with a 0ms timer.
   * Handlers that touch DuckDB do real I/O, so wait until the reply
   * envelope shows up rather than asserting on a fixed delay.
   */
  while (transport.replies.length === repliesBefore) {
    await new Promise((resolve) => {
      return setTimeout(resolve, 5);
    });
  }
  return transport.replies[repliesBefore]!.message;
}

describe("registerDuckDbHandlers", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "avandar-duckdb-ipc-"));
  });

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("duckdb.runRawQuery returns rows", async () => {
    const svc = createDuckDbService(join(dir, "ipc.duckdb"));
    try {
      const transport = createFakeTransport();
      registerDuckDbHandlers(createIpcServer(transport), svc);

      const reply = await callHandler(
        transport,
        DuckDbContracts.runRawQuery.name,
        { sql: "select 1 as one, 'a' as letter", params: [] },
      );

      expect(reply.ok).toBe(true);
      if (reply.ok) {
        const result = reply.result as {
          rows: Array<{ one: number; letter: string }>;
        };
        expect(result.rows.length).toBe(1);
        expect(result.rows[0]!.one).toBe(1);
        expect(result.rows[0]!.letter).toBe("a");
      }
    } finally {
      await svc.close();
    }
  });

  it("duckdb.runRawQuery surfaces SQL errors through the reply envelope", async () => {
    const svc = createDuckDbService(join(dir, "ipc.duckdb"));
    try {
      const transport = createFakeTransport();
      registerDuckDbHandlers(createIpcServer(transport), svc);

      const reply = await callHandler(
        transport,
        DuckDbContracts.runRawQuery.name,
        { sql: "this is not sql", params: [] },
      );

      expect(reply.ok).toBe(false);
      if (!reply.ok) {
        expect(typeof reply.error).toBe("string");
      }
    } finally {
      await svc.close();
    }
  });

  it("duckdb.loadFromSourcePath imports a CSV into parquet under HOME", async () => {
    /*
     * Drive `getUserDataDir()` to land under the tmpdir for the test.
     * `getUserDataDir` is read at call time, so overriding HOME (and
     * USERPROFILE for cross-platform safety) before each handler call
     * is sufficient.
     */
    const homeOverride = join(dir, "home");
    const originalHome = process.env.HOME;
    const originalUserprofile = process.env.USERPROFILE;
    process.env.HOME = homeOverride;
    process.env.USERPROFILE = homeOverride;

    const svc = createDuckDbService(join(dir, "ipc.duckdb"));
    try {
      const csvPath = join(dir, "sample.csv");
      writeFileSync(csvPath, "id,name\n1,a\n2,b\n", "utf8");

      const transport = createFakeTransport();
      registerDuckDbHandlers(createIpcServer(transport), svc);

      const reply = await callHandler(
        transport,
        DuckDbContracts.loadFromSourcePath.name,
        { sourcePath: csvPath, datasetId: "ds-1", format: "csv" as const },
      );

      if (!reply.ok) {
        throw new Error(reply.error);
      }
      const result = reply.result as {
        datasetId: string;
        rowCount: number;
        parquetBlobKey: string;
      };
      expect(result.datasetId).toBe("ds-1");
      expect(result.rowCount).toBe(2);
      expect(result.parquetBlobKey).toContain("datasets/ds-1/data.parquet");
    } finally {
      await svc.close();
      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalUserprofile;
    }
  });

  it("duckdb.loadParquetFromDatasetBlobStore creates a view over the dataset's parquet", async () => {
    const homeOverride = join(dir, "home");
    const originalHome = process.env.HOME;
    const originalUserprofile = process.env.USERPROFILE;
    process.env.HOME = homeOverride;
    process.env.USERPROFILE = homeOverride;

    const svc = createDuckDbService(join(dir, "ipc.duckdb"));
    try {
      // Seed the canonical path with a parquet the handler will read.
      const csvPath = join(dir, "seed.csv");
      writeFileSync(csvPath, "id,name\n7,seven\n", "utf8");
      const transport = createFakeTransport();
      registerDuckDbHandlers(createIpcServer(transport), svc);

      await callHandler(transport, DuckDbContracts.loadFromSourcePath.name, {
        sourcePath: csvPath,
        datasetId: "ds-load",
        format: "csv" as const,
      });

      const reply = await callHandler(
        transport,
        DuckDbContracts.loadParquetFromDatasetBlobStore.name,
        { datasetId: "ds-load" },
      );

      expect(reply.ok).toBe(true);
      if (!reply.ok) {
        throw new Error(reply.error);
      }
      const result = reply.result as { tableName: string };
      expect(result.tableName).toBe("ds_ds_load");
      const rows = await svc.runRawQuery<{ id: bigint; name: string }>(
        `select id, name from ${result.tableName}`,
        [],
      );
      expect(Number(rows[0]!.id)).toBe(7);
      expect(rows[0]!.name).toBe("seven");
    } finally {
      await svc.close();
      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalUserprofile;
    }
  });
});
