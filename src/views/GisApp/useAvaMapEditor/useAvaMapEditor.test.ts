import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

import { Model } from "@avandar/models";
import { noop, sleep } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { act, renderHook, waitFor } from "@/test-utils";

const { saveMapConfigMock } = vi.hoisted(() => {
  return { saveMapConfigMock: vi.fn() };
});

const { invalidateQueriesMock } = vi.hoisted(() => {
  return { invalidateQueriesMock: vi.fn() };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return {
    AvaMapClient: {
      saveMapConfig: saveMapConfigMock,
      QueryKeys: {
        getAll: () => {
          return ["AvaMap", "getAll"];
        },
      },
    },
  };
});

vi.mock("@/config/AvaQueryClient", () => {
  return {
    AvaQueryClient: { invalidateQueries: invalidateQueriesMock },
  };
});

const { useAvaMapEditor } =
  await import("@/views/GisApp/useAvaMapEditor/useAvaMapEditor");

/** Creates a persisted map fixture with non-default editor state. */
function _createAvaMap(): AvaMap.T {
  const config = {
    ...AvaMapConfig.makeEmpty(),
    basemap: { type: "none" as const, background: "#123456" },
    view: { center: [12, 34] as [number, number], zoom: 7 },
    layers: [MapLayer.makeEmpty("Persisted layer")],
  };

  return Model.make("AvaMap", {
    id: uuid<AvaMap.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name: "Persisted response map",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    slug: undefined,
    config,
  });
}

describe("useAvaMapEditor", () => {
  beforeEach(() => {
    saveMapConfigMock.mockReset();
    invalidateQueriesMock.mockReset();
    saveMapConfigMock.mockImplementation(
      async (params: { mapId: AvaMap.Id }) => {
        return {
          ..._createAvaMap(),
          id: params.mapId,
          updatedAt: "2026-08-14T00:01:00.000Z",
        };
      },
    );
  });

  it("initializes the editor from the persisted map", () => {
    const avaMap = _createAvaMap();
    const { result } = renderHook(() => {
      return useAvaMapEditor(avaMap);
    });

    expect(result.current.name).toBe(avaMap.name);
    expect(result.current.mapConfig).toBe(avaMap.config);
    expect(result.current.mapConfig.layers[0]?.name).toBe("Persisted layer");
  });

  it("starts saved and goes unsaved on the first edit", () => {
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    expect(result.current.saveState).toBe("saved");
    act(() => {
      result.current.updateName("Cholera response");
    });
    expect(result.current.saveState).toBe("unsaved");
  });

  it("saves once for a burst of edits", async () => {
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("One");
      result.current.updateName("Two");
      result.current.updateName("Three");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("saved");
    });

    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);
    expect(saveMapConfigMock.mock.calls[0]?.[0]?.name).toBe("Three");
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ["AvaMap", "getAll"],
    });
  });

  it("passes the persisted revision and uses the returned revision for queued saves", async () => {
    const releaseSaves: Array<() => void> = [];
    saveMapConfigMock.mockImplementation((params: { mapId: AvaMap.Id }) => {
      return new Promise<AvaMap.T>((resolve) => {
        releaseSaves.push(() => {
          resolve({
            ..._createAvaMap(),
            id: params.mapId,
            updatedAt: `2026-08-14T00:0${releaseSaves.length}:00.000Z`,
          });
        });
      });
    });
    const avaMap = _createAvaMap();
    const { result } = renderHook(() => {
      return useAvaMapEditor(avaMap);
    });

    act(() => {
      result.current.updateName("First revision");
      result.current.saveNow();
    });
    act(() => {
      result.current.updateName("Latest revision");
      result.current.saveNow();
    });

    expect(saveMapConfigMock.mock.calls[0]?.[0]?.expectedUpdatedAt).toBe(
      avaMap.updatedAt,
    );
    await act(async () => {
      releaseSaves[0]?.();
    });
    expect(saveMapConfigMock.mock.calls[1]?.[0]?.expectedUpdatedAt).toBe(
      "2026-08-14T00:01:00.000Z",
    );
    await act(async () => {
      releaseSaves[1]?.();
    });
  });

  it("reports a save conflict as failed while retaining the local edit", async () => {
    saveMapConfigMock.mockRejectedValueOnce(new Error("map save conflict"));
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("Conflicting revision");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("failed");
    });

    expect(result.current.name).toBe("Conflicting revision");
    expect(invalidateQueriesMock).not.toHaveBeenCalled();
  });

  it("reports a failed save and keeps the edit on screen", async () => {
    saveMapConfigMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("Cholera response");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("failed");
    });

    expect(result.current.name).toBe("Cholera response");
  });

  it("goes back to unsaved when an edit lands during a save", async () => {
    let releaseSave = noop;
    saveMapConfigMock.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
    });
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("One");
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("saving");
    });
    act(() => {
      result.current.updateName("Two");
    });
    act(() => {
      releaseSave();
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("unsaved");
    });
  });

  it("serializes saves and persists the latest queued revision", async () => {
    const releaseSaves: Array<() => void> = [];
    saveMapConfigMock.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        releaseSaves.push(resolve);
      });
    });
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("First revision");
      result.current.saveNow();
    });
    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.updateName("Latest revision");
      result.current.saveNow();
    });
    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseSaves[0]?.();
    });
    expect(saveMapConfigMock).toHaveBeenCalledTimes(2);
    expect(saveMapConfigMock.mock.calls[1]?.[0]?.name).toBe("Latest revision");

    await act(async () => {
      releaseSaves[1]?.();
    });
    expect(result.current.saveState).toBe("saved");
  });

  it("cancels the pending autosave when saveNow persists the revision", async () => {
    const { result } = renderHook(() => {
      return useAvaMapEditor(_createAvaMap());
    });

    act(() => {
      result.current.updateName("Immediate revision");
      result.current.saveNow();
    });
    await waitFor(() => {
      expect(result.current.saveState).toBe("saved");
    });

    await act(async () => {
      await sleep(850);
    });
    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);
  });

  it("flushes the latest pending edit on unmount", async () => {
    let releaseSave = noop;
    saveMapConfigMock.mockImplementationOnce(() => {
      return new Promise<void>((resolve) => {
        releaseSave = resolve;
      });
    });
    const avaMap = _createAvaMap();
    const { result, unmount } = renderHook(() => {
      return useAvaMapEditor(avaMap);
    });

    act(() => {
      result.current.updateName("Navigation revision");
    });
    unmount();

    expect(saveMapConfigMock).toHaveBeenCalledTimes(1);
    expect(saveMapConfigMock).toHaveBeenCalledWith({
      mapId: avaMap.id,
      name: "Navigation revision",
      mapConfig: avaMap.config,
      expectedUpdatedAt: avaMap.updatedAt,
    });

    await act(async () => {
      releaseSave();
    });
  });
});
