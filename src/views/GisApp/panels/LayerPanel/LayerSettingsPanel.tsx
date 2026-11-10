import { TruncatedText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconChevronLeft } from "@tabler/icons-react";
import { AnnotationSettingsBody } from "@/views/GisApp/GisAppLayerInspector/AnnotationInspectorPanel";
import { LayerInspectorBody } from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody";
import { stepLayerPanelBack } from "@/views/GisApp/panels/LayerPanel/layerPanelNavigation";
import css from "@/views/GisApp/panels/LayerPanel/LayerSettingsPanel.module.css";
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

/**
 * The open layer's controls, shown under the layer list. The layer's name
 * stays pinned while the controls scroll. Back leaves a focused screen, or
 * closes the controls and returns to the list.
 */
export function LayerSettingsPanel({ app, actions }: Props): ReactNode {
  const { t } = useLingui();
  const layer = app.selectedLayer;
  const title = app.isAnnotationRowSelected
    ? t`Annotations`
    : (layer?.name ?? t`Layer`);
  const backLabel =
    app.inspectorView.type === "sections"
      ? t`Back to layers`
      : t`Back to layer settings`;

  return (
    <div className={css.editorScroll}>
      <div className={css.editorHeader}>
        {_backButton(app, backLabel)}
        <TruncatedText
          className={css.editorTitle}
          component="h3"
          tooltipProps={{ position: "bottom" }}
        >
          {title}
        </TruncatedText>
      </div>
      {_settingsBody(app, actions, layer)}
    </div>
  );
}
