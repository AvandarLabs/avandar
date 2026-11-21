import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import type { Drawing } from "./LineTrace.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the chart definitions layer for LineTrace. */
export function ChartDefinitions(props: Readonly<Props>): ReactNode {
  return (
    <>
      <defs>
        <linearGradient
          id={`${props.id}-chart-fill`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            offset="0"
            stopColor={props.accent}
            stopOpacity={props.shapes.wash(props.atomic.opacity["15"])}
          />
          <stop offset="1" stopColor={props.accent} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${props.id}-chart-clip`}>
          <rect
            x={119}
            y={143}
            width={Math.max(0, props.geometry.head.x - 119)}
            height={320}
          />
        </clipPath>
      </defs>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["line-trace"].lineTrace,
        })}
      </Eyebrow>
    </>
  );
}
