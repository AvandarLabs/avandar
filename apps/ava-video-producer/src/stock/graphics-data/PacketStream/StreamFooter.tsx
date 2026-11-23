import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { Drawing } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the stream footer layer for PacketStream. */
export function StreamFooter(props: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "line", x1: 64, y1: 495, x2: 896, y2: 495 }}
        profile={props.sketch.shape}
        stroke={props.color.line}
        strokeWidth={props.hairline}
      />
      <Text role="meta" x={64} y={538}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].produce,
        })}
      </Text>
      <Text role="meta" x={480} y={538} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].transport,
        })}
      </Text>
      <Text role="meta" x={896} y={538} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].receive,
        })}
      </Text>
    </>
  );
}
