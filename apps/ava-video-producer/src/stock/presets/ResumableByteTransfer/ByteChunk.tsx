import { mix } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ByteIntervalRails } from "./ByteIntervalRails";
import type { TransferChunk } from "./getByteTransferFromFrame";
import type { Input } from "./ResumableByteTransfer.schema";
import type { ReactNode } from "react";

type Props = {
  chunk: TransferChunk;
  input: Input;
  frame: number;
  accent: string;
};
/** An intact exact-width chunk travels between retained byte interval rails. */
export function ByteChunk({
  chunk,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const x = 84 + (chunk.start / input.file.sizeBytes) * 792;
  const width = ((chunk.end - chunk.start) / input.file.sizeBytes) * 792;
  const interruptedY =
    frame <= 73
      ? mix(
          motion.ramp(frame, 56, motion.scale(17), motion.travel.easing),
          180,
          275,
        )
      : mix(
          motion.ramp(frame, 73, motion.scale(17), motion.travel.easing),
          275,
          180,
        );
  const y = chunk.isInterrupted ? interruptedY : mix(chunk.progress, 180, 380);
  return (
    <g
      data-chunk-start={chunk.start}
      data-chunk-end={chunk.end}
      data-chunk-bytes={chunk.end - chunk.start}
    >
      <ByteIntervalRails x={x} width={width} />
      <StockRect
        data-received-chunk={chunk.isConfirmed ? chunk.start : undefined}
        data-moving-chunk={!chunk.isConfirmed ? chunk.start : undefined}
        x={x}
        y={y}
        width={width}
        height={54}
        rx={scales.corner(3)}
        fill={chunk.isInterrupted ? tokens.color.highlight : accent}
        fillOpacity={0.15}
        stroke={chunk.isInterrupted ? tokens.color.highlight : accent}
      />
      {input.showOffsets ? (
        <g data-offset-label={chunk.start}>
          <LiteralDataText value={String(chunk.start)} x={x + 4} y={169} />
        </g>
      ) : undefined}
      {chunk.isInterrupted ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x + width / 2 - 6} ${y + 21} l12 12 m0 -12 l-12 12`,
          }}
          profile={tokens.sketch.shape}
          data-interrupted-byte={chunk.start}
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : undefined}
    </g>
  );
}
