import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { RdbContracts } from "../../../../shared/platform/ipc/contracts/RdbContracts.ts";
import type { ReplyEnvelope, RequestEnvelope } from "../../../../shared/platform/ipc/envelopes.ts";
import { createIpcServer } from "./server.ts";
import { openSqliteDatabase } from "../services/Sqlite.ts";
import { registerRdbHandlers } from "./rdb.ts";

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
  const envelope: RequestEnvelope = { id: `req-${Date.now()}`, payload: request };
  const repliesBefore = transport.replies.length;
  listeners[0]!(envelope);
  // server replies via Promise microtask
  await new Promise((r) => setTimeout(r, 0));
  expect(transport.replies.length).toBe(repliesBefore + 1);
  return transport.replies[repliesBefore]!.message;
}

describe("registerRdbHandlers", () => {
  let dir = "";
  let dbPath = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "avandar-rdb-ipc-"));
    dbPath = join(dir, "test.sqlite");
  });

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = "";
    }
  });

  it("rdb.run executes a single statement and returns changes", async () => {
    const db = openSqliteDatabase(dbPath);
    db.run("create table widgets (id integer primary key, name text);");
    const transport = createFakeTransport();
    registerRdbHandlers(createIpcServer(transport), db);

    const reply = await callHandler(transport, RdbContracts.run.name, {
      sql: "insert into widgets (name) values (?)",
      params: ["a"],
    });

    expect(reply.ok).toBe(true);
    if (reply.ok) {
      const result = reply.result as { changes: number; lastInsertRowid: number };
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBe(1);
    }
    db.close();
  });

  it("rdb.query returns matching rows", async () => {
    const db = openSqliteDatabase(dbPath);
    db.run("create table widgets (id integer primary key, name text);");
    db.run("insert into widgets (name) values ('a');");
    db.run("insert into widgets (name) values ('b');");

    const transport = createFakeTransport();
    registerRdbHandlers(createIpcServer(transport), db);

    const reply = await callHandler(transport, RdbContracts.query.name, {
      sql: "select id, name from widgets where id = ?",
      params: [2],
    });

    expect(reply.ok).toBe(true);
    if (reply.ok) {
      const result = reply.result as { rows: Array<{ id: number; name: string }> };
      expect(result.rows).toEqual([{ id: 2, name: "b" }]);
    }
    db.close();
  });

  it("rdb.transaction commits all statements when each succeeds", async () => {
    const db = openSqliteDatabase(dbPath);
    db.run("create table widgets (id integer primary key, name text);");

    const transport = createFakeTransport();
    registerRdbHandlers(createIpcServer(transport), db);

    const reply = await callHandler(transport, RdbContracts.transaction.name, {
      statements: [
        { sql: "insert into widgets (name) values (?)", params: ["a"] },
        { sql: "insert into widgets (name) values (?)", params: ["b"] },
      ],
    });

    expect(reply.ok).toBe(true);
    if (reply.ok) {
      const result = reply.result as { results: Array<{ changes: number }> };
      expect(result.results).toEqual([{ changes: 1 }, { changes: 1 }]);
    }
    const rows = db
      .query<{ name: string }, []>("select name from widgets order by id")
      .all();
    expect(rows.map((r) => r.name)).toEqual(["a", "b"]);
    db.close();
  });

  it("rdb.transaction rolls back when any statement fails", async () => {
    const db = openSqliteDatabase(dbPath);
    db.run("create table widgets (id integer primary key, name text);");

    const transport = createFakeTransport();
    registerRdbHandlers(createIpcServer(transport), db);

    const reply = await callHandler(transport, RdbContracts.transaction.name, {
      statements: [
        { sql: "insert into widgets (name) values (?)", params: ["a"] },
        { sql: "insert into nonexistent (name) values (?)", params: ["b"] },
      ],
    });

    expect(reply.ok).toBe(false);
    const rows = db
      .query<{ name: string }, []>("select name from widgets")
      .all();
    expect(rows).toEqual([]);
    db.close();
  });

  it("rdb.run reports the SQL error via the reply envelope", async () => {
    const db = openSqliteDatabase(dbPath);
    const transport = createFakeTransport();
    registerRdbHandlers(createIpcServer(transport), db);

    const reply = await callHandler(transport, RdbContracts.run.name, {
      sql: "this is not sql",
      params: [],
    });

    expect(reply.ok).toBe(false);
    if (!reply.ok) {
      expect(typeof reply.error).toBe("string");
    }
    db.close();
  });
});
