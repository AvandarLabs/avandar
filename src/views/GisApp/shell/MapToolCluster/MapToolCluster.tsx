import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  IconCircleDashed,
  IconPencil,
  IconPointer,
  IconRuler2,
  IconSearch,
  IconVector,
} from "@tabler/icons-react";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import { PanMapTool } from "@/views/GisApp/shell/MapToolCluster/PanMapTool";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type MapToolDefinition = {
  key: string;
  icon: ReactNode;
  label: string;
  reason: string;
};

/** Returns the map tools that are currently unavailable. */
function _getMapToolDefinitions(i18n: I18n): MapToolDefinition[] {
  const unavailableReason = i18n._(msg`This tool is not available.`);
  return [
    {
      key: "area",
      icon: <IconVector size={17} stroke={1.6} />,
      label: i18n._(msg`Draw an area to filter by`),
      reason: unavailableReason,
    },
    {
      key: "measure",
      icon: <IconRuler2 size={17} stroke={1.6} />,
      label: i18n._(msg`Measure distance and area`),
      reason: unavailableReason,
    },
    {
      key: "buffer",
      icon: <IconCircleDashed size={17} stroke={1.6} />,
      label: i18n._(msg`Buffer around a layer`),
      reason: unavailableReason,
    },
    {
      key: "annotate",
      icon: <IconPencil size={17} stroke={1.6} />,
      label: i18n._(msg`Annotate the map`),
      reason: unavailableReason,
    },
  ];
}

/** Renders the stable toolbar layout and its available tool states. */
export function MapToolCluster(): ReactNode {
  const { i18n } = useLingui();
  const tools = _getMapToolDefinitions(i18n);
  const unavailableReason = i18n._(msg`This tool is not available.`);
  return (
    <div
      className={css.mapToolCluster}
      id={GIS_SKIP_TARGET_IDS.toolCluster}
      role="toolbar"
      aria-label={i18n._(msg`Map tools`)}
      tabIndex={-1}
    >
      <PanMapTool
        label={i18n._(msg`Pan and select`)}
        icon={<IconPointer size={17} stroke={1.6} />}
      />
      <span className={css.mapToolClusterSeparator} aria-hidden />
      {tools.map((tool) => {
        return (
          <UnavailableMapTool
            key={tool.key}
            icon={tool.icon}
            label={tool.label}
            reason={tool.reason}
          />
        );
      })}
      <span className={css.mapToolClusterSeparator} aria-hidden />
      <UnavailableMapTool
        icon={<IconSearch size={17} stroke={1.6} />}
        label={i18n._(msg`Go to a coordinate or P-code`)}
        reason={unavailableReason}
      />
    </div>
  );
}
