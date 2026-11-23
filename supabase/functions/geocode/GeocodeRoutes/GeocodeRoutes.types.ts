import type { APITypeDef } from "@sbfn/_shared/MiniServer/api.types.ts";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
} from "@sbfn/geocode/GeocoderProvider.types.ts";

/** HTTP contract for the address search used by the map's place tool. */
export type GeocodeAPI = APITypeDef<
  "geocode",
  ["/search"],
  {
    /**
     * Up to five address matches for `text`, preferring ones inside
     * `biasBox`. A POST so the address never appears in a URL.
     */
    "/search": {
      POST: {
        body: { text: string; biasBox?: GeocodeBiasBox };
        returnType: { candidates: GeocodeCandidate[] };
      };
    };
  }
>;
