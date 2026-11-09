import { useLingui } from "@lingui/react/macro";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { FeatureInspectorHeader } from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader";
import { FeatureListBody } from "@/views/GisApp/panels/FeatureListDrawer/FeatureListBody";
import css from "@/views/GisApp/panels/FeatureListDrawer/FeatureListDrawer.module.css";
import { useFeatureListQuery } from "@/views/GisApp/panels/FeatureListDrawer/useFeatureListQuery";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ReactNode, RefObject } from "react";

const FEATURE_LIST_REGION_ID = "gis-feature-list-region";
const FEATURE_LIST_TITLE_ID = "gis-feature-list-title";

type Props = {
  /**
   * The layer whose list is open. `undefined` when no list is open or the
   * layer no longer exists, and the drawer then renders nothing.
   */
  layer: MapLayer.T | undefined;
  config: AvaMapConfig.T;
  workspaceId: Workspace.Id;
  canvasRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onRowClick: (row: MapLayerFeatureList["rows"][number]) => void;
};

/**
 * The bottom drawer listing one layer's features after every map filter,
 * with a count, sortable columns, and a CSV download. A layer with
 * approximate locations shows only its count, and none below five. Opened
 * from a layer's menu and from the buffer tool.
 */
export function FeatureListDrawer({
  layer,
  config,
  workspaceId,
  canvasRef,
  onClose,
  onRowClick,
}: Props): ReactNode {
  const { t } = useLingui();
  const state = useFeatureListQuery({ config, layer, workspaceId });
  if (!layer) {
    return null;
  }
  const layerName = layer.name;
  return (
    <CanvasDrawer opened canvasRef={canvasRef}>
      <CanvasDrawer.ResizeHandle />
      <CanvasDrawer.Body regionId={FEATURE_LIST_REGION_ID}>
        <div
          role="region"
          aria-labelledby={FEATURE_LIST_TITLE_ID}
          className={css.featureListRegion}
        >
          <FeatureInspectorHeader
            onClose={onClose}
            titleId={FEATURE_LIST_TITLE_ID}
            title={t`Feature list: ${layerName}`}
          />
          <FeatureListBody state={state} onRowClick={onRowClick} />
        </div>
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}
