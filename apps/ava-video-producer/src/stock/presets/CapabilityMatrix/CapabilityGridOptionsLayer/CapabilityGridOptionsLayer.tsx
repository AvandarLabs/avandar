import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { CapabilityColumn } from "../CapabilityColumn";
import { CapabilityRowRules } from "./CapabilityRowRules/CapabilityRowRules";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CapabilityMatrix.schema";
import type { ReactNode } from "react";

type CapabilityPanelGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>["corner"]
  >;
};

type Props = {
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  panel: CapabilityPanelGeometry;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  input: Input;
  height: number;
};

/** Renders the options layer with authored geometry. */
export function CapabilityGridOptionsLayer({
  frame,
  motion,
  panel,
  tokens,
  input,
  height,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 18,
        dur: motion.hero,
        easing: motion.reveal.easing,
      })}
    >
      <StockRect
        {...panel}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      {input.options.map((option, index) => {
        return (
          <CapabilityColumn
            key={option.id}
            {...{ option, index, height }}
            columnWidth={606 / input.options.length}
          />
        );
      })}
      <CapabilityRowRules tokens={tokens} input={input} />
    </g>
  );
}
