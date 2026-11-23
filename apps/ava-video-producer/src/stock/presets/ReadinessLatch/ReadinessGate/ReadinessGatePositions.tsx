import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type ParentProps = {
  horizontal: boolean;
  allReady: boolean;
  frame: number;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  gate: {
    profile: ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["sketch"]["shape"];
    stroke: ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["color"]["highlight"];
    strokeWidth: number;
  };
  before: { x1: number; x2: number; y1: number; y2: number };
  after: { x1: number; x2: number; y1: number; y2: number };
  hinge: {
    cx: number;
    cy: number;
    r: number;
    fill: ReturnType<
      typeof GraphicThemeHooks.useGraphicTokens
    >["color"]["highlight"];
  };
};

/** Renders the readiness gate positions in authored paint order. */
export function ReadinessGatePositions(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.motion.reveal(options.frame, 20)}>
      <SketchedShape
        data-gate="before"
        shape={{ kind: "line", ...options.before }}
        {...options.gate}
      />
      <SketchedShape
        data-gate="after"
        shape={{ kind: "line", ...options.after }}
        {...options.gate}
      />
      <circle {...options.hinge} />
    </g>
  );
}
