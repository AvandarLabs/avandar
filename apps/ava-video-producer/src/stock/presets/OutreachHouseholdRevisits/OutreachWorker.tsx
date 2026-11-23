import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/**
 * A single worker follows the authored order, including stationary revisits.
 */
export function OutreachWorker({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y } = _getWorkerPositionFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g data-worker="worker" data-x={x} data-y={y}>
      <PersonGlyph
        x={x - 29}
        y={y - 3}
        size={26}
        role="worker"
        posture="walking"
        color={accent}
      />
    </g>
  );
}

/** The worker interpolates between the current and preceding visit. */
function _getWorkerPositionFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<
  Pick<Props, "input" | "frame"> & {
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): { x: number; y: number } {
  const duration = 72 / input.visits.length;
  const eventIndex = Math.min(
    input.visits.length - 1,
    Math.max(0, Math.floor((frame - 36) / duration)),
  );
  const household = input.households.find(
    propEq("id", input.visits[eventIndex].householdId),
  );
  const previous =
    eventIndex > 0
      ? input.households.find(
          propEq("id", input.visits[eventIndex - 1].householdId),
        )
      : undefined;
  if (!household || (eventIndex > 0 && !previous)) {
    throw new Error("Visit references must resolve to supplied households.");
  }
  const progress = motion.ramp(
    frame,
    36 + eventIndex * duration,
    duration,
    motion.travel.easing,
  );
  const x = Motion.mix({
    t: progress,
    from: previous ? 80 + previous.x * 480 : 70,
    to: 80 + household.x * 480,
  });
  const y = Motion.mix({
    t: progress,
    from: previous ? 120 + previous.y * 270 : 380,
    to: 120 + household.y * 270,
  });
  return { x, y };
}
