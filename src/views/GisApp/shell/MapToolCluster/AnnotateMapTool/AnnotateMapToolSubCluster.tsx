import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import {
  IconArrowRight,
  IconLetterT,
  IconPolygon,
  IconScribble,
} from "@tabler/icons-react";

import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues";
import subClusterCss from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateMapToolSubCluster.module.css";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";

type AnnotateKind = Extract<MapToolMode, { type: "annotate" }>["kind"];

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

type SubTool = {
  kind: AnnotateKind;
  label: string;
  icon: ReactNode;
};

function _isKindPressed(mapToolMode: MapToolMode, kind: AnnotateKind): boolean {
  return mapToolMode.type === "annotate" && mapToolMode.kind === kind;
}

function _subToolFromKind(kind: AnnotateKind, i18n: I18n): SubTool {
  return matchLiteral(kind, {
    text: {
      kind: "text" as const,
      label: i18n._(msg`Place text`),
      icon: <IconLetterT size={17} stroke={1.6} />,
    },
    arrow: {
      kind: "arrow" as const,
      label: i18n._(msg`Draw an arrow`),
      icon: <IconArrowRight size={17} stroke={1.6} />,
    },
    freehand: {
      kind: "freehand" as const,
      label: i18n._(msg`Draw freehand`),
      icon: <IconScribble size={17} stroke={1.6} />,
    },
    area: {
      kind: "area" as const,
      label: i18n._(msg`Draw an annotation area`),
      icon: <IconPolygon size={17} stroke={1.6} />,
    },
  });
}

function _annotateSubTools(i18n: I18n): readonly SubTool[] {
  return AvaMapConfigValues.annotationKinds.map((kind) => {
    return _subToolFromKind(kind, i18n);
  });
}

/** Four annotation drawing tools: text, arrow, freehand, and area. */
export function AnnotateMapToolSubCluster({
  mapToolMode,
  onMapToolModeChange,
}: Readonly<Props>): ReactNode {
  const { i18n, t } = useLingui();
  return (
    <div
      id="gis-annotate-subcluster"
      className={subClusterCss.annotateMapToolSubCluster}
      role="group"
      aria-label={t`Annotate the map`}
    >
      {_annotateSubTools(i18n).map((tool) => {
        return (
          <Tooltip key={tool.kind} label={tool.label}>
            <button
              type="button"
              className={css.mapToolClusterTool}
              aria-label={tool.label}
              aria-pressed={_isKindPressed(mapToolMode, tool.kind)}
              onClick={() => {
                onMapToolModeChange({ type: "annotate", kind: tool.kind });
              }}
            >
              {tool.icon}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
