import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
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

  it("sends an abort signal so a hung provider cannot hang the route", async () => {
    const fetchFn = _respondWith({ results: [] });
    const geocoder = createGeoapifyGeocoder({ apiKey: "k", fetchFn });
    await geocoder.search({ text: ADDRESS, biasBox: undefined });
    const init = vi.mocked(fetchFn).mock.calls[0]![1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps a timeout to a fixed gateway timeout error", async () => {
    const fetchFn = vi.fn(async () => {
      throw new DOMException("signal timed out", "TimeoutError");
    }) as unknown as typeof fetch;
    const geocoder = createGeoapifyGeocoder({ apiKey: "secret-key", fetchFn });
    const error = (await geocoder
      .search({ text: ADDRESS, biasBox: undefined })
      .catch((caught: unknown) => {
        return caught;
      })) as AvaHTTPError;
    expect(error.message).toBe("The address search provider timed out.");
    expect(error.httpCode).toBe(504);
  });

  it("hides the key and address when the request fails", async () => {
    const fetchFn = vi.fn(async (url: unknown) => {
      throw new TypeError(`fetch failed for ${String(url)}`);
    }) as unknown as typeof fetch;
    const geocoder = createGeoapifyGeocoder({ apiKey: "secret-key", fetchFn });
    const error = (await geocoder
      .search({ text: ADDRESS, biasBox: undefined })
      .catch((caught: unknown) => {
        return caught;
      })) as AvaHTTPError;
    expect(error.message).toBe(
      "The address search provider could not be reached.",
    );
    expect(error.httpCode).toBe(502);
    const serialized = `${error.message}${String(error.cause)}${JSON.stringify(error)}`;
    expect(serialized).not.toContain("secret-key");
    expect(serialized).not.toContain("46th");
  });

  it("treats a non-JSON 200 body as an unexpected response", async () => {
    const fetchFn = vi.fn(async () => {
      return new Response("<html>oops</html>", { status: 200 });
    }) as unknown as typeof fetch;
    const geocoder = createGeoapifyGeocoder({ apiKey: "k", fetchFn });
    await expect(
      geocoder.search({ text: ADDRESS, biasBox: undefined }),
    ).rejects.toThrow(
      "The address search provider sent an unexpected response.",
    );
  });

  it.each([
    { west: Number.NaN, south: 0, east: 1, north: 1 },
    { west: -200, south: 0, east: 1, north: 1 },
    { west: 0, south: -91, east: 1, north: 1 },
    { west: 0, south: 0, east: Number.POSITIVE_INFINITY, north: 1 },
    { west: 0, south: 5, east: 1, north: 1 },
  ])("drops an invalid bias box %j", async (biasBox) => {
    const fetchFn = _respondWith({ results: [] });
    const geocoder = createGeoapifyGeocoder({ apiKey: "k", fetchFn });
    await geocoder.search({ text: ADDRESS, biasBox });
    expect(_requestedUrl(fetchFn).searchParams.has("bias")).toBe(false);
  });

  it("rejects empty text and text over 200 characters with a 400", async () => {
    const fetchFn = _respondWith({ results: [] });
    const geocoder = createGeoapifyGeocoder({ apiKey: "k", fetchFn });
    for (const text of ["   ", "a".repeat(201)]) {
      const error = (await geocoder
        .search({ text, biasBox: undefined })
        .catch((caught: unknown) => {
          return caught;
        })) as AvaHTTPError;
      expect(error.httpCode).toBe(400);
      expect(error.message).toBe("The address to search for is not valid.");
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
