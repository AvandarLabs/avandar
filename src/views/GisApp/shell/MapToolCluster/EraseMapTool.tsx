import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconEraser } from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

/** Eraser tool: removes pencil strokes in pieces and other annotations whole. */
export function EraseMapTool({
  mapToolMode,
  onMapToolModeChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const label = t`Erase annotations`;
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-pressed={mapToolMode.type === "erase"}
        aria-label={label}
        onClick={() => {
          onMapToolModeChange({ type: "erase" });
        }}
      >
        <IconEraser size={17} stroke={1.6} />
      </button>
    </Tooltip>
  );
}
