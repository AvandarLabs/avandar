import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  accent: string;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  connection: number;
};

/** Renders the ledger connection path in authored paint order. */
export function LedgerConnectionPath(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${Motion.mix({
          t: options.connection,
          from: 748,
          to: 738,
        })} 124 Q748 ${Motion.mix({
          t: options.connection,
          from: 124,
          to: 108,
        })} ${Motion.mix({
          t: options.connection,
          from: 748,
          to: 758,
        })} 124`,
      }}
      profile={options.tokens.sketch.shape}
      fill="none"
      stroke={options.accent}
      strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      opacity={options.connection}
    />
  );
}
