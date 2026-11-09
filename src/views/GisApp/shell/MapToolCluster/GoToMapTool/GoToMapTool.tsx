import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { useState } from "react";
import { match } from "ts-pattern";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import { GoToAddPlaceButton } from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToAddPlaceButton";
import css from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool.module.css";
import { findBoundaryFeatureByPcode } from "@/views/GisApp/tools/findBoundaryFeatureByPcode/findBoundaryFeatureByPcode";
import { parseMapGoToQuery } from "@/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { PlaceCoordinate } from "@/clients/places/places.types";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { I18n } from "@lingui/core";
import type { FormEvent, ReactNode } from "react";

type Props = {
  layers?: readonly MapLayer.T[];
  featureCollections?: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  requestFitBounds: (bounds: MapBounds) => void;

  /**
   * Starts a new place at a coordinate result. Omitted where places cannot
   * be added.
   */
  onAddPlaceAt?: (coordinate: PlaceCoordinate) => void;
};

type GoToErrorReason = "outOfRange" | "noBoundaryLayer" | "noMatchingPcode";

type GoToSubmitResult =
  | {
      type: "bounds";
      bounds: MapBounds;
      coordinate: PlaceCoordinate | undefined;
    }
  | { type: "error"; reason: GoToErrorReason };

type GoToSubmitOptions = {
  query: string;
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  i18n: I18n;
  requestFitBounds: (bounds: MapBounds) => void;
  setError: (error: string | undefined) => void;
  setLastCoordinate: (coordinate: PlaceCoordinate | undefined) => void;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];
const EMPTY_FEATURE_COLLECTIONS: ReadonlyMap<
  MapLayer.Id,
  GeoJSON.FeatureCollection
> = new Map();
const COORDINATE_PAD_DEGREES = 0.01;

function _makePaddedCoordinateBounds(
  longitude: number,
  latitude: number,
): MapBounds {
  return [
    [
      Math.max(-180, longitude - COORDINATE_PAD_DEGREES),
      Math.max(-90, latitude - COORDINATE_PAD_DEGREES),
    ],
    [
      Math.min(180, longitude + COORDINATE_PAD_DEGREES),
      Math.min(90, latitude + COORDINATE_PAD_DEGREES),
    ],
  ];
}

function _hasBoundaryLayer(layers: readonly MapLayer.T[]): boolean {
  return layers.some((layer) => {
    const bindingType = layer.geoBinding?.type;
    return (
      bindingType === "joinToBoundaries" ||
      bindingType === "aggregatePointsToBoundaries"
    );
  });
}

function _getPcodeSubmitResult(options: {
  code: string;
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
}): GoToSubmitResult {
  if (!_hasBoundaryLayer(options.layers)) {
    return { type: "error", reason: "noBoundaryLayer" };
  }
  const feature = findBoundaryFeatureByPcode(options);
  const bounds = feature
    ? getBoundsFromFeatureCollection({
        type: "FeatureCollection",
        features: [feature],
      })
    : undefined;
  if (!bounds) {
    return { type: "error", reason: "noMatchingPcode" };
  }
  return { type: "bounds", bounds, coordinate: undefined };
}

function _getGoToSubmitResult(options: {
  query: string;
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
}): GoToSubmitResult | undefined {
  const parsed = parseMapGoToQuery(options.query);
  return match(parsed)
    .with({ type: "invalid" }, (invalid) => {
      return invalid.reason === "unparsed"
        ? undefined
        : { type: "error" as const, reason: "outOfRange" as const };
    })
    .with({ type: "coordinate" }, (coordinate) => {
      return {
        type: "bounds" as const,
        bounds: _makePaddedCoordinateBounds(
          coordinate.longitude,
          coordinate.latitude,
        ),
        coordinate: {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        },
      };
    })
    .with({ type: "pcode" }, (pcode) => {
      return _getPcodeSubmitResult({
        code: pcode.code,
        layers: options.layers,
        featureCollections: options.featureCollections,
      });
    })
    .exhaustive();
}

function _errorMessageFromReason(reason: GoToErrorReason, i18n: I18n): string {
  return matchLiteral(reason, {
    outOfRange: i18n._(msg`That coordinate is out of range.`),
    noBoundaryLayer: i18n._(
      msg`No boundary layer on this map to look up a P-code.`,
    ),
    noMatchingPcode: i18n._(msg`No matching P-code.`),
  });
}

function _onGoToSubmit(options: GoToSubmitOptions): void {
  const result = _getGoToSubmitResult(options);
  if (!result || result.type === "error") {
    options.setError(
      result ? _errorMessageFromReason(result.reason, options.i18n) : undefined,
    );
    options.setLastCoordinate(undefined);
    return;
  }
  options.setError(undefined);
  options.setLastCoordinate(result.coordinate);
  options.requestFitBounds(result.bounds);
}

/** The Go-to field's state and the handlers that change it. */
function useGoToField(props: Readonly<Required<Omit<Props, "onAddPlaceAt">>>) {
  const { i18n } = useLingui();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastCoordinate, setLastCoordinate] = useState<
    PlaceCoordinate | undefined
  >(undefined);
  return {
    query,
    error,
    lastCoordinate,
    label: i18n._(msg`Go to a coordinate or P-code`),
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      _onGoToSubmit({ ...props, query, i18n, setError, setLastCoordinate });
    },
    onQueryChange: (value: string) => {
      setQuery(value);
      setError(undefined);
      setLastCoordinate(undefined);
    },
    clearLastCoordinate: () => {
      setLastCoordinate(undefined);
    },
  };
}

/** Search field that flies the camera to a coordinate or P-code. */
export function GoToMapTool({
  layers = EMPTY_LAYERS,
  featureCollections = EMPTY_FEATURE_COLLECTIONS,
  requestFitBounds,
  onAddPlaceAt,
}: Readonly<Props>): ReactNode {
  const field = useGoToField({ layers, featureCollections, requestFitBounds });
  const { lastCoordinate } = field;
  return (
    <form className={css.goToMapTool} onSubmit={field.onSubmit}>
      <TextInput
        aria-label={field.label}
        placeholder={field.label}
        size="xs"
        value={field.query}
        error={field.error}
        rightSection={
          lastCoordinate && onAddPlaceAt ? (
            <GoToAddPlaceButton
              onClick={() => {
                onAddPlaceAt(lastCoordinate);
                field.clearLastCoordinate();
              }}
            />
          ) : undefined
        }
        onChange={(event) => {
          field.onQueryChange(event.currentTarget.value);
        }}
      />
    </form>
  );
}
