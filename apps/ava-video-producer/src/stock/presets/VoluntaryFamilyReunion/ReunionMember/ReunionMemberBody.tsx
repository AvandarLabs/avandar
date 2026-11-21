import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  stride: number;
};

/** Renders the reunion member body in authored paint order. */
export function ReunionMemberBody(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: options.x, cy: options.y - 52, r: 8 }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x} ${options.y - 42} V${options.y - 18} M${options.x} ${options.y - 18} L${options.x - 12 - options.stride} ${options.y + 7} M${options.x} ${options.y - 18} L${options.x + 12 + options.stride} ${options.y + 7}`,
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}
