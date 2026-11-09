import { createGeoapifyGeocoder } from "@sbfn/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts";
import { describe, expect, it, vi } from "vitest";

const ADDRESS = "350 W 46th St, New York";

function _respondWith(body: unknown, status = 200): typeof fetch {
  return vi.fn(async () => {
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

function _requestedUrl(fetchFn: typeof fetch): URL {
  return new URL(String(vi.mocked(fetchFn).mock.calls[0]![0]));
}

describe("createGeoapifyGeocoder", () => {
  it("maps Geoapify results to candidates", async () => {
    const fetchFn = _respondWith({
      results: [
        {
          formatted:
            "350 West 46th Street, New York, NY 10036, United States of America",
          lat: 40.76,
          lon: -73.99,
          rank: { confidence: 0.95 },
        },
        { formatted: "West 46th Street, New York", lat: 40.75, lon: -73.98 },
      ],
    });
    const geocoder = createGeoapifyGeocoder({ apiKey: "test-key", fetchFn });
    expect(
      await geocoder.search({ text: ADDRESS, biasBox: undefined }),
    ).toEqual([
      {
        label:
          "350 West 46th Street, New York, NY 10036, United States of America",
        latitude: 40.76,
        longitude: -73.99,
        confidence: 0.95,
      },
      {
        label: "West 46th Street, New York",
        latitude: 40.75,
        longitude: -73.98,
        confidence: 0,
      },
    ]);
  });

  it("asks for at most five JSON results, biased to the map view", async () => {
    const fetchFn = _respondWith({ results: [] });
    const geocoder = createGeoapifyGeocoder({ apiKey: "test-key", fetchFn });
    await geocoder.search({
      text: ADDRESS,
      biasBox: { west: -74.1, south: 40.6, east: -73.8, north: 40.9 },
    });
    const url = _requestedUrl(fetchFn);
    expect(url.origin + url.pathname).toBe(
      "https://api.geoapify.com/v1/geocode/search",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      text: ADDRESS,
      limit: "5",
      format: "json",
      apiKey: "test-key",
      bias: "rect:-74.1,40.6,-73.8,40.9",
    });
  });

  it("returns no candidates when Geoapify finds nothing", async () => {
    const geocoder = createGeoapifyGeocoder({
      apiKey: "k",
      fetchFn: _respondWith({ results: [] }),
    });
    expect(
      await geocoder.search({ text: ADDRESS, biasBox: undefined }),
    ).toEqual([]);
  });

  it("fails with a message that never repeats the searched address", async () => {
    const geocoder = createGeoapifyGeocoder({
      apiKey: "k",
      fetchFn: _respondWith({ error: "Unauthorized" }, 401),
    });
    const error = await geocoder
      .search({ text: ADDRESS, biasBox: undefined })
      .catch((caught: unknown) => {
        return caught as Error;
      });
    expect(error.message).toBe("The address search provider answered 401.");
    expect(error.message).not.toContain("46th");
  });

  it("fails on a response it does not recognize", async () => {
    const geocoder = createGeoapifyGeocoder({
      apiKey: "k",
      fetchFn: _respondWith({ results: [{ formatted: 3 }] }),
    });
    await expect(
      geocoder.search({ text: ADDRESS, biasBox: undefined }),
    ).rejects.toThrow(
      "The address search provider sent an unexpected response.",
    );
  });
});
