import { countTo } from "../../../motion";
import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { DetailEventLedger } from "./DetailEventLedger";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Retained and removed counts accompany their actual algorithm outputs. */
export function DetailLedger({ input, frame }: Readonly<Props>): ReactNode {
  const { keptIndices, removed } = makeDetailSimplificationFromInput(input);
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.kept, 480, 206, 340, 16, 3],
          [input.labels.removed, 480, 270, 340, 16, 3],
          [input.labels.unit, 480, 334, 420, 14, 2],
        ]}
      />
      <text
        data-kept-count={countTo(frame, 111, keptIndices.length, 28)}
        x={880}
        y={210}
        fontSize={24}
        fill={STOCK.text}
        textAnchor="end"
      >
        {countTo(frame, 111, keptIndices.length, 28)}
      </text>
      <text
        data-removed-count={countTo(frame, 111, removed.length, 28)}
        x={880}
        y={274}
        fontSize={24}
        fill={STOCK.text}
        textAnchor="end"
      >
        {countTo(frame, 111, removed.length, 28)}
      </text>
      <Text x={480} y={382} size={16}>
        ≤ {input.tolerance}
      </Text>
      <DetailEventLedger input={input} />
    </g>
  );
}
