import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { SERVICE_UNAVAILABLE } from "@sbfn/_shared/httpCodes.ts";
import { defineRoutes, POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import {
  createGeoapifyGeocoder,
  MAX_GEOCODE_TEXT_LENGTH,
} from "@sbfn/geocode/createGeoapifyGeocoder/createGeoapifyGeocoder.ts";
import { z } from "zod";
import type { GeocodeAPI } from "@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.types.ts";
import type { GeocoderProvider } from "@sbfn/geocode/GeocoderProvider.types.ts";

/**
 * The `/search` body: a trimmed address of 1 to `MAX_GEOCODE_TEXT_LENGTH`
 * characters and an optional view box in WGS 84 degrees.
 */
export const GeocodeSearchBodySchema = z.object({
  text: z.string().trim().min(1).max(MAX_GEOCODE_TEXT_LENGTH),
  biasBox: z
    .object({
      west: z.number().min(-180).max(180),
      south: z.number().min(-90).max(90),
      east: z.number().min(-180).max(180),
      north: z.number().min(-90).max(90),
    })
    .optional(),
});

function _createGeocoderFromEnv(): GeocoderProvider {
  const apiKey = Deno.env.get("GEOAPIFY_API_KEY");
  if (!apiKey) {
    throw new AvaHTTPError(
      "Address search is not configured.",
      SERVICE_UNAVAILABLE,
    );
  }
  return createGeoapifyGeocoder({ apiKey, fetchFn: fetch });
}

/**
 * Builds the `geocode` routes around a geocoder. Injected so a test can run
 * the route without `Deno.env` or the network. Production passes the
 * Geoapify geocoder read from the `GEOAPIFY_API_KEY` secret.
 */
export function createGeocodeRoutes(
  options: Readonly<{ getGeocoder: () => GeocoderProvider }>,
): ReturnType<typeof defineRoutes<GeocodeAPI>> {
  return defineRoutes<GeocodeAPI>("geocode", {
    "/search": {
      POST: POST("/search")
        .bodySchema(GeocodeSearchBodySchema)
        .action(async ({ body }) => {
          // The text can be an address. It is passed to the provider and
          // nowhere else: never log it, never put it in an error.
          const candidates = await options.getGeocoder().search({
            text: body.text,
            biasBox: body.biasBox,
          });
          return { candidates };
        }),
    },
  });
}

/** The deployed `geocode` routes, backed by Geoapify. */
export const GeocodeRoutes = createGeocodeRoutes({
  getGeocoder: _createGeocoderFromEnv,
});
