import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the planner exchange routes in authored paint order. */
export function PlannerExchangeRoutes(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M550 180 H620" }}
        profile={options.tokens.sketch.shape}
        data-outbound-route="true"
        stroke={options.tokens.color.highlight}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M620 154 H550" }}
        profile={options.tokens.sketch.shape}
        data-inbound-route="true"
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
    </>
  );
}
