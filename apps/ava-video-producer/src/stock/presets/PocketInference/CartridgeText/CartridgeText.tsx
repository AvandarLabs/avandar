import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CartridgePlaceholder } from "./CartridgePlaceholder";
import type { Input } from "../PocketInference.schema";
import type { ReactNode } from "react";

type Props = { input: Input; y: number };
/** Model identity and optional detail sit on the resident cartridge face. */
export function CartridgeText({ input, y }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  if (!input.showLabels) {
    return <CartridgePlaceholder y={y} />;
  }
  const labels = [
    {
      text: input.model.label,
      x: 220,
      y: y + 24,
      width: 300,
      fontSize: 14 as const,
      maxLines: 2,
      color: tokens.color.text,
    },
    {
      text: input.model.detail,
      x: 544,
      y: y + 18,
      width: 198,
      fontSize: 12 as const,
      maxLines: 3,
      color: tokens.color.textMuted,
    },
  ];
  return (
    <g>
      {labels.map((label) => {
        return (
          <FitText
            key={label.x}
            {...label}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </g>
  );
}
