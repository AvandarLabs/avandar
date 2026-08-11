import { makeParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import { createSqliteCrudClient } from "@clients/SqliteCrudClient/createSqliteCrudClient.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ModelCrudParserRegistry } from "@clients/makeParserRegistry/makeParserRegistry.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * A fake SQLite transport. `createSqliteCrudClient` takes its database access
 * as an injected dependency, so a test hands it a pair of spies rather than
 * standing up an IPC bridge or patching a module-level global.
 */
type FakeQueryResult = { rows: Array<Record<string, unknown>> };
type FakeRunResult = { changes: number; lastInsertRowid: number };
type FakeRequest = { sql: string; params: unknown[] };

function makeFakeTransport() {
  return {
    // Return types allow a plain value as well as a promise so individual
    // tests can `mockImplementation(() => ({ rows: [...] }))` without the
    // `async` ceremony. The client awaits the result either way.
    query: vi.fn<
      (request: FakeRequest) => FakeQueryResult | Promise<FakeQueryResult>
    >(() => {
      return { rows: [] };
    }),
    run: vi.fn<
      (request: FakeRequest) => FakeRunResult | Promise<FakeRunResult>
    >(() => {
      return { changes: 0, lastInsertRowid: 0 };
    }),
  };
}

type WidgetModelSpec = {
  modelName: "Widget";
  tableName: "widgets";
  dbTablePrimaryKey: "id";
  modelPrimaryKeyType: string;
  DBRead: { id: string; name: string; color: string | null };
  Read: { id: string; name: string; color: string | null };
  DBInsert: { id?: string; name: string; color?: string | null };
  Insert: { name: string; color?: string | null };
  DBUpdate: { name?: string; color?: string | null };
  Update: { name?: string; color?: string | null };
};

const WidgetDBReadSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
});

