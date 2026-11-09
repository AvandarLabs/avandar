import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_GATEWAY } from "@sbfn/_shared/httpCodes.ts";
import { z } from "zod";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
  GeocoderProvider,
} from "@sbfn/geocode/GeocoderProvider.types.ts";

const GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const MAX_CANDIDATES = 5;

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
  if (box) {
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
 * carry the searched text, because it can be an address.
 */
export function createGeoapifyGeocoder(
  options: Readonly<{ apiKey: string; fetchFn: typeof fetch }>,
): GeocoderProvider {
  return {
    search: async ({ text, biasBox }) => {
      const response = await options.fetchFn(
        _buildSearchUrl({ apiKey: options.apiKey, text, biasBox }),
      );
      if (!response.ok) {
        throw new AvaHTTPError(
          `The address search provider answered ${response.status}.`,
          BAD_GATEWAY,
        );
      }
      const parsed = GeoapifyResponseSchema.safeParse(await response.json());
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
