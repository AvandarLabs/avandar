import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../../primitives/StockRect";
import { HEADING_SIZE } from "./PacketStream.constants";
import type { Drawing } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the stream heading layer for PacketStream. */
export function StreamHeading(props: Readonly<Props>): ReactNode {
  return (
    <>
      <defs>
        <clipPath id={`${props.id}-stream`}>
          <StockRect x={230} y={155} width={554} height={305} />
        </clipPath>
      </defs>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].packetStream,
        })}
      </Eyebrow>
      <Text role="title" x={64} y={112} size={HEADING_SIZE}>
        {props.input.heading}
      </Text>
    </>
  );
}
