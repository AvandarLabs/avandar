import { Button, Group, Stack } from "@mantine/core";
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
      {candidates.map((candidate) => {
        return (
          <Button
            key={`${candidate.label}-${candidate.latitude}-${candidate.longitude}`}
            size="compact-xs"
            variant="subtle"
            color="neutral"
            justify="flex-start"
            aria-label={candidate.label}
            onClick={() => {
              onPick(candidate);
            }}
          >
            {candidate.label}
          </Button>
        );
      })}
      <Group gap="xs">
        <GeoapifyAttribution />
        <OpenStreetMapAttribution />
      </Group>
    </Stack>
  );
}
