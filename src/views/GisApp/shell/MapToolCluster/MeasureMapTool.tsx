import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconRuler2 } from "@tabler/icons-react";

import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

/** Measure tool: geodesic length and area, available without Spatial. */
export function MeasureMapTool({
  mapToolMode,
  onMapToolModeChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const label = t`Measure distance and area`;
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-pressed={mapToolMode.type === "measure"}
        aria-label={label}
        onClick={() => {
          onMapToolModeChange({ type: "measure" });
        }}
      >
        <IconRuler2 size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
