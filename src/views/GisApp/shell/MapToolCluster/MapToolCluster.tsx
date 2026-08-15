import { Tooltip } from "@avandar/ui";
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
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
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

/** Renders an unavailable map tool with its reason in the accessible name. */
function _renderUnavailableMapTool(tool: MapToolDefinition): ReactNode {
  const accessibleLabel = `${tool.label}. ${tool.reason}`;
  return (
    <Tooltip key={tool.key} label={accessibleLabel}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-disabled
        aria-label={accessibleLabel}
        onClick={(event) => {
          event.preventDefault();
        }}
      >
        {tool.icon}
      </button>
    </Tooltip>
  );
}

/** Renders the stable toolbar layout and its available tool states. */
export function MapToolCluster(): ReactNode {
  const { i18n } = useLingui();
  const tools = _getMapToolDefinitions(i18n);
  const panLabel = i18n._(msg`Pan and select`);
  const coordinateSearchLabel = i18n._(msg`Go to a coordinate or P-code`);
  const unavailableReason = i18n._(msg`This tool is not available.`);

  return (
    <div
      className={css.mapToolCluster}
      id={GIS_SKIP_TARGET_IDS.toolCluster}
      role="toolbar"
      aria-label={i18n._(msg`Map tools`)}
      tabIndex={-1}
    >
      <Tooltip label={panLabel}>
        <button
          type="button"
          className={css.mapToolClusterTool}
          aria-pressed
          aria-label={panLabel}
        >
          <IconPointer size={17} stroke={1.6} />
        </button>
      </Tooltip>
      <span className={css.mapToolClusterSeparator} aria-hidden />
      {tools.map(_renderUnavailableMapTool)}
      <span className={css.mapToolClusterSeparator} aria-hidden />
      <Tooltip label={`${coordinateSearchLabel}. ${unavailableReason}`}>
        <button
          type="button"
          className={css.mapToolClusterTool}
          aria-disabled
          aria-label={`${coordinateSearchLabel}. ${unavailableReason}`}
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          <IconSearch size={17} stroke={1.6} />
        </button>
      </Tooltip>
    </div>
  );
}
