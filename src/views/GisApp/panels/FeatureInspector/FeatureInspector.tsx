import { Stack } from "@mantine/core";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { FeatureAction } from "@/views/GisApp/panels/FeatureInspector/FeatureAction";
import { FeatureFields } from "@/views/GisApp/panels/FeatureInspector/FeatureFields";
import css from "@/views/GisApp/panels/FeatureInspector/FeatureInspector.module.css";
import { FeatureInspectorHeader } from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode, RefObject } from "react";

const FEATURE_DRAWER_REGION_ID = "gis-feature-drawer-region";
const FEATURE_DRAWER_TITLE_ID = "gis-feature-drawer-title";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | undefined;
  canvasRef: RefObject<HTMLElement | null>;

  /** The popup config of the layer the feature came from. */
  popup: MapLayer.Popup | undefined;
};

/** Lists the clicked feature's fields, and its record link when it has one. */
export function FeatureInspector({
  opened,
  onClose,
  feature,
  popup,
  canvasRef,
}: Props): ReactNode {
  const properties: Record<string, unknown> = feature?.properties ?? {};

  return (
    <CanvasDrawer opened={opened} canvasRef={canvasRef}>
      <CanvasDrawer.ResizeHandle />
      <CanvasDrawer.Body regionId={FEATURE_DRAWER_REGION_ID}>
        <div role="region" aria-labelledby={FEATURE_DRAWER_TITLE_ID}>
          <FeatureInspectorHeader
            onClose={onClose}
            titleId={FEATURE_DRAWER_TITLE_ID}
          />
          <Stack className={css.featureInspectorBody} gap="sm">
            <FeatureFields properties={properties} />
            <FeatureAction action={popup?.action} properties={properties} />
          </Stack>
        </div>
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}
