import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeocoderProvider } from "@sbfn/geocode/GeocoderProvider.types.ts";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    defineRoutes: (functionName: string, routes: Record<string, unknown>) => {
      return { [functionName]: routes };
    },
    POST: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        bodySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

const { createGeocodeRoutes, GeocodeSearchBodySchema } =
  await import("@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.ts");

const ADDRESS = "350 W 46th St, New York";

async function _search(geocoder: GeocoderProvider): Promise<unknown> {
  const routes = createGeocodeRoutes({
    getGeocoder: () => {
      return geocoder;
    },
  });
  return await routes.geocode["/search"].POST.state.action({
    body: { text: ADDRESS, biasBox: undefined },
  } as never);
}

describe("GeocodeRoutes /search", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the provider's candidates", async () => {
    const candidate = {
      label: "350 W 46th St",
      latitude: 40.76,
      longitude: -73.99,
      confidence: 0.9,
    };
    const result = await _search({
      search: vi.fn(async () => {
        return [candidate];
      }),
    });
    expect(result).toEqual({ candidates: [candidate] });
  });

  it("never writes the searched text to the logs, even when the provider fails", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => {
        return vi.spyOn(console, method).mockImplementation(() => {
          return undefined;
        });
      },
    );
    await _search({
      search: vi.fn(async () => {
        throw new Error("The address search provider answered 500.");
      }),
    }).catch(() => {
      return undefined;
    });
    const loggedLines = spies.flatMap((spy) => {
      return spy.mock.calls.flat().map(String);
    });
    expect(
      loggedLines.some((line) => {
        return line.includes("46th");
      }),
    ).toBe(false);
  });

  it("trims the text and refuses an empty or overlong search", () => {
    expect(GeocodeSearchBodySchema.parse({ text: "  W 46th St  " }).text).toBe(
      "W 46th St",
    );
    expect(GeocodeSearchBodySchema.safeParse({ text: "   " }).success).toBe(
      false,
    );
    expect(
      GeocodeSearchBodySchema.safeParse({ text: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("refuses a bias box outside WGS 84 bounds", () => {
    expect(
      GeocodeSearchBodySchema.safeParse({
        text: "W 46th St",
        biasBox: { west: -190, south: 40, east: -73, north: 41 },
      }).success,
    ).toBe(false);
  });
});
