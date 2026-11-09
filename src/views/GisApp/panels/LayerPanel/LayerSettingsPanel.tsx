import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { AnnotationSettingsBody } from "@/views/GisApp/GisAppLayerInspector/AnnotationInspectorPanel";
import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody";
import { LayerActionsMenu } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu";
import { stepLayerPanelBack } from "@/views/GisApp/panels/LayerPanel/layerPanelNavigation";
import { LayerVisibilityButton } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerVisibilityButton";
import css from "@/views/GisApp/panels/LayerPanel/LayerSettingsPanel.module.css";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { GisAppLayerActions } from "@/views/GisApp/useGisAppLayerActions";
import type { ReactNode } from "react";

type Props = { app: GisAppState; actions: GisAppLayerActions };

function _leaveLayerSettings(app: GisAppState): void {
  const next = stepLayerPanelBack(app.inspectorView);
  if (next.page === "list") {
    app.closeLayerSettings();
    return;
  }
  app.onInspectorViewChange(next.inspectorView);
}

function _toggleAnnotationsVisible(app: GisAppState): void {
  app.updateConfig((current) => {
    return {
      ...current,
      annotations: {
        ...current.annotations,
        isVisible: !current.annotations.isVisible,
      },
    };
  });
}

function _backButton(app: GisAppState, backLabel: string): ReactNode {
  return (
    <ActionIcon
      className={css.backAction}
      variant="subtle"
      color="neutral"
      aria-label={backLabel}
      onClick={() => {
        _leaveLayerSettings(app);
      }}
    >
      <IconChevronLeft className={css.backIcon} size={16} stroke={1.8} />
    </ActionIcon>
  );
}

function _headerActions(
  app: GisAppState,
  actions: GisAppLayerActions,
  layer: MapLayer.T | undefined,
  annotationsLabel: string,
): ReactNode {
  if (app.isAnnotationRowSelected) {
    return (
      <LayerVisibilityButton
        className={css.headerAction}
        layerName={annotationsLabel}
        isVisible={app.mapConfig.annotations.isVisible}
        onClick={() => {
          _toggleAnnotationsVisible(app);
        }}
      />
    );
  }
  return layer ? _layerHeaderActions(layer, actions) : null;
}

function _settingsBody(
  app: GisAppState,
  actions: GisAppLayerActions,
  layer: MapLayer.T | undefined,
): ReactNode {
  if (app.isAnnotationRowSelected) {
    return <AnnotationSettingsBody app={app} />;
  }
  const viewState = app.selectedLayerId
    ? app.layerViewStates.get(app.selectedLayerId)
    : undefined;
  return (
    <LayerInspectorBody
      layer={layer}
      layers={app.mapConfig.layers}
      viewState={viewState}
      onLayerChange={actions.updateSelectedLayer}
      filterFocusRequest={app.filterFocusRequest || undefined}
      inspectorView={app.inspectorView}
      onOpenMatchReport={() => {
        app.onInspectorViewChange({ type: "matchReport" });
      }}
      onOpenClassification={() => {
        app.onInspectorViewChange({ type: "classification" });
      }}
      onCloseMatchReport={() => {
        app.onInspectorViewChange({ type: "sections" });
      }}
    />
  );
}

function _layerHeaderActions(
  layer: MapLayer.T,
  actions: GisAppLayerActions,
): ReactNode {
  const canListFeatures =
    getFeatureListAccessFromMapLayer(layer) !== "unavailable";
  return (
    <>
      <LayerVisibilityButton
        className={css.headerAction}
        layerName={layer.name}
        isVisible={layer.isVisible}
        onClick={() => {
          actions.onToggleLayerVisible(layer.id);
        }}
      />
      <LayerActionsMenu
        className={css.headerAction}
        layerName={layer.name}
        onRename={() => {
          actions.onRenameLayer(layer.id);
        }}
        onDuplicate={() => {
          actions.onDuplicateLayer(layer.id);
        }}
        onZoomToLayer={() => {
          actions.onZoomToLayer(layer.id);
        }}
        onDelete={() => {
          actions.onDeleteLayer(layer.id);
        }}
        onOpenFeatureList={
          canListFeatures
            ? () => {
                actions.onOpenFeatureList(layer.id);
              }
            : undefined
        }
      />
    </>
  );
}

/**
 * The layer panel's settings page: one layer's editor, with Back to the list.
 * Rendered by `GisAppLayerPanel` while a layer or the annotations row is open.
 */
export function LayerSettingsPanel({ app, actions }: Props): ReactNode {
  const { t } = useLingui();
  const layer = app.selectedLayer;
  const annotationsLabel = t`Annotations`;
  const title = app.isAnnotationRowSelected
    ? annotationsLabel
    : (layer?.name ?? t`Layer`);
  const backLabel =
    app.inspectorView.type === "sections"
      ? t`Back to layers`
      : t`Back to layer settings`;

  return (
    <MapChromePanel
      variant="workspace"
      id="gis-layers-panel"
      bodyId={GIS_SKIP_TARGET_IDS.inspectorBody}
      title={title}
      leading={_backButton(app, backLabel)}
      headerActions={_headerActions(app, actions, layer, annotationsLabel)}
      isCollapsed={app.panelState.layers}
      onToggleCollapsed={() => {
        app.togglePanel("layers");
      }}
      collapseLabel={t`Collapse the layers panel`}
      expandLabel={t`Expand the layers panel`}
    >
      {_settingsBody(app, actions, layer)}
    </MapChromePanel>
  );
}
