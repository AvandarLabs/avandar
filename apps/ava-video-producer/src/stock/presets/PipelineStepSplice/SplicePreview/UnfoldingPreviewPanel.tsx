import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { PreviewValue } from "../PreviewValue";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PipelineStepSplice.schema";
import type { ReactNode } from "react";

type ParentProps = {
  preview: Input["preview"];
  frame: number;
  accent: string;
};

type Props = {
  preview: Readonly<ParentProps>["preview"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  unfolding: number;
};

/** The preview panel's corner before the corner style scales it. */
const PANEL_CORNER = 5;

/** Renders the unfolding preview panel in authored paint order. */
export function UnfoldingPreviewPanel(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={64}
        y={416}
        width={832}
        height={Motion.mix({
          t: options.unfolding,
          from: 12,
          to: 154,
        })}
        rx={options.scales.corner(PANEL_CORNER)}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      <PreviewValue
        label={options.preview.inputLabel}
        value={options.preview.inputValue}
        isOutput={false}
        accent={options.accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M88 488H872" }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.line}
      />
    </>
  );
}
