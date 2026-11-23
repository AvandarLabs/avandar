import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { SUGGESTED_DASH } from "../argumentShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as ParentProps } from "../ArgumentBridge";
import type { ReactNode } from "react";

type Props = {
  accent: Readonly<ParentProps>["accent"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  deck: number;
};

/** The deck's line weight before the line weight scales it. */
const DECK_STROKE = 5;

/** Renders the deck span in authored paint order. */
export function DeckSpan(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "line",
        x1: Motion.mix({
          t: options.deck,
          from: 480,
          to: 30,
        }),
        y1: 350,
        x2: Motion.mix({
          t: options.deck,
          from: 480,
          to: 930,
        }),
        y2: 350,
      }}
      profile={options.tokens.sketch.shape}
      stroke={options.accent}
      strokeWidth={options.scales.stroke(DECK_STROKE)}
      opacity={options.deck}
      strokeDasharray={
        options.input.relationship === "suggests" ? SUGGESTED_DASH : undefined
      }
    />
  );
}
