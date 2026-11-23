import { SketchedShape } from "../../../primitives/SketchedShape";
import { CategoryContext } from "../CategoryContext";
import { ChartCategoryBarEmphasis } from "./ChartCategoryBarEmphasis";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChartFocusEdit.schema";
import type { RefinementMotion } from "../RefinementMotion";
import type { ReactNode } from "react";

type ParentProps = {
  category: Input["categories"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  category: Readonly<ParentProps>["category"];
  index: Readonly<ParentProps>["index"];
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  refinement: ReturnType<typeof RefinementMotion.getRefinementFromFrame>;
  direct: ReturnType<typeof RefinementMotion.getRefinementFromFrame> | number;
  emphasized: boolean;
  y: number;
};

/** Renders the chart category content in authored paint order. */
export function ChartCategoryContent(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={options.motion.reveal(
        options.frame,
        12 + options.index * options.motion.stagger.list,
      )}
    >
      {options.input.showBeforeGuide ? (
        <g data-before-guide={options.category.id}>
          <SketchedShape
            shape={{ kind: "path", d: `M20 ${options.y + 29}H332` }}
            profile={options.tokens.sketch.shape}
            stroke={options.tokens.color.line}
            strokeDasharray={options.tokens.dash.guide.join(" ")}
            opacity={options.refinement * options.tokens.alpha.dimmed}
          />
        </g>
      ) : undefined}
      <ChartCategoryBarEmphasis
        category={options.category}
        input={options.input}
        accent={options.accent}
        atomic={options.atomic}
        scales={options.scales}
        refinement={options.refinement}
        direct={options.direct}
        emphasized={options.emphasized}
        y={options.y}
      />
      <CategoryContext
        category={options.category}
        input={options.input}
        y={options.y}
        frame={options.frame}
        accent={options.accent}
      />
    </g>
  );
}
