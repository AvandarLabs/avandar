import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/GisAppLayerInspector/GisAppLayerInspector.module.css";
import { AnnotationFeatureInspector } from "@/views/GisApp/panels/LayerInspector/AnnotationFeatureInspector/AnnotationFeatureInspector";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

type Props = {
  app: GisAppState;
};

function _replaceAnnotationFeature(
  app: GisAppState,
  nextFeature: AvaMapConfig.AnnotationFeature,
): void {
  app.updateConfig((current) => {
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
}

function _deleteAnnotationFeature(app: GisAppState): void {
  const featureId = app.selectedAnnotationFeatureId;
  if (!featureId) {
    return;
  }
  app.updateConfig((current) => {
    return AvaMapConfig.withoutAnnotationFeature({
      config: current,
      featureId,
    });
  });
  app.setSelectedAnnotationFeatureId(undefined);
  if (app.mapConfig.annotations.features.length === 1) {
    app.setIsAnnotationRowSelected(false);
  }
}

/** Inspector chrome for the annotation overlay and a selected feature. */
export function AnnotationInspectorPanel({ app }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const feature = app.selectedAnnotationFeature;
  const showFeatureEditor =
    feature !== undefined && app.mapConfig.annotations.isVisible;
  return (
    <MapChromePanel
      variant="inspector"
      id="gis-inspector"
      bodyId={GIS_SKIP_TARGET_IDS.inspectorBody}
      title={t`Annotations`}
      isCollapsed={app.panelState.inspector}
      onToggleCollapsed={() => {
        app.togglePanel("inspector");
      }}
      collapseLabel={t`Collapse the inspector`}
      expandLabel={t`Expand the inspector`}
    >
      {showFeatureEditor ? (
        <AnnotationFeatureInspector
          feature={feature}
          onFeatureChange={(nextFeature) => {
            _replaceAnnotationFeature(app, nextFeature);
          }}
          onDelete={() => {
            _deleteAnnotationFeature(app);
          }}
        />
      ) : (
        <div className={css.gisAppLayerInspectorEmptyState}>
          {t`Select an annotation on the map to edit it.`}
        </div>
      )}
    </MapChromePanel>
  );
}
