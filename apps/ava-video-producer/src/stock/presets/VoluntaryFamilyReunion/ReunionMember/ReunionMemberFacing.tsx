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
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  y: number;
  greeting: number;
  side: number;
  handX: ReturnType<typeof getReunionHandFromFrame>["handX"];
  handY: ReturnType<typeof getReunionHandFromFrame>["handY"];
};

/** Renders the reunion member facing in authored paint order. */
export function ReunionMemberFacing(options: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-facing>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${options.x} ${options.y - 52} L${options.x + options.side * 9 * options.greeting} ${options.y - 52}`,
          }}
          profile={options.tokens.sketch.shape}
          stroke={options.accent}
          strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
        />
      </g>
      <g data-greeting-arm>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${options.x} ${options.y - 36} L${options.x + options.side * 16 * options.greeting} ${options.y - 30 - 12 * options.greeting} L${options.handX} ${options.handY} M${options.x} ${options.y - 36} L${options.x - options.side * 24 * options.greeting} ${options.y - 22 - 10 * options.greeting}`,
          }}
          profile={options.tokens.sketch.shape}
          stroke={options.accent}
          strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </>
  );
}
