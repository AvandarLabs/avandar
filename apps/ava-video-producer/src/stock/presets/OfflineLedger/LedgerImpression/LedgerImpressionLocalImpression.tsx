import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type ParentProps = {
  entryId: string;
  index: number;
  frame: number;
  accent: string;
  isVisible: boolean;
};

type Props = {
  entryId: Readonly<ParentProps>["entryId"];
  index: Readonly<ParentProps>["index"];
  accent: Readonly<ParentProps>["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  impression: number;
};

/** Renders the ledger impression local impression in authored paint order. */
export function LedgerImpressionLocalImpression(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g
      data-local-impression={options.entryId}
      transform={`translate(${220 + options.index * 136} ${Motion.mix({
        t: options.impression,
        from: 422,
        to: 448,
      })})`}
      opacity={options.impression}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M0 0 h112 v22 h-112 z" }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.elevated}
        stroke={options.accent}
        strokeOpacity={options.atomic.opacity["55"]}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M12 8 h82 M12 14 h56" }}
        profile={options.tokens.sketch.shape}
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
    </g>
  );
}
