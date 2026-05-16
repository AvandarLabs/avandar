import { isDesktop } from "$/platform";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("$/platform", async () => {
  const actual = await vi.importActual<typeof import("$/platform")>(
    "$/platform",
  );
  return { ...actual, isDesktop: vi.fn(() => false) };
});

vi.mock("@clients/SupabaseCrudClient/createSupabaseCrudClient.ts", () => {
  return {
    createSupabaseCrudClient: vi.fn(() => ({
      get: () => undefined,
    })),
  };
});

import { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
import {
  createRdbCrudClient,
  registerWebDbClient,
} from "./createRdbCrudClient.ts";

const fakeDbClient = {
  __fake: "supabase-db-client",
} as unknown as Parameters<typeof registerWebDbClient>[0];

const baseSpec = {
  modelName: "TestModel",
  tableName: "test_models",
  dbTablePrimaryKey: "id",
  parsers: {},
};

describe("createRdbCrudClient", () => {
  beforeEach(() => {
    registerWebDbClient(fakeDbClient);
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to createSupabaseCrudClient with the registered web db client on web", () => {
    createRdbCrudClient(baseSpec as never);

    expect(createSupabaseCrudClient).toHaveBeenCalledTimes(1);
    expect(createSupabaseCrudClient).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: "TestModel",
        tableName: "test_models",
        dbTablePrimaryKey: "id",
        dbClient: fakeDbClient,
      }),
    );
  });

  it(
    "also delegates to createSupabaseCrudClient on desktop in Phase 1 " +
      "(Option A — Phase 2 cuts over to SQLite for the desktop branch)",
    () => {
      (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
      createRdbCrudClient(baseSpec as never);

      expect(createSupabaseCrudClient).toHaveBeenCalledTimes(1);
      expect(createSupabaseCrudClient).toHaveBeenCalledWith(
        expect.objectContaining({ dbClient: fakeDbClient }),
      );
    },
  );

  it("throws a clear error when no web db client has been registered", () => {
    registerWebDbClient(null);
    expect(() => createRdbCrudClient(baseSpec as never)).toThrow(
      /no web db client registered/i,
    );
  });
});
