import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { useState } from "react";
import { match } from "ts-pattern";
import { getBoundsFromFeatureCollection } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import css from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool.module.css";
import { findBoundaryFeatureByPcode } from "@/views/GisApp/tools/findBoundaryFeatureByPcode/findBoundaryFeatureByPcode";
import { parseMapGoToQuery } from "@/views/GisApp/tools/parseMapGoToQuery/parseMapGoToQuery";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  layers?: readonly MapLayer.T[];
  featureCollections?: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  requestFitBounds: (bounds: MapBounds) => void;
};

type GoToErrorReason = "outOfRange" | "noBoundaryLayer" | "noMatchingPcode";

type GoToSubmitResult =
  | { type: "bounds"; bounds: MapBounds }
  | { type: "error"; reason: GoToErrorReason };

type GoToSubmitOptions = {
  query: string;
  layers: readonly MapLayer.T[];
  featureCollections: ReadonlyMap<MapLayer.Id, GeoJSON.FeatureCollection>;
  i18n: I18n;
  requestFitBounds: (bounds: MapBounds) => void;
  setError: (error: string | undefined) => void;
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
  return { type: "bounds", bounds };
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
  if (!result) {
    options.setError(undefined);
    return;
  }
  if (result.type === "error") {
    options.setError(_errorMessageFromReason(result.reason, options.i18n));
    return;
  }
  options.setError(undefined);
  options.requestFitBounds(result.bounds);
}

/** Search field that flies the camera to a coordinate or P-code. */
export function GoToMapTool({
  layers = EMPTY_LAYERS,
  featureCollections = EMPTY_FEATURE_COLLECTIONS,
  requestFitBounds,
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const label = i18n._(msg`Go to a coordinate or P-code`);
  return (
    <form
      className={css.goToMapTool}
      onSubmit={(event) => {
        event.preventDefault();
        _onGoToSubmit({
          query,
          layers,
          featureCollections,
          i18n,
          requestFitBounds,
          setError,
        });
      }}
    >
      <TextInput
        aria-label={label}
        placeholder={label}
        size="xs"
        value={query}
        error={error}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setError(undefined);
        }}
      />
    </form>
  );
}
