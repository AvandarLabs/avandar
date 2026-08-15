import { InputTextForm } from "@avandar/ui";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { GisAppState } from "@/views/GisApp/useGisApp";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

type GisAppLayerAction = (layerId: MapLayer.Id) => void;

export type GisAppLayerActions = {
  onDeleteLayer: GisAppLayerAction;
  onDuplicateLayer: GisAppLayerAction;
  onRenameLayer: GisAppLayerAction;
  onZoomToLayer: GisAppLayerAction;
  onAddLayerFromSource: (dataSource: QueryDataSource.T) => void;
  onStackOrderChange: (orderedLayerIds: readonly MapLayer.Id[]) => void;
  onToggleLayerVisible: GisAppLayerAction;
  updateSelectedLayer: (update: (current: MapLayer.T) => MapLayer.T) => void;
};

type GisAppLayerSelectionActions = Pick<
  GisAppLayerActions,
  "onAddLayerFromSource" | "updateSelectedLayer"
>;

type GisAppLayerStackActions = Pick<
  GisAppLayerActions,
  "onStackOrderChange" | "onToggleLayerVisible"
>;

type RenameLayerModalOptions = {
  cancelLabel: string;
  currentName: string;
  fieldLabel: string;
  onRename: (name: string) => void;
  submitLabel: string;
  title: string;
};

/** Opens the one-field layer rename flow. */
function _openRenameLayerModal(options: RenameLayerModalOptions): void {
  const modalId = modals.open({
    title: options.title,
    children: (
      <InputTextForm
        required
        defaultValue={options.currentName}
        inputWidth="100%"
        label={options.fieldLabel}
        showCancelButton
        submitButtonLabel={options.submitLabel}
        cancelButtonLabel={options.cancelLabel}
        validateOnChange
        onCancel={() => {
          modals.close(modalId);
        }}
        onSubmit={(name) => {
          options.onRename(name.trim());
          modals.close(modalId);
        }}
      />
    ),
  });
}

/** Chooses the adjacent persisted layer that survives a deletion. */
function _getNearestSurvivingLayerId(
  layers: readonly MapLayer.T[],
  deletedLayerId: MapLayer.Id,
): MapLayer.Id | undefined {
  const deletedLayerIndex = layers.findIndex(propEq("id", deletedLayerId));
  return deletedLayerIndex === -1 ? undefined : (
      (layers[deletedLayerIndex + 1]?.id ?? layers[deletedLayerIndex - 1]?.id)
    );
}

/** Updates a selected layer and creates one from a chosen data source. */
function useGisAppLayerSelectionActions(
  app: GisAppState,
): GisAppLayerSelectionActions {
  const updateSelectedLayer = (
    update: (current: MapLayer.T) => MapLayer.T,
  ): void => {
    const selectedLayerId = app.selectedLayerId;
    if (!selectedLayerId) {
      return;
    }
    app.updateConfig((current) => {
      return AvaMapConfig.withLayerReplaced(current, selectedLayerId, update);
    });
  };
  const onAddLayerFromSource = (dataSource: QueryDataSource.T): void => {
    const layer = MapLayer.makeFromDataSource({
      dataSource,
      name: dataSource.name,
    });
    app.updateConfig((current) => {
      return AvaMapConfig.withLayerAdded(current, layer);
    });
    app.setSelectedLayerId(layer.id);
  };

  return { onAddLayerFromSource, updateSelectedLayer };
}

/** Updates layer order and visibility from layer-panel controls. */
function useGisAppLayerStackActions(app: GisAppState): GisAppLayerStackActions {
  const onStackOrderChange = (
    orderedLayerIds: readonly MapLayer.Id[],
  ): void => {
    app.updateConfig((current) => {
      return AvaMapConfig.withStackOrder(current, orderedLayerIds);
    });
  };
  const onToggleLayerVisible = (layerId: MapLayer.Id): void => {
    app.updateConfig((current) => {
      return AvaMapConfig.withLayerReplaced(current, layerId, (layer) => {
        return MapLayerUpdates.withVisibility(layer, !layer.isVisible);
      });
    });
  };

  return { onStackOrderChange, onToggleLayerVisible };
}

/** Opens the translated rename dialog for a layer in the current config. */
function useGisAppLayerRename(app: GisAppState): GisAppLayerAction {
  const { t } = useLingui();

  return (layerId: MapLayer.Id): void => {
    const layer = app.mapConfig.layers.find(propEq("id", layerId));
    if (!layer) {
      return;
    }
    _openRenameLayerModal({
      cancelLabel: t`Cancel`,
      currentName: layer.name,
      fieldLabel: t`Layer name`,
      onRename: (nextName) => {
        app.updateConfig((current) => {
          return AvaMapConfig.withLayerReplaced(
            current,
            layerId,
            (currentLayer) => {
              return MapLayerUpdates.withName(currentLayer, nextName);
            },
          );
        });
      },
      submitLabel: t`Rename`,
      title: t`Rename layer`,
    });
  };
}

/** Duplicates a layer with the translated default duplicate name. */
function useGisAppLayerDuplication(app: GisAppState): GisAppLayerAction {
  const { t } = useLingui();

  return (layerId: MapLayer.Id): void => {
    const layer = app.mapConfig.layers.find(propEq("id", layerId));
    app.updateConfig((current) => {
      return AvaMapConfig.withLayerDuplicated(
        current,
        layerId,
        t`${layer?.name ?? ""} copy`,
      );
    });
  };
}

/** Deletes a layer and selects its nearest surviving neighbor. */
function useGisAppLayerDeletion(app: GisAppState): GisAppLayerAction {
  return (layerId: MapLayer.Id): void => {
    const nearestSurvivingLayerId = _getNearestSurvivingLayerId(
      app.mapConfig.layers,
      layerId,
    );
    app.updateConfig((current) => {
      return AvaMapConfig.withLayerRemoved(current, layerId);
    });
    if (layerId === app.selectedLayerId) {
      app.setSelectedLayerId(nearestSurvivingLayerId);
      app.closeInspector();
    }
  };
}

/** Combines the focused layer-panel actions into the panel API. */
export function useGisAppLayerActions(app: GisAppState): GisAppLayerActions {
  const selectionActions = useGisAppLayerSelectionActions(app);
  const stackActions = useGisAppLayerStackActions(app);
  const onRenameLayer = useGisAppLayerRename(app);
  const onDuplicateLayer = useGisAppLayerDuplication(app);
  const onDeleteLayer = useGisAppLayerDeletion(app);
  const onZoomToLayer = (layerId: MapLayer.Id): void => {
    const bounds = app.layerBounds.get(layerId);
    if (bounds) {
      app.requestFitBounds(bounds);
    }
  };
  return {
    ...selectionActions,
    ...stackActions,
    onDeleteLayer,
    onDuplicateLayer,
    onRenameLayer,
    onZoomToLayer,
  };
}
