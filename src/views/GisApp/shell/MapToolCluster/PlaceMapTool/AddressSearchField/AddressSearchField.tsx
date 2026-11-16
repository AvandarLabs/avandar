import { useLingui } from "@lingui/react/macro";
import { Loader, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { AddressSearchResults } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults";
import { AddressSearchStatus } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchStatus";
import { useAddressSearch } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/useAddressSearch";
import type {
  GeocodeBiasBox,
  GeocodeCandidate,
} from "@sbfn/geocode/GeocoderProvider.types";
import type { ReactNode } from "react";

type Props = {
  biasBox: GeocodeBiasBox | undefined;
  onPick: (candidate: GeocodeCandidate) => void;
};

/**
 * Finds a public place by address for the place tool. Its help text says
 * the search leaves Avandar, so contact home addresses (protected health
 * information) must never be typed here.
 */
export function AddressSearchField({ biasBox, onPick }: Props): ReactNode {
  const { t } = useLingui();
  const [text, setText] = useState("");
  const { candidates, isSearching, isError, hasResult } = useAddressSearch({
    text,
    biasBox,
  });
  return (
    <Stack gap={4}>
      <TextInput
        size="xs"
        label={t`Search an address`}
        description={t`For public places only. The search goes to an outside service, so never type a person's home address.`}
        value={text}
        onChange={(event) => {
          setText(event.currentTarget.value);
        }}
        rightSection={isSearching ? <Loader size="xs" /> : null}
        error={
          isError ? t`Address search is not available right now.` : undefined
        }
      />
      {candidates.length > 0 ? (
        <AddressSearchResults candidates={candidates} onPick={onPick} />
      ) : null}
      <AddressSearchStatus
        hasResult={hasResult}
        resultCount={candidates.length}
      />
    </Stack>
  );
}
