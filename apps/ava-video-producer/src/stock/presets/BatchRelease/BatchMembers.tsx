import { FitText } from "../../primitives/FitText/FitText";
import { BatchMember } from "./BatchMember";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";
/** Data for Props. */
type PropsLayout = { x: number; y: number; start: number; completeAt: number };

type Props = {
  batch: Input["batches"][number];
  input: Input;
  frame: number;
  accent: string;
  layout: PropsLayout;
};
/** An envelope retains its exact supplied label and member order. */
export function BatchMembers({
  batch,
  input,
  frame,
  accent,
  layout,
}: Readonly<Props>): ReactNode {
  const { x, y, start, completeAt } = layout;
  return (
    <g>
      <FitText
        text={batch.label}
        x={x + 15}
        y={y + 22}
        width={330}
        fontSize={14}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
        color={accent}
      />
      {batch.items.map((item, itemIndex) => (
        <BatchMember
          key={item.id}
          item={item}
          batchId={batch.id}
          index={itemIndex}
          numItems={batch.items.length}
          frame={frame}
          start={start}
          completeAt={completeAt}
          envelopeX={x}
          y={y}
          showLabel={input.showItemLabels}
          accent={accent}
        />
      ))}
    </g>
  );
}
