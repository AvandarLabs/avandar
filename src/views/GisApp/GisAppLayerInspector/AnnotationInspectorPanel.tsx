import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/GisAppLayerInspector/GisAppLayerInspector.module.css";
import { AnnotationFeatureInspector } from "@/views/GisApp/panels/LayerInspector/AnnotationFeatureInspector/AnnotationFeatureInspector";
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

/**
 * The annotations editor inside the layer panel.
 * `LayerSettingsPanel` shows it when the annotations row is open.
 */
export function AnnotationSettingsBody({ app }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const feature = app.selectedAnnotationFeature;
  const showFeatureEditor =
    feature !== undefined && app.mapConfig.annotations.isVisible;
  if (!showFeatureEditor) {
    return (
      <div className={css.gisAppLayerInspectorEmptyState}>
        {t`Select an annotation on the map to edit it.`}
      </div>
    );
  }
  return (
    <AnnotationFeatureInspector
      feature={feature}
      onFeatureChange={(nextFeature) => {
        _replaceAnnotationFeature(app, nextFeature);
      }}
      onDelete={() => {
        _deleteAnnotationFeature(app);
      }}
    />
  );
}
