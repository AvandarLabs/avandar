import { mix } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DetailEventLedger } from "./DetailEventLedger";
import { makeDetailSimplificationFromInput } from "./makeDetailSimplificationFromInput";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };

const COUNT_AT = 111;
const COUNT_FRAMES = 28;
const TOLERANCE_SIZE = "md";
/** Retained and removed counts accompany their actual algorithm outputs. */
export function DetailLedger({ input, frame }: Readonly<Props>): ReactNode {
  const { text } = useGraphicTokens();
  const motion = useGraphicMotion();
  const counted = motion.ramp(frame, COUNT_AT, motion.scale(COUNT_FRAMES));
  const { keptIndices, removed } = makeDetailSimplificationFromInput(input);
  const keptCount = Math.round(mix(counted, 0, keptIndices.length));
  const removedCount = Math.round(mix(counted, 0, removed.length));
  const figure = text.graphic.question;
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
        data-kept-count={keptCount}
        x={880}
        y={210}
        fontSize={figure.fontSize}
        fontWeight={figure.fontWeight}
        fill={figure.color}
        textAnchor="end"
      >
        {keptCount}
      </text>
      <text
        data-removed-count={removedCount}
        x={880}
        y={274}
        fontSize={figure.fontSize}
        fontWeight={figure.fontWeight}
        fill={figure.color}
        textAnchor="end"
      >
        {removedCount}
      </text>
      <Text x={480} y={382} size={TOLERANCE_SIZE}>
        ≤ {input.tolerance}
      </Text>
      <DetailEventLedger input={input} />
    </g>
  );
}
