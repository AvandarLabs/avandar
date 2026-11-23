import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../AidCargoModeHandoff.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the label label with authored geometry. */
export function CargoParcelLabels({
  input,
  accent,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showParcelLabels
        ? input.parcels.map((parcel, index) => {
            return (
              <g key={parcel.id}>
                <text
                  x={40 + index * 230}
                  y={505}
                  fill={accent}
                  fontFamily={tokens.text.graphic.secondary.fontFamily}
                  fontWeight={tokens.text.graphic.secondary.fontWeight}
                  fontSize={tokens.text.graphic.secondary.fontSize}
                >
                  {index + 1}
                </text>
                <FitText
                  text={parcel.label}
                  x={65 + index * 230}
                  y={505}
                  width={195}
                  fontSize={14}
                  maxLines={4}
                  normalizeWhitespace
                  breakLongWords
                />
              </g>
            );
          })
        : undefined}
    </>
  );
}
