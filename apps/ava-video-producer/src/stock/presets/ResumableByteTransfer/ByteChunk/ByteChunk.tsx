import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { ByteIntervalRails } from "../ByteIntervalRails";
import { ByteChunkBody } from "./ByteChunkBody";
import { useByteChunkPresentation } from "./useByteChunkPresentation";
import type { TransferChunk } from "../getByteTransferFromFrame";
import type { Input } from "../ResumableByteTransfer.schema.ts";
import type { ReactNode } from "react";

type Props = {
  chunk: TransferChunk;
  input: Input;
  frame: number;
  accent: string;
};
/** An intact exact-width chunk travels between retained byte interval rails. */
export function ByteChunk(props: Readonly<Props>): ReactNode {
  const presentation = useByteChunkPresentation(props);

  return (
    <g
      data-chunk-start={props.chunk.start}
      data-chunk-end={props.chunk.end}
      data-chunk-bytes={props.chunk.end - props.chunk.start}
    >
      <ByteIntervalRails x={presentation.x} width={presentation.width} />
      <ByteChunkBody {...presentation} />
      {props.input.showOffsets ? (
        <g data-offset-label={props.chunk.start}>
          <LiteralDataText
            value={String(props.chunk.start)}
            x={presentation.x + 4}
            y={169}
          />
        </g>
      ) : undefined}
      {props.chunk.isInterrupted ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${presentation.x + presentation.width / 2 - 6} ${presentation.y + 21} l12 12 m0 -12 l-12 12`,
          }}
          profile={presentation.tokens.sketch.shape}
          data-interrupted-byte={props.chunk.start}
          stroke={presentation.tokens.color.highlight}
          strokeWidth={presentation.scales.stroke(
            presentation.tokens.stroke.default,
          )}
        />
      ) : undefined}
    </g>
  );
}
