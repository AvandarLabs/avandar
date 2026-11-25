import { useLingui } from "@lingui/react/macro";
import { Button, Stack, TextInput } from "@mantine/core";
import { IconPointer } from "@tabler/icons-react";
import { useState } from "react";
import { AddressSearchField } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField";
import { parseMapGoToQuery } from "@/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery";
import type { PlaceCoordinate } from "@/clients/places/places.types";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

type Props = { controller: PlaceToolController };

type CoordinateFieldProps = {
  onPlacePicked: (coordinate: PlaceCoordinate) => void;
};

/** Typed "latitude, longitude" input; Enter uses it as the location. */
function PlaceCoordinateField({ onPlacePicked }: CoordinateFieldProps) {
  const { t } = useLingui();
  const [coordinateText, setCoordinateText] = useState("");
  const [coordinateError, setCoordinateError] = useState<string | undefined>();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = parseMapGoToQuery(coordinateText);
        if (parsed.type === "coordinate") {
          onPlacePicked({
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          });
          return;
        }
        setCoordinateError(
          parsed.type === "invalid" && parsed.reason === "outOfRange"
            ? t`That coordinate is out of range.`
            : t`Type a latitude and longitude, like 40.7603, -73.9885.`,
        );
      }}
    >
      <TextInput
        size="xs"
        label={t`Latitude and longitude`}
        description={t`Press Enter to use it.`}
        value={coordinateText}
        error={coordinateError}
        onChange={(event) => {
          setCoordinateText(event.currentTarget.value);
          setCoordinateError(undefined);
        }}
      />
    </form>
  );
}

/**
 * Sets a place's location three ways: a map click, typed coordinates, or
 * an address search.
 */
export function PlaceLocationStep({ controller }: Props): ReactNode {
  const { t } = useLingui();
  const [biasBox] = useState(controller.getBiasBox);
  return (
    <Stack gap="sm">
      <Button
        size="xs"
        variant="default"
        leftSection={<IconPointer size={14} />}
        onClick={controller.armMapPick}
      >
        {t`Click the map`}
      </Button>
      <PlaceCoordinateField onPlacePicked={controller.state.onPlacePicked} />
      <AddressSearchField
        biasBox={biasBox}
        onPick={(candidate) => {
          controller.state.onSearchResultPicked({
            coordinate: {
              latitude: candidate.latitude,
              longitude: candidate.longitude,
            },
            address: candidate.label,
          });
        }}
      />
    </Stack>
  );
}
