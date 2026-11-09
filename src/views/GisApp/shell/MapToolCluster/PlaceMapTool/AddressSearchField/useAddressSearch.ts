import { useQuery } from "@avandar/query-hooks";
import { useDebouncedValue } from "@mantine/hooks";
import { APIClient } from "@/clients/APIClient";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
} from "@sbfn/geocode/GeocoderProvider.types";

const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_CACHE_MS = 60_000;
const EMPTY_CANDIDATES: readonly GeocodeCandidate[] = [];

/** The address search's current matches and request state. */
type AddressSearch = {
  candidates: readonly GeocodeCandidate[];
  isSearching: boolean;
  isError: boolean;
};

/**
 * Searches an address through the `geocode` edge function while the user
 * types, preferring matches inside `biasBox`. Kept out of the persisted
 * query cache because the text can be an address. Used by
 * `AddressSearchField`.
 */
export function useAddressSearch(
  options: Readonly<{ text: string; biasBox: GeocodeBiasBox | undefined }>,
): AddressSearch {
  const [debouncedText] = useDebouncedValue(
    options.text.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const isEnabled = debouncedText.length >= MIN_SEARCH_LENGTH;
  const [data, isLoading, queryResult] = useQuery({
    queryKey: ["geocode", "search", debouncedText, options.biasBox],
    queryFn: async () => {
      return await APIClient.post({
        route: "geocode/search",
        body: { text: debouncedText, biasBox: options.biasBox },
      });
    },
    enabled: isEnabled,
    meta: { persist: false },
    staleTime: SEARCH_CACHE_MS,
    gcTime: SEARCH_CACHE_MS,
  });
  return {
    candidates: isEnabled
      ? (data?.candidates ?? EMPTY_CANDIDATES)
      : EMPTY_CANDIDATES,
    isSearching: isEnabled && isLoading,
    isError: isEnabled && queryResult.isError,
  };
}
