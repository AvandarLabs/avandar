import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { EXPIRY_CUE } from "./leaseShape";
import type { Input } from "./ExpiringLease.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
const TEXT = {
  x: 480,
  width: 850,
  maxLines: 2,
  anchor: "middle" as const,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "width"
  | "maxLines"
  | "anchor"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
const UNIT = {
  x: 86,
  y: 151,
  width: 400,
  fontSize: 14 as const,
  maxLines: 2,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "y"
  | "width"
  | "fontSize"
  | "maxLines"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/**
 * Possession and neutral-dock copy reflect authored expiry, never a successor.
 */
export function LeaseCaptions({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const captions = [
    { text: input.permissionLabel, y: 52, fontSize: 18 as const },
    { text: input.copy.dock, y: 486, fontSize: 16 as const },
    {
      text: frame < EXPIRY_CUE ? input.copy.held : input.copy.expired,
      y: 550,
      fontSize: 16 as const,
    },
    {
      text: input.copy.example,
      y: 585,
      fontSize: 12 as const,
      color: tokens.color.textMuted,
    },
  ];
  return (
    <g>
      {captions.map((caption) => {
        return <FitText key={caption.y} {...TEXT} {...caption} />;
      })}
      {frame >= EXPIRY_CUE ? (
        <FitText {...TEXT} text={input.copy.unassigned} y={518} fontSize={14} />
      ) : undefined}
      {input.showLifetime ? (
        <g>
          <text
            x={52}
            y={151}
            fontSize={tokens.text.graphic.value.fontSize}
            fill={tokens.color.textMuted}
            fontFamily={tokens.text.graphic.value.fontFamily}
            fontWeight={tokens.text.graphic.value.fontWeight}
          >
            {input.lifetime.value}
          </text>
          <FitText {...UNIT} text={input.lifetime.unit} />
        </g>
      ) : undefined}
    </g>
  );
}