const widgetParsers: ModelCrudParserRegistry<WidgetModelSpec> =
  makeParserRegistry<WidgetModelSpec>().build({
    modelName: "Widget",
    DBReadSchema: WidgetDBReadSchema,
    fromDBReadToModelRead: (r) => {
      return r;
    },
    fromModelInsertToDBInsert: (m) => {
      return m as WidgetModelSpec["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (m) => {
      return m;
    },
  });

const fakeSupabase = {} as SupabaseClient;

describe("createSqliteCrudClient", () => {
  let sqliteTransport = makeFakeTransport();

  beforeEach(() => {
    sqliteTransport = makeFakeTransport();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Loosen the client return type so tests can call `.getById` /
  // `.insert` / etc. without having to construct a model spec that
  // satisfies the live `RegisteredSupabaseDatabase` constraint —
  // we exercise runtime SQL emission, not the type system.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type LooseClient = any;

  function makeClient(): LooseClient {
    return createSqliteCrudClient({
      modelName: "Widget",
      tableName: "widgets" as never,
      dbTablePrimaryKey: "id" as never,
      parsers: widgetParsers as never,
      dbClient: fakeSupabase,
      sqliteTransport,
    } as never);
  }

  it("getById issues an rdb.query with parameterised SQL", async () => {
    sqliteTransport.query.mockImplementation(() => {
      return { rows: [{ id: "x1", name: "test", color: "red" }] };
    });

    const client = makeClient();
    const result = await client.getById({ id: "x1" });

    expect(result).toEqual({ id: "x1", name: "test", color: "red" });
    expect(sqliteTransport.query).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining('from "widgets"'),
        params: ["x1"],
      }),
    );
  });

  it("getById returns undefined for a nullish id without calling IPC", async () => {
    const client = makeClient();
    const result = await client.getById({ id: null });
    expect(result).toBeUndefined();
    expect(sqliteTransport.query).not.toHaveBeenCalled();
    expect(sqliteTransport.run).not.toHaveBeenCalled();
  });

  it("getCount issues a count query and returns the integer", async () => {
    sqliteTransport.query.mockImplementation(() => {
      return { rows: [{ _count: 42 }] };
    });
    const client = makeClient();
    const count = await client.getCount({});
    expect(count).toBe(42);
  });

  it("getPage applies LIMIT/OFFSET correctly", async () => {
    // The model-level getPage may also call getCount when the first
    // page is full; capture only the page-data call.
    let pageCall: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      const req = payload as Record<string, unknown>;
      const sql = String(req.sql ?? "");
      if (sql.includes("count(*)")) {
        return { rows: [{ _count: 0 }] };
      }
      pageCall = req;
      return { rows: [] };
    });
    const client = makeClient();
    await client.getPage({ pageSize: 25, pageNum: 3 });
    expect(pageCall?.sql).toMatch(/limit \? offset \?/);
    expect(pageCall?.params).toEqual([25, 75]);
  });

  it("getPage applies WHERE filters with eq", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [] };
    });
    const client = makeClient();
    await client.getPage({
      pageSize: 10,
      pageNum: 0,
      where: { color: { eq: "red" } },
    });
    expect(received?.sql).toMatch(/where "color" = \?/);
    expect(received?.params).toEqual(["red", 10, 0]);
  });

  it("getPage applies WHERE filters with in", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [] };
    });
    const client = makeClient();
    await client.getPage({
      pageSize: 10,
      pageNum: 0,
      where: { color: { in: ["red", "blue"] } },
    });
    expect(received?.sql).toMatch(/where "color" in \(\?, \?\)/);
    expect(received?.params).toEqual(["red", "blue", 10, 0]);
  });

  it("getPage degrades an empty IN to a contradiction so no rows return", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [] };
    });
    const client = makeClient();
    await client.getPage({
      pageSize: 10,
      pageNum: 0,
      where: { color: { in: [] } },
    });
    expect(received?.sql).toMatch(/where 1 = 0/);
  });

  it("insert emits an INSERT ... RETURNING and returns the parsed model", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return {
        rows: [{ id: "x1", name: "fresh", color: "green" }],
      };
    });
    const client = makeClient();
    const result = await client.insert({
      data: { name: "fresh", color: "green" },
    });
    expect(result).toEqual({ id: "x1", name: "fresh", color: "green" });
    expect(received?.sql).toMatch(/insert into "widgets"/);
    expect(received?.sql).toMatch(/returning \*/);
  });

  it("insert with upsert emits ON CONFLICT DO UPDATE", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [{ id: "x1", name: "fresh", color: null }] };
    });
    const client = makeClient();
    await client.insert({
      data: { name: "fresh" },
      upsert: true,
      onConflict: { columnNames: ["id"], ignoreDuplicates: false },
    });
    expect(received?.sql).toMatch(/on conflict \("id"\) do update set/);
  });

  it("insert with upsert + ignoreDuplicates emits ON CONFLICT DO NOTHING", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [{ id: "x1", name: "fresh", color: null }] };
    });
    const client = makeClient();
    await client.insert({
      data: { name: "fresh" },
      upsert: true,
      onConflict: { columnNames: ["id"], ignoreDuplicates: true },
    });
    expect(received?.sql).toMatch(/on conflict \("id"\) do nothing/);
  });

  it("insert stringifies object-valued columns for jsonb storage", async () => {
    // Use a model spec whose DBRead allows a string `config` so the
    // RETURNING * round-trip parses cleanly; the assertion is on the
    // OUTGOING params, which must contain a JSON string.
    type JsonModelSpec = {
      modelName: "JsonWidget";
      tableName: "widgets";
      dbTablePrimaryKey: "id";
      modelPrimaryKeyType: string;
      DBRead: { id: string; config: string };
      Read: { id: string; config: string };
      DBInsert: { id?: string; config: string };
      Insert: { config: unknown };
      DBUpdate: { config?: string };
      Update: { config?: unknown };
    };

    const jsonParsers: ModelCrudParserRegistry<JsonModelSpec> =
      makeParserRegistry<JsonModelSpec>().build({
        modelName: "JsonWidget",
        DBReadSchema: z.object({
          id: z.string(),
          config: z.string(),
        }),
        fromDBReadToModelRead: (r) => {
          return r;
        },
        fromModelInsertToDBInsert: (m) => {
          return {
            config: JSON.stringify(m.config),
          } as JsonModelSpec["DBInsert"];
        },
        fromModelUpdateToDBUpdate: (m) => {
          return {
            config:
              m.config !== undefined ? JSON.stringify(m.config) : undefined,
          } as JsonModelSpec["DBUpdate"];
        },
      });

    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [{ id: "x1", config: '{"theme":"dark"}' }] };
    });

    const client: LooseClient = createSqliteCrudClient({
      modelName: "JsonWidget",
      tableName: "widgets" as never,
      dbTablePrimaryKey: "id" as never,
      parsers: jsonParsers as never,
      dbClient: fakeSupabase,
      sqliteTransport,
    } as never);

    await client.insert({
      data: { config: { theme: "dark" } },
    });
    const params = received?.params as unknown[];
    expect(params).toContain('{"theme":"dark"}');
  });

  it("bulkInsert flattens row bindings and emits multi-row VALUES", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return {
        rows: [
          { id: "x1", name: "a", color: null },
          { id: "x2", name: "b", color: null },
        ],
      };
    });
    const client = makeClient();
    await client.bulkInsert({
      data: [
        { name: "a" } as WidgetModelSpec["Insert"],
        { name: "b" } as WidgetModelSpec["Insert"],
      ],
    });
    expect(received?.sql).toMatch(/values \(\?\), \(\?\)/);
    expect(received?.params).toEqual(["a", "b"]);
  });

  it("bulkInsert with empty input does not call IPC and returns []", async () => {
    const client = makeClient();
    const result = await client.bulkInsert({ data: [] });
    expect(result).toEqual([]);
    expect(sqliteTransport.query).not.toHaveBeenCalled();
    expect(sqliteTransport.run).not.toHaveBeenCalled();
  });

  it("update emits UPDATE ... SET ... WHERE pk = ? RETURNING *", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.query.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { rows: [{ id: "x1", name: "renamed", color: "red" }] };
    });
    const client = makeClient();
    const result = await client.update({
      id: "x1",
      data: { name: "renamed" },
    });
    expect(result).toEqual({ id: "x1", name: "renamed", color: "red" });
    expect(received?.sql).toMatch(
      /update "widgets" set "name" = \? where "id" = \?/,
    );
    expect(received?.params).toEqual(["renamed", "x1"]);
  });

  it("delete emits a DELETE through rdb.run", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.run.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { changes: 1, lastInsertRowid: 0 };
    });
    const client = makeClient();
    await client.delete({ id: "x1" });
    expect(received?.sql).toBe('delete from "widgets" where "id" = ?');
    expect(received?.params).toEqual(["x1"]);
  });

  it("bulkDelete emits DELETE ... WHERE pk IN (?, ?, ...) through rdb.run", async () => {
    let received: Record<string, unknown> | undefined;
    sqliteTransport.run.mockImplementation((payload) => {
      received = payload as Record<string, unknown>;
      return { changes: 3, lastInsertRowid: 0 };
    });
    const client = makeClient();
    await client.bulkDelete({ ids: ["x1", "x2", "x3"] });
    expect(received?.sql).toBe('delete from "widgets" where "id" in (?, ?, ?)');
    expect(received?.params).toEqual(["x1", "x2", "x3"]);
  });

  it("bulkDelete with empty input does not call IPC", async () => {
    const client = makeClient();
    await client.bulkDelete({ ids: [] });
    expect(sqliteTransport.query).not.toHaveBeenCalled();
    expect(sqliteTransport.run).not.toHaveBeenCalled();
  });

  it("exposes .getDb() returning the same Supabase client", () => {
    const client = makeClient();
    expect(client.getDb()).toBe(fakeSupabase);
  });
});
