import {
  createSqliteCrudClient,
  createSupabaseCrudClient,
} from "@avandar/clients";
import { isDesktop } from "$/platform/isDesktop.ts";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDbClient } = vi.hoisted(() => {
  return {
    fakeDbClient: { __fake: "supabase-db-client" } as unknown,
  };
});

vi.mock("$/platform/isDesktop.ts", async () => {
  const actual = await vi.importActual<
    typeof import("$/platform/isDesktop.ts")
  >("$/platform/isDesktop.ts");
  return {
    ...actual,
    isDesktop: vi.fn(() => {
      return false;
    }),
  };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return {
    AvaSupabase: {
      db: () => {
        return fakeDbClient;
      },
    },
  };
});

vi.mock("@avandar/clients", async () => {
  const actual =
    await vi.importActual<typeof import("@avandar/clients")>(
      "@avandar/clients",
    );
  return {
    ...actual,
    createSupabaseCrudClient: vi.fn(() => {
      return { __backend: "supabase" };
    }),
    createSqliteCrudClient: vi.fn(() => {
      return { __backend: "sqlite" };
    }),
  };
});

const baseSpec = {
  modelName: "TestModel",
  tableName: "test_models",
  dbTablePrimaryKey: "id",
  parsers: {},
};

describe("createRdbCrudClient", () => {
  beforeEach(() => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to createSupabaseCrudClient with the shared Supabase client on web", () => {
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

  it("delegates to createSqliteCrudClient on desktop and threads the shared Supabase client through for the escape hatches", () => {
    (isDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
    createRdbCrudClient(baseSpec as never);

    expect(createSqliteCrudClient).toHaveBeenCalledTimes(1);
    expect(createSqliteCrudClient).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: "TestModel",
        tableName: "test_models",
        dbTablePrimaryKey: "id",
        dbClient: fakeDbClient,
      }),
    );
    expect(createSupabaseCrudClient).not.toHaveBeenCalled();
  });
});
