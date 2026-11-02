import { useEffect, useRef, useState } from "react";
import { vi } from "vitest";
/**
 * Shared map-tool harness for AnnotateMapTool tests.
 */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { useMapToolGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures";
import { AnnotationFeatureInspector } from "@/views/GisApp/panels/LayerInspector/AnnotationFeatureInspector/AnnotationFeatureInspector";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { AnnotationTextOverlay } from "@/views/GisApp/shell/AnnotationTextOverlay/AnnotationTextOverlay";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

function readyViewState(): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: 1,
    droppedRowCount: 0,
    drops: [],
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
  };
}

type Props = {
  fakeMap: ReturnType<typeof createFakeMap>;
  initialConfig?: AvaMapConfig.T;
  onConfigChange?: (config: AvaMapConfig.T) => void;
};

export function AnnotateHarness({
  fakeMap,
  initialConfig,
  onConfigChange,
}: Props): ReactNode {
  const [config, setConfig] = useState(
    initialConfig ?? AvaMapConfig.makeEmpty(),
  );
  const [mapToolMode, setMapToolMode] = useState<MapToolMode>({ type: "pan" });
  const [selectedFeatureId, setSelectedFeatureId] = useState<
    AvaMapConfig.AnnotationFeatureId | undefined
  >();
  const [editingTextFeatureId, setEditingTextFeatureId] = useState<
    AvaMapConfig.AnnotationFeatureId | undefined
  >();
  const mapRef = useRef(fakeMap.map);
  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;
  const isFirstConfigEffectRef = useRef(true);
  useEffect(() => {
    if (isFirstConfigEffectRef.current) {
      isFirstConfigEffectRef.current = false;
      return;
    }
    onConfigChangeRef.current?.(config);
  }, [config]);
  const updateConfig = (
    update: (current: AvaMapConfig.T) => AvaMapConfig.T,
  ): void => {
    setConfig((current) => {
      return update(current);
    });
  };
  const {
    lastCreatedAnnotationId,
    inProgressVertices,
    annotationPreviewVertices,
  } = useMapToolGestures({
    mapRef,
    mapToolMode,
    onMapToolModeChange: setMapToolMode,
    updateConfig,
    onEditingTextFeatureIdChange: setEditingTextFeatureId,
  });
  const selectedFeatureIdOrCreated =
    selectedFeatureId ?? lastCreatedAnnotationId;
  const selectedFeature = config.annotations.features.find((feature) => {
    return feature.id === selectedFeatureIdOrCreated;
  });
  const editingFeature = config.annotations.features.find((feature) => {
    return feature.id === editingTextFeatureId && feature.kind === "text";
  });
  const replaceFeature = (
    nextFeature: AvaMapConfig.AnnotationFeature,
  ): void => {
    setConfig((current) => {
      return {
        ...current,
        annotations: {
          ...current.annotations,
          features: current.annotations.features.map((feature) => {
            return feature.id === nextFeature.id ? nextFeature : feature;
          }),
        },
      };
    });
  };
  const dataLayer = config.layers[0];
  return (
    <>
      <MapToolCluster
        mapToolMode={mapToolMode}
        onMapToolModeChange={setMapToolMode}
      />
      <LayerList
        rows={AvaMapConfig.toStackOrder(config)}
        viewStates={
          dataLayer ? new Map([[dataLayer.id, readyViewState()]]) : new Map()
        }
        selectedLayerId={undefined}
        isAnnotationRowSelected
        annotations={config.annotations}
        annotationsZIndex={config.annotationsZIndex}
        onStackOrderChange={vi.fn()}
        onSelectLayer={vi.fn()}
        onSelectAnnotationRow={vi.fn()}
        onToggleLayerVisible={vi.fn()}
        onToggleAnnotationsVisible={vi.fn()}
        onMoveAnnotationsByOffset={vi.fn()}
        onRenameLayer={vi.fn()}
        onDuplicateLayer={vi.fn()}
        onZoomToLayer={vi.fn()}
        onDeleteLayer={vi.fn()}
      />
      <span data-testid="aoi-in-progress">
        {JSON.stringify(inProgressVertices)}
      </span>
      <span data-testid="annotation-preview">
        {JSON.stringify(annotationPreviewVertices)}
      </span>
      {editingFeature?.kind === "text" ? (
        <AnnotationTextOverlay
          map={fakeMap.map}
          feature={editingFeature}
          onTextChange={(text) => {
            replaceFeature({ ...editingFeature, text });
          }}
          onCommit={() => {
            setEditingTextFeatureId(undefined);
          }}
        />
      ) : selectedFeature?.kind === "text" ? (
        <AnnotationTextOverlay
          map={fakeMap.map}
          feature={selectedFeature}
          mode="select"
          onMove={(coordinates) => {
            replaceFeature({
              ...selectedFeature,
              geometry: { type: "Point", coordinates },
            });
          }}
          onResize={(sizePx) => {
            replaceFeature({ ...selectedFeature, sizePx });
          }}
          onStartEdit={() => {
            setEditingTextFeatureId(selectedFeature.id);
          }}
        />
      ) : null}
      {selectedFeature && config.annotations.isVisible ? (
        <AnnotationFeatureInspector
          feature={selectedFeature}
          onFeatureChange={replaceFeature}
          onDelete={() => {
            setConfig((current) => {
              return AvaMapConfig.withoutAnnotationFeature({
                config: current,
                featureId: selectedFeature.id,
              });
            });
            setSelectedFeatureId(undefined);
          }}
        />
      ) : null}
    </>
  );
}
