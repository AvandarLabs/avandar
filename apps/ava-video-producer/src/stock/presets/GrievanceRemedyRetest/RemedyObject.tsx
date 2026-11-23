import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LampObject } from "./LampObject";
import { LockerObject } from "./LockerObject";
import { RemedyReplacementPart } from "./RemedyReplacementPart/RemedyReplacementPart";
import { RemedyRetestContact } from "./RemedyRetestContact/RemedyRetestContact";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};
/** A latch closes or a lamp lights only for the supplied functioning retest. */
export function RemedyObject({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const functioning =
    input.testResults.after === "functioning"
      ? motion.ramp(frame, 98, motion.scale(10))
      : 0;
  const attempt =
    8 * Math.sin(Math.PI * motion.ramp(frame, 20, motion.scale(10))) +
    (input.testResults.after !== "not-tested"
      ? 8 * Math.sin(Math.PI * motion.ramp(frame, 98, motion.scale(10)))
      : 0);
  const replacement = motion.ramp(frame, 56, motion.scale(22));
  const isLamp = input.object.kind === "desk-lamp";
  const objectState =
    frame >= 108 ? input.testResults.after : "not-functioning";
  return (
    <g data-object-state={objectState}>
      {isLamp ? (
        <LampObject functioning={functioning} accent={accent} />
      ) : (
        <LockerObject functioning={functioning} accent={accent} />
      )}
      <RemedyReplacementPart
        {...{ frame, tokens, motion, scales, replacement }}
      />
      <RemedyRetestContact
        {...{ accent, tokens, scales, functioning, attempt, isLamp }}
      />
    </g>
  );
}
