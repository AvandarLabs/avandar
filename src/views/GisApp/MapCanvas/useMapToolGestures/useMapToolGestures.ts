import { noop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";
import { attachAnnotateGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachAnnotateGestures";
import { attachEraseGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachEraseGestures";
import {
    attachAoiGestures,
    attachMeasureGestures,
} from "@/views/GisApp/MapCanvas/useMapToolGestures/attachRingGestures";
import { useMapPanPolicy } from "@/views/GisApp/MapCanvas/useMapToolGestures/useMapPanPolicy";
import type {
    AoiGestureCallbacks,
    MeasureGestureCallbacks,
} from "@/views/GisApp/MapCanvas/useMapToolGestures/attachRingGestures";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Dispatch, RefObject, SetStateAction } from "react";

type Vertex = [number, number];

type Options = {
  mapRef: RefObject<MapLibreMap | undefined>;
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  onEditingTextFeatureIdChange?: (
    featureId: AvaMapConfig.AnnotationFeatureId | undefined,
  ) => void;
};

type AnnotateIdSetter = Dispatch<
  SetStateAction<AvaMapConfig.AnnotationFeatureId | undefined>
>;

function _attachGesturesForMode(
  map: MapLibreMap,
  mapToolMode: MapToolMode,
  aoiCallbacks: AoiGestureCallbacks,
  measureCallbacks: MeasureGestureCallbacks,
  annotate: {
    setLastCreatedAnnotationId: AnnotateIdSetter;
    onEditingTextFeatureIdChange: (
      featureId: AvaMapConfig.AnnotationFeatureId | undefined,
    ) => void;
    textPlaceholder: string;
  },
): (() => void) | undefined {
  return match(mapToolMode)
    .with({ type: "aoi" }, () => {
      return attachAoiGestures(map, aoiCallbacks);
    })
    .with({ type: "measure" }, () => {
      return attachMeasureGestures(map, measureCallbacks);
    })
    .with({ type: "annotate" }, (mode) => {
      return attachAnnotateGestures(map, mode.kind, {
        ...aoiCallbacks,
        ...annotate,
      });
    })
    .with({ type: "pan" }, () => {
      return undefined;
    })
    .with({ type: "buffer" }, () => {
      return undefined;
    })
    .with({ type: "goto" }, () => {
      return undefined;
    })
    .with({ type: "erase" }, () => {
      return attachEraseGestures(map, {
        onMapToolModeChange: aoiCallbacks.onMapToolModeChange,
        updateConfig: aoiCallbacks.updateConfig,
      });
    })
    .exhaustive();
}

function _toolKey(mapToolMode: MapToolMode): string {
  return mapToolMode.type === "annotate" ?
      `annotate:${mapToolMode.kind}`
    : mapToolMode.type;
}

type VertexReset = {
  toolKey: string;
  vertexToolKey: string;
  setVertexToolKey: Dispatch<SetStateAction<string>>;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  setInvalidRingStatus: Dispatch<SetStateAction<string | undefined>>;
  verticesRef: { current: Vertex[] };
};

function _resetVerticesForToolChange(options: VertexReset): void {
  if (options.vertexToolKey === options.toolKey) {
    return;
  }
  options.setVertexToolKey(options.toolKey);
  options.setVertices([]);
  options.setInvalidRingStatus(undefined);
  options.verticesRef.current = [];
}

type RegisterToolGesturesOptions = {
  mapRef: Options["mapRef"];
  mapToolMode: MapToolMode;
  onMapToolModeChange: Options["onMapToolModeChange"];
  updateConfig: Options["updateConfig"];
  invalidRingMessage: string;
  setInvalidRingStatus: Dispatch<SetStateAction<string | undefined>>;
  setLastCreatedAnnotationId: AnnotateIdSetter;
  setVertices: Dispatch<SetStateAction<Vertex[]>>;
  verticesRef: { current: Vertex[] };
  textPlaceholder: string;
  onEditingTextFeatureIdChange: (
    featureId: AvaMapConfig.AnnotationFeatureId | undefined,
  ) => void;
};

function useRegisterToolGestures(options: RegisterToolGesturesOptions): void {
  const {
    mapRef,
    mapToolMode,
    onMapToolModeChange,
    updateConfig,
    invalidRingMessage,
    setInvalidRingStatus,
    setLastCreatedAnnotationId,
    setVertices,
    verticesRef,
    textPlaceholder,
    onEditingTextFeatureIdChange,
  } = options;
  useEffect(
    function registerToolGestures() {
      const map = mapRef.current;
      if (!map) {
        return undefined;
      }
      return _attachGesturesForMode(
        map,
        mapToolMode,
        {
          invalidRingMessage,
          onInvalidRing: setInvalidRingStatus,
          onMapToolModeChange,
          setVertices,
          updateConfig,
          verticesRef,
        },
        { onMapToolModeChange, setVertices, verticesRef },
        {
          setLastCreatedAnnotationId,
          onEditingTextFeatureIdChange,
          textPlaceholder,
        },
      );
    },
    [
      invalidRingMessage,
      mapRef,
      mapToolMode,
      onEditingTextFeatureIdChange,
      onMapToolModeChange,
      setInvalidRingStatus,
      setLastCreatedAnnotationId,
      setVertices,
      textPlaceholder,
      updateConfig,
      verticesRef,
    ],
  );
}

function _inProgressVerticesForMode(
  mapToolMode: MapToolMode,
  vertices: readonly Vertex[],
): readonly Vertex[] {
  if (mapToolMode.type === "aoi") {
    return vertices;
  }
  return [];
}

function _annotationPreviewVerticesForMode(
  mapToolMode: MapToolMode,
  vertices: readonly Vertex[],
): readonly Vertex[] {
  if (mapToolMode.type !== "annotate") {
    return [];
  }
  if (
    mapToolMode.kind === "area" ||
    mapToolMode.kind === "freehand" ||
    mapToolMode.kind === "arrow"
  ) {
    return vertices;
  }
  return [];
}

type GestureResult = {
  inProgressVertices: readonly Vertex[];
  annotationPreviewVertices: readonly Vertex[];
  measureVertices: readonly Vertex[];
  invalidRingStatus: string | undefined;
  lastCreatedAnnotationId: AvaMapConfig.AnnotationFeatureId | undefined;
};

/**
 * Registers map-tool click, close, and Escape-to-Pan gestures.
 */
export function useMapToolGestures({
  mapRef,
  mapToolMode,
  onMapToolModeChange,
  updateConfig,
  onEditingTextFeatureIdChange = noop,
}: Options): GestureResult {
  const { t } = useLingui();
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [invalidRingStatus, setInvalidRingStatus] = useState<string>();
  const [vertexToolKey, setVertexToolKey] = useState(() => {
    return _toolKey(mapToolMode);
  });
  const [lastCreatedAnnotationId, setLastCreatedAnnotationId] = useState<
    AvaMapConfig.AnnotationFeatureId | undefined
  >();
  const verticesRef = useRef<Vertex[]>([]);
  const invalidRingMessage = t`Close a valid ring that does not cross itself.`;
  const textPlaceholder = t`Enter your text here`;
  useMapPanPolicy({ mapRef, mapToolMode });
  _resetVerticesForToolChange({
    toolKey: _toolKey(mapToolMode),
    vertexToolKey,
    setVertexToolKey,
    setVertices,
    setInvalidRingStatus,
    verticesRef,
  });
  useRegisterToolGestures({
    mapRef,
    mapToolMode,
    onMapToolModeChange,
    updateConfig,
    invalidRingMessage,
    setInvalidRingStatus,
    setLastCreatedAnnotationId,
    setVertices,
    verticesRef,
    textPlaceholder,
    onEditingTextFeatureIdChange,
  });
  return {
    inProgressVertices: _inProgressVerticesForMode(mapToolMode, vertices),
    annotationPreviewVertices: _annotationPreviewVerticesForMode(
      mapToolMode,
      vertices,
    ),
    measureVertices: mapToolMode.type === "measure" ? vertices : [],
    invalidRingStatus,
    lastCreatedAnnotationId,
  };
}
