import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SupportRequestResponse.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  colleagueX: number;
  handX: number;
  handY: number;
};

/** Renders the colleague hands in authored paint order. */
export function ColleagueHands(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.colleagueX} 330 L${options.handX} ${options.handY}`,
        }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.tokens.color.accentAlt}
        strokeWidth={options.scales.stroke(options.tokens.stroke.heavy)}
      />
      <circle
        data-chair-hand={
          options.input.response.state === "joins" &&
          options.frame >= 97 &&
          options.frame <= 117
            ? "true"
            : undefined
        }
        data-shared-hand={
          options.input.response.state === "joins" && options.frame >= 117
            ? "true"
            : undefined
        }
        cx={options.handX}
        cy={options.handY}
        r={5}
        fill={options.tokens.color.accentAlt}
      />
    </>
  );
}
