import { mix, ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  getEffectiveRoleFromInput,
  ROLE_RANK,
} from "../getEffectiveRoleFromInput";
import { PermissionRanks } from "../PermissionRanks";
import { LadderMarks } from "./LadderMarks";
import { ResultLink } from "./ResultLink";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Frames the result marker takes to rise to the effective rank. */
const RISE_FRAMES = 38;
/** A result marker rises separately from the fixed action-requirement notch. */
export function PermissionLadder({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const effective = getEffectiveRoleFromInput(input);
  const resultY = mix(
    ramp(frame, 101, motion.scale(RISE_FRAMES), motion.travel.easing),
    440,
    440 - ROLE_RANK[effective] * 90,
  );
  const requiredY = 440 - ROLE_RANK[input.requiredRole] * 90;
  return (
    <g>
      <PermissionRanks input={input} />
      <SketchedShape
        shape={{ kind: "path", d: "M790 440 V170" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
      />
      <LadderMarks
        requiredRole={input.requiredRole}
        requiredY={requiredY}
        resultY={resultY}
        accent={accent}
      />
      <ResultLink
        requiredY={requiredY}
        resultY={resultY}
        label={input.labels[effective]}
        frame={frame}
      />
    </g>
  );
}
