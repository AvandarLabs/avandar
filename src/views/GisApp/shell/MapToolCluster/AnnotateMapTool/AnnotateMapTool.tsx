import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { AnnotateMapToolSubCluster } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateMapToolSubCluster";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

/** Annotate control: expands text, arrow, freehand, and area drawing tools. */
export function AnnotateMapTool({
  mapToolMode,
  onMapToolModeChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [isExpanded, setIsExpanded] = useState(false);
  const label = t`Annotate the map`;
  return (
    <>
      <Tooltip label={label}>
        <button
          type="button"
          className={css.mapToolClusterTool}
          aria-label={label}
          aria-pressed={mapToolMode.type === "annotate"}
          aria-expanded={isExpanded}
          aria-controls="gis-annotate-subcluster"
          onClick={() => {
            setIsExpanded((current) => {
              return !current;
            });
          }}
        >
          <IconPencil size={17} stroke={1.6} />
        </button>
      </Tooltip>
      {isExpanded ?
        <AnnotateMapToolSubCluster
          mapToolMode={mapToolMode}
          onMapToolModeChange={onMapToolModeChange}
        />
      : null}
    </>
  );
}
