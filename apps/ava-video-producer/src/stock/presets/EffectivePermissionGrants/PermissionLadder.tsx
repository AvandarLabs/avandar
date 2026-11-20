import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  getEffectiveRoleFromInput,
  ROLE_RANK,
} from "./getEffectiveRoleFromInput";
import { PermissionRanks } from "./PermissionRanks";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Frames the result marker takes to rise to the effective rank. */
const RISE_FRAMES = 38;
/** Frames the result link and label take to fade in. */
const LINK_FRAMES = 7;
/** A result marker rises separately from the fixed action-requirement notch. */
export function PermissionLadder({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
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

/** The fixed notch at the required rank and the rising result marker. */
function LadderMarks({
  requiredRole,
  requiredY,
  resultY,
  accent,
}: Readonly<{
  requiredRole: Input["requiredRole"];
  requiredY: number;
  resultY: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <g data-required-notch={requiredRole}>
        <SketchedShape
          shape={{ kind: "path", d: `M725 ${requiredY - 10} v20 l16 -10 Z` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          fill={tokens.color.highlight}
        />
      </g>
      <g data-result-marker="true">
        <SketchedShape
          shape={{ kind: "circle", cx: 790, cy: resultY, r: 14 }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          fill={tokens.color.ground}
        />
      </g>
    </>
  );
}

/** The link from the required notch to the result, and the result's label. */
function ResultLink({
  requiredY,
  resultY,
  label,
  frame,
}: Readonly<{
  requiredY: number;
  resultY: number;
  label: string;
  frame: number;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const link = ramp(
    frame,
    132,
    motion.scale(LINK_FRAMES),
    motion.reveal.easing,
  );
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: `M754 ${requiredY} H770 V${resultY} H776` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        fill="none"
        opacity={link}
      />
      <g opacity={link}>
        <LabelSlots labels={[[label, 720, 488, 185, 16, 4]]} />
      </g>
    </>
  );
}
