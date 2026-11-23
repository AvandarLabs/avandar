import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PendingRequestItems } from "./PendingRequestItems";
import type { Input } from "../WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

/** Every request stays pending until the whole authored expansion completes. */
export function PendingResources({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const seating =
    input.choice.decision === "expand"
      ? motion.ramp(frame, 106, motion.scale(19), motion.travel.easing)
      : 0;
  const arrival = motion.ramp(
    frame,
    12,
    motion.scale(38),
    motion.travel.easing,
  );
  const requestX = 90 + input.existingResources.length * 86;
  const requestY = Motion.mix({
    t: seating,
    from: Motion.mix({
      t: arrival,
      from: 433,
      to: 419,
    }),
    to: 240,
  });
  return (
    <PendingRequestItems
      input={input}
      accent={accent}
      seating={seating}
      arrival={arrival}
      requestX={requestX}
      requestY={requestY}
    />
  );
}
