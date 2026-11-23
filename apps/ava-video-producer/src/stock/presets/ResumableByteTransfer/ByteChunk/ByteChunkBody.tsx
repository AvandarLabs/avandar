import { StockRect } from "../../../primitives/StockRect";
import type { useByteChunkPresentation } from "./useByteChunkPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useByteChunkPresentation>,
  "chunk" | "x" | "y" | "width" | "scales" | "tokens" | "accent" | "atomic"
>;
/** Render the byte chunk body. */
export function ByteChunkBody(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-received-chunk={
        props.chunk.isConfirmed ? props.chunk.start : undefined
      }
      data-moving-chunk={
        !props.chunk.isConfirmed ? props.chunk.start : undefined
      }
      x={props.x}
      y={props.y}
      width={props.width}
      height={54}
      rx={props.scales.corner(3)}
      fill={
        props.chunk.isInterrupted ? props.tokens.color.highlight : props.accent
      }
      fillOpacity={props.scales.wash(props.atomic.opacity["15"])}
      stroke={
        props.chunk.isInterrupted ? props.tokens.color.highlight : props.accent
      }
    />
  );
}
