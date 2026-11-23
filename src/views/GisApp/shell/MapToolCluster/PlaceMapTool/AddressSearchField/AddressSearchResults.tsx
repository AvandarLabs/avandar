import { Group, Stack, UnstyledButton } from "@mantine/core";
import css from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchResults.module.css";
import { GeoapifyAttribution } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/GeoapifyAttribution";
import { OpenStreetMapAttribution } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/OpenStreetMapAttribution";
import type { GeocodeCandidate } from "@sbfn/geocode/GeocoderProvider.types";
import type { ReactNode } from "react";

type Props = {
  candidates: readonly GeocodeCandidate[];
  onPick: (candidate: GeocodeCandidate) => void;
};

/**
 * The address matches to pick from, with the Geoapify and OpenStreetMap
 * credits they need.
 */
export function AddressSearchResults({ candidates, onPick }: Props): ReactNode {
  return (
    <Stack gap={2}>
      <ul className={css.addressSearchResultList} role="list">
        {candidates.map((candidate) => {
          return (
            <li
              key={`${candidate.label}-${candidate.latitude}-${candidate.longitude}`}
            >
              <UnstyledButton
                className={css.addressSearchResult}
                onClick={() => {
                  onPick(candidate);
                }}
              >
                {candidate.label}
              </UnstyledButton>
            </li>
          );
        })}
      </ul>
      <Group gap="xs">
        <GeoapifyAttribution />
        <OpenStreetMapAttribution />
      </Group>
    </Stack>
  );
}
