import { afterEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapSnapshotJson } from "@/clients/maps/MapSnapshot/MapSnapshotJson/MapSnapshotJson";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import { PublicMapSnapshotStorageClient } from "@/clients/storage/PublicMapSnapshotStorageClient/PublicMapSnapshotStorageClient";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { MapSnapshot } from "@/clients/maps/MapSnapshot/MapSnapshot.types";

const { downloadMock, listMock, removeMock, uploadMock } = vi.hoisted(() => {
  return {
    downloadMock: vi.fn(),
    listMock: vi.fn(),
    removeMock: vi.fn(),
    uploadMock: vi.fn(),
  };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          storage: {
            from: () => {
              return {
                download: downloadMock,
                list: listMock,
                remove: removeMock,
                upload: uploadMock,
              };
            },
          },
        };
      },
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const MAP_ID = "22222222-2222-4222-8222-222222222222" as AvaMap.Id;
const REVISION = "33333333-3333-4333-8333-333333333333";
const MAP_PATH = `dashboards/${DASHBOARD_ID}/revisions/${REVISION}/maps/${MAP_ID}.json`;
const GENERATION = {
  bucket: SnapshotStorageUtils.PUBLIC_BUCKET_NAME,
  dashboardId: DASHBOARD_ID,
  snapshotRevision: REVISION,
};
const SNAPSHOT: MapSnapshot = {
  version: 1,
  mapId: MAP_ID,
  mapName: "Coverage risk",
  config: AvaMapConfig.makeEmpty(),
  layers: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

/** Reads a Blob through FileReader, since jsdom's Blob has no `text()`. */
function _readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(blob);
  });
}

/** A downloaded object as the client reads it: only `text()` is used. */
function _createDownloadedText(text: string): Pick<Blob, "text"> {
  return {
    text: () => {
      return Promise.resolve(text);
    },
  };
}

describe("PublicMapSnapshotStorageClient", () => {
  it("uploads the serialized snapshot to its revision's maps folder", async () => {
    uploadMock.mockResolvedValue({ error: null });

    await PublicMapSnapshotStorageClient.uploadMapSnapshot({
      ...GENERATION,
      snapshot: SNAPSHOT,
    });

    const [objectPath, body] = uploadMock.mock.calls[0]!;
    expect(objectPath).toBe(MAP_PATH);
    expect(JSON.parse(await _readBlobText(body as Blob)).mapName).toBe(
      "Coverage risk",
    );
  });

  it("returns undefined when the generation has no snapshot for the map", async () => {
    downloadMock.mockResolvedValue({
      data: null,
      error: { message: "Object not found" },
    });

    await expect(
      PublicMapSnapshotStorageClient.downloadMapSnapshot({
        ...GENERATION,
        mapId: MAP_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it("parses a downloaded snapshot", async () => {
    downloadMock.mockResolvedValue({
      data: _createDownloadedText(MapSnapshotJson.toJson(SNAPSHOT)),
      error: null,
    });

    const snapshot = await PublicMapSnapshotStorageClient.downloadMapSnapshot({
      ...GENERATION,
      mapId: MAP_ID,
    });

    expect(snapshot?.mapName).toBe("Coverage risk");
  });

  it("removes a generation's map snapshots after the delete check passes", async () => {
    const assertCanDelete = vi.fn().mockResolvedValue(undefined);
    listMock.mockResolvedValue({
      data: [{ name: `${MAP_ID}.json` }],
      error: null,
    });
    removeMock.mockResolvedValue({ data: [{ name: MAP_PATH }], error: null });

    await PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration({
      ...GENERATION,
      assertCanDelete,
    });

    expect(assertCanDelete).toHaveBeenCalledOnce();
    expect(removeMock).toHaveBeenCalledWith([MAP_PATH]);
  });

  it("fails when storage removes fewer map snapshots than requested", async () => {
    listMock.mockResolvedValue({
      data: [{ name: `${MAP_ID}.json` }],
      error: null,
    });
    // Storage RLS silently skips objects the caller may not delete.
    removeMock.mockResolvedValue({ data: [], error: null });

    await expect(
      PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration(
        GENERATION,
      ),
    ).rejects.toThrow("removed 0 of 1 requested objects");
  });

  it("does not look for map snapshots in the legacy generation", async () => {
    await PublicMapSnapshotStorageClient.deleteMapSnapshotsForGeneration({
      ...GENERATION,
      snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
    });

    expect(listMock).not.toHaveBeenCalled();
  });
});
