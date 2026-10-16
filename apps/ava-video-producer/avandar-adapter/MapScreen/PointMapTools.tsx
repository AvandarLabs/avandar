import {
  IconCircleDashed,
  IconPointer,
  IconVector,
} from "@tabler/icons-react";
import { AnnotateMapTool } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateMapTool";
import { EraseMapTool } from "@/views/GisApp/shell/MapToolCluster/EraseMapTool";
import { GoToMapTool } from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool";
import toolCss from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import { MeasureMapTool } from "@/views/GisApp/shell/MapToolCluster/MeasureMapTool";
import { PanMapTool } from "@/views/GisApp/shell/MapToolCluster/PanMapTool";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import { PAN } from "./mapFixtures";

const _noop = () => undefined;

/** The renderer supplies point data without loading DuckDB Spatial. Reuse the product's unavailable tool slots, including its precise reason. */
export function PointMapTools() {
  return (
    <div
      className={toolCss.mapToolCluster}
      role="toolbar"
      aria-label="Map tools"
    >
      <PanMapTool
        label="Pan and select"
        icon={<IconPointer size={17} stroke={1.6} />}
        isPressed
        onClick={_noop}
      />
      <span className={toolCss.mapToolClusterSeparator} />
      <UnavailableMapTool
        icon={<IconVector size={17} stroke={1.6} />}
        label="Draw an area to filter by"
        reason="This tool needs geometry support, which could not be loaded."
      />
      <MeasureMapTool mapToolMode={PAN} onMapToolModeChange={_noop} />
      <UnavailableMapTool
        icon={<IconCircleDashed size={17} stroke={1.6} />}
        label="Buffer around a layer"
        reason="Buffer needs a layer with compiled geometry, not latitude and longitude columns."
      />
      <AnnotateMapTool mapToolMode={PAN} onMapToolModeChange={_noop} />
      <EraseMapTool mapToolMode={PAN} onMapToolModeChange={_noop} />
      <span className={toolCss.mapToolClusterSeparator} />
      <GoToMapTool requestFitBounds={_noop} />
    </div>
  );
}
