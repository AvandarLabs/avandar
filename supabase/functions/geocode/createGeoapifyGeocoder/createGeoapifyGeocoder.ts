import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import {
  BAD_GATEWAY,
  BAD_REQUEST,
  GATEWAY_TIMEOUT,
} from "@sbfn/_shared/httpCodes.ts";
import { z } from "zod";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
  GeocoderProvider,
} from "@sbfn/geocode/GeocoderProvider.types.ts";

const GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const MAX_CANDIDATES = 5;
const REQUEST_TIMEOUT_MS = 5000;

/** Longest address text the provider will search for. */
export const MAX_GEOCODE_TEXT_LENGTH = 200;

const GeoapifyResponseSchema = z.object({
  results: z
    .array(
      z.object({
        formatted: z.string(),
        lat: z.number(),
        lon: z.number(),
        rank: z.object({ confidence: z.number().optional() }).optional(),
      }),
    )
    .default([]),
});

function _isValidBiasBox(box: GeocodeBiasBox): boolean {
  const { west, south, east, north } = box;
  const isLongitude = (value: number): boolean => {
    return Number.isFinite(value) && value >= -180 && value <= 180;
  };
  const isLatitude = (value: number): boolean => {
    return Number.isFinite(value) && value >= -90 && value <= 90;
  };
  return (
    isLongitude(west) &&
    isLongitude(east) &&
    isLatitude(south) &&
    isLatitude(north) &&
    south <= north
  );
}

async function _fetchJson(fetchFn: typeof fetch, url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFn(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (caught) {
    const isTimeout =
      (caught as { name?: unknown } | null)?.name === "TimeoutError";
    throw isTimeout
      ? new AvaHTTPError(
          "The address search provider timed out.",
          GATEWAY_TIMEOUT,
        )
      : new AvaHTTPError(
          "The address search provider could not be reached.",
          BAD_GATEWAY,
        );
  }
  if (!response.ok) {
    throw new AvaHTTPError(
      `The address search provider answered ${response.status}.`,
      BAD_GATEWAY,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new AvaHTTPError(
      "The address search provider sent an unexpected response.",
      BAD_GATEWAY,
    );
  }
}

function _buildSearchUrl(
  options: Readonly<{
    apiKey: string;
    text: string;
    biasBox: GeocodeBiasBox | undefined;
  }>,
): URL {
  const url = new URL(GEOAPIFY_SEARCH_URL);
  url.searchParams.set("text", options.text);
  url.searchParams.set("limit", String(MAX_CANDIDATES));
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", options.apiKey);
  const box = options.biasBox;
  if (box && _isValidBiasBox(box)) {
    url.searchParams.set(
      "bias",
      `rect:${box.west},${box.south},${box.east},${box.north}`,
    );
  }
  return url;
}

function _toCandidate(
  result: z.infer<typeof GeoapifyResponseSchema>["results"][number],
): GeocodeCandidate {
  return {
    label: result.formatted,
    latitude: result.lat,
    longitude: result.lon,
    confidence: result.rank?.confidence ?? 0,
  };
}

/**
 * The Geoapify (OpenStreetMap-based) `GeocoderProvider`. Its results may be
 * stored with OpenStreetMap attribution, which places need. Errors never
 * carry the searched text, because it can be an address. Empty text, or text
 * over `MAX_GEOCODE_TEXT_LENGTH`, throws a 400. A bias box with non-finite or
 * out-of-range values is dropped rather than sent.
 */
export function createGeoapifyGeocoder(
  options: Readonly<{ apiKey: string; fetchFn: typeof fetch }>,
): GeocoderProvider {
  return {
    search: async ({ text, biasBox }) => {
      const trimmedText = text.trim();
      if (trimmedText === "" || trimmedText.length > MAX_GEOCODE_TEXT_LENGTH) {
        throw new AvaHTTPError(
          "The address to search for is not valid.",
          BAD_REQUEST,
        );
      }
      const body = await _fetchJson(
        options.fetchFn,
        _buildSearchUrl({ apiKey: options.apiKey, text: trimmedText, biasBox }),
      );
      const parsed = GeoapifyResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new AvaHTTPError(
          "The address search provider sent an unexpected response.",
          BAD_GATEWAY,
        );
      }
      return parsed.data.results.slice(0, MAX_CANDIDATES).map(_toCandidate);
    },
  };
}
