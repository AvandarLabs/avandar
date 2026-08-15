import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { describe, expect, it, vi } from "vitest";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

const { fromMock } = vi.hoisted(() => {
  return { fromMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: fromMock };
      },
    },
  };
});

const { AvaMapClient } = await import("./AvaMapClient");
const { MapSaveConflictError } = await import("./MapSaveConflictError");

function _createQuery(
  options: Readonly<{ result: unknown; error?: unknown }>,
): {
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
} {
  const { result, error } = options;
  const query = {
    update: vi.fn(() => {
      return query;
    }),
    eq: vi.fn(() => {
      return query;
    }),
    select: vi.fn(() => {
      return query;
    }),
    single: vi.fn(() => {
      return query;
    }),
    throwOnError: vi.fn(() => {
      return error ? Promise.reject(error) : Promise.resolve({ data: result });
    }),
  };
  return query;
}

function _createMapRow(updatedAt: string): AvaMap.T<"DBRead"> {
  return {
    config: AvaMapConfig.makeEmpty(),
    created_at: "2026-08-14T00:00:00.000Z",
    description: null,
    id: "00000000-0000-4000-8000-000000000001",
    is_public: false,
    is_restricted: false,
    name: "Updated map",
    owner_id: "00000000-0000-4000-8000-000000000002",
    owner_profile_id: "00000000-0000-4000-8000-000000000003",
    slug: null,
    updated_at: updatedAt,
    workspace_id: "00000000-0000-4000-8000-000000000004",
  };
}

describe("AvaMapClient.saveMapConfig", () => {
  it("updates only the map revision that the editor read", async () => {
    const query = _createQuery({
      result: _createMapRow("2026-08-14T00:01:00.000Z"),
    });
    fromMock.mockReturnValue(query);

    await AvaMapClient.saveMapConfig({
      mapId: "00000000-0000-4000-8000-000000000001" as AvaMap.Id,
      name: "Updated map",
      mapConfig: AvaMapConfig.makeEmpty(),
      expectedUpdatedAt: "2026-08-14T00:00:00.000Z",
    });

    expect(query.eq).toHaveBeenNthCalledWith(
      1,
      "id",
      "00000000-0000-4000-8000-000000000001",
    );
    expect(query.eq).toHaveBeenNthCalledWith(
      2,
      "updated_at",
      "2026-08-14T00:00:00.000Z",
    );
  });

  it("rejects a competing save that still targets the older revision", async () => {
    let saveCount = 0;
    fromMock.mockImplementation(() => {
      saveCount += 1;
      return _createQuery({
        result:
          saveCount === 1 ?
            _createMapRow("2026-08-14T00:01:00.000Z")
          : undefined,
        error: saveCount === 1 ? undefined : { code: "PGRST116" },
      });
    });

    const saveParams = {
      mapId: "00000000-0000-4000-8000-000000000001" as AvaMap.Id,
      name: "Competing map",
      mapConfig: AvaMapConfig.makeEmpty(),
      expectedUpdatedAt: "2026-08-14T00:00:00.000Z",
    };

    await AvaMapClient.saveMapConfig(saveParams);
    await expect(AvaMapClient.saveMapConfig(saveParams)).rejects.toBeInstanceOf(
      MapSaveConflictError,
    );
  });
});
