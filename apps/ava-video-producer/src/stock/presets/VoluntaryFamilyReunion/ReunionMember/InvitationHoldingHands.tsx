import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getReunionHandFromFrame } from "../getReunionHandFromFrame";
import type { Input } from "../VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = {
  member: Input["groups"][number]["members"][number];
  index: number;
  groupIndex: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  index: Readonly<ParentProps>["index"];
  groupIndex: Readonly<ParentProps>["groupIndex"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  y: number;
  accepting: ReturnType<typeof getReunionHandFromFrame>["accepting"];
  handX: ReturnType<typeof getReunionHandFromFrame>["handX"];
  handY: ReturnType<typeof getReunionHandFromFrame>["handY"];
};

/** Renders the invitation holding hands in authored paint order. */
export function InvitationHoldingHands(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.index === 0 && options.frame < 60 ? (
        <g data-invitation-holding-arm>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${options.x} ${options.y - 36} L${options.groupIndex === 0 ? 120 : 740} 310`,
            }}
            profile={options.tokens.sketch.shape}
            fill="none"
            stroke={options.accent}
            strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
          />
        </g>
      ) : undefined}
      <circle
        data-accepting-hand={options.accepting ? "" : undefined}
        cx={options.handX}
        cy={options.handY}
        r={3}
        fill={options.accent}
      />
    </>
  );
}
