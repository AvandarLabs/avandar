import { createSupabaseCrudClient } from "@clients/SupabaseCrudClient/createSupabaseCrudClient.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient.ts";

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

vi.mock("@clients/SupabaseCrudClient/createSupabaseCrudClient.ts", () => {
  return {
    createSupabaseCrudClient: vi.fn(() => {
      return {
        get: () => {
          return undefined;
        },
      };
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
});
