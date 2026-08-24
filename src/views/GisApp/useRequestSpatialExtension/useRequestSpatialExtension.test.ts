import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@/test-utils";
import { useRequestSpatialExtension } from "@/views/GisApp/useRequestSpatialExtension/useRequestSpatialExtension";

const { ensureSpatialMock, spatialAvailability } = vi.hoisted(() => {
  return {
    ensureSpatialMock: vi.fn(),
    spatialAvailability: { value: "loading" },
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      ensureSpatial: ensureSpatialMock,
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

describe("useRequestSpatialExtension", () => {
  beforeEach(() => {
    ensureSpatialMock.mockReset();
    ensureSpatialMock.mockResolvedValue(true);
    spatialAvailability.value = "loading";
  });

  it("requests the extension while the capability is unknown", () => {
    renderHook(() => {
      return useRequestSpatialExtension();
    });

    expect(ensureSpatialMock).toHaveBeenCalledTimes(1);
  });

  it("does not request the extension once the capability is known", () => {
    spatialAvailability.value = "available";

    renderHook(() => {
      return useRequestSpatialExtension();
    });

    expect(ensureSpatialMock).not.toHaveBeenCalled();
  });

  // `ensureExtension` memoizes a failure as well as a success, so a retry
  // would resolve to the same `false` without another attempt. The guard keeps
  // an offline session from queueing one useless call per re-render.
  it("does not retry after the extension failed to load", () => {
    spatialAvailability.value = "unavailable";

    renderHook(() => {
      return useRequestSpatialExtension();
    });

    expect(ensureSpatialMock).not.toHaveBeenCalled();
  });

  // The request is fired without awaiting it, so a rejection that escaped
  // would surface as an unhandled rejection rather than a caught error.
  it("swallows a rejected request", async () => {
    ensureSpatialMock.mockRejectedValue(new Error("offline"));

    renderHook(() => {
      return useRequestSpatialExtension();
    });

    await waitFor(() => {
      expect(ensureSpatialMock).toHaveBeenCalledTimes(1);
    });
  });
});
