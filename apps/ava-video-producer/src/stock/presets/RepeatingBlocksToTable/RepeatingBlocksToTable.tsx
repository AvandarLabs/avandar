import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BlockCellStrip } from "./BlockCellStrip";
import { BlockIdentity } from "./BlockIdentity";
import { TableFieldHeadings } from "./TableFieldHeadings";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";
/** Complete validated repeated blocks and shared frame palette. */
export type Props = GraphicProps & { input: Input };
/** Reorients repeated run-in labels into identity-aligned table columns. */
export function RepeatingBlocksToTable({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [input.copy.source, 52, 96, 856, 14, 2],
        ]}
      />
      <TableFieldHeadings input={input} frame={frame} />
      {input.blocks.map((block, index) => (
        <BlockIdentity
          key={block.id}
          input={input}
          frame={frame}
          accent={accent}
          index={index}
        />
      ))}
      {input.blocks.flatMap((block, blockIndex) =>
        input.fields.map((field, fieldIndex) => (
          <BlockCellStrip
            key={`${blockIndex}:${fieldIndex}`}
            input={input}
            frame={frame}
            accent={accent}
            blockIndex={blockIndex}
            fieldIndex={fieldIndex}
          />
        )),
      )}
    </g>
  );
}
