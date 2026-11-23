import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = { foldDirection: Input["foldDirection"] };

/** The journal's spine and the separate pocket the receipts come from. */
export function JournalSpineAndPocket({
  foldDirection,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const pocketPath =
    foldDirection === "horizontal"
      ? "M808 224 h144 v256 h-144 z M808 248 q72 28 144 0"
      : "M690 224 h262 v256 h-262 z M690 248 q131 28 262 0";
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M38 532 h770" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: pocketPath }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
    </>
  );
}
