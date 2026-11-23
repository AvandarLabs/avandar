import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import { DIAL_FILL_ALPHA } from "./StatusCycle.constants";
import type { Drawing } from "./StatusCycle.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the status dial layer for StatusCycle. */
export function StatusDial(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="footnote" x={212} y={201}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["status-cycle"].runStatus,
        })}
      </Text>
      <SketchedShape
        shape={{ kind: "circle", cx: 267, cy: 281, r: 42 }}
        profile={props.sketch.shape}
        fill={props.accent}
        fillOpacity={props.shapes.wash(DIAL_FILL_ALPHA)}
        stroke={props.color.line}
        strokeWidth={props.shapes.stroke(props.stroke.outline)}
      />
    </>
  );
}
