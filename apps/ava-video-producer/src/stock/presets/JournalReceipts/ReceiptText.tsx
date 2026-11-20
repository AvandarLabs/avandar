import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";

type Props = {
  receipt: Input["receipts"][number];
  input: Input;
  accent: string;
  width: number;
};
/** Receipt wording and identity remain readable on the registered half. */
export function ReceiptText({
  receipt,
  input,
  accent,
  width,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const horizontal = input.foldDirection === "horizontal";
  if (!input.showLabels) {
    return (
      <SketchedShape
        shape={{
          kind: "path",
          d: `M12 18 h${width - 26} M12 30 h${width - 52}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
      />
    );
  }
  const labels = [
    {
      text: receipt.label,
      y: 18,
      maxLines: horizontal ? 4 : 2,
      color: undefined,
    },
    ...(input.showIdentifiers
      ? [
          {
            text: receipt.entryId,
            y: horizontal ? 84 : 46,
            maxLines: 2,
            color: accent,
          },
        ]
      : []),
  ];
  return (
    <g>
      {labels.map((label) => {
        return (
          <FitText
            key={label.y}
            {...label}
            x={10}
            width={width - 20}
            fontSize={12}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </g>
  );
}
