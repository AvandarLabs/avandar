import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ComparisonVerdict } from "./ComparisonVerdict";
import { StationSheets } from "./StationSheets";
import type { Input } from "./ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["tests"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};

/** Frames between neighbouring stations appearing. */
const STATION_STAGGER_FRAMES = 8;
/** Frames a station takes to fade in. */
const STATION_FRAMES = 14;
/**
 * One station retains both values, with explicit mismatch or missing evidence.
 */
export function ExpectationStation({
  item,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const state =
    item.observed === null
      ? "unobserved"
      : item.expected === item.observed
        ? "match"
        : "mismatch";
  const judged = frame >= 109;
  const y = 130 + index * 145;
  const comparison = { item, y, frame, input, state, accent };
  return (
    <g
      data-case={item.id}
      data-state={state}
      opacity={ramp(
        frame,
        12 + index * motion.scale(STATION_STAGGER_FRAMES),
        motion.scale(STATION_FRAMES),
        motion.reveal.easing,
      )}
    >
      <LabelSlots
        labels={[
          [item.label, 45, y, 220, 12, 3],
          [input.labels.expected, 300, y - 15, 190, 12, 3],
          [input.labels.observed, 300, y + 69, 190, 12, 3],
        ]}
      />
      {input.showInputs ? (
        <g data-input={item.id}>
          <LabelSlots labels={[[item.inputLabel, 45, y + 48, 220, 12, 3]]} />
        </g>
      ) : undefined}
      <StationSheets {...comparison} />
      {judged ? <ComparisonVerdict {...comparison} /> : undefined}
    </g>
  );
}
