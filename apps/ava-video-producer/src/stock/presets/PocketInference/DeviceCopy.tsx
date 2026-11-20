import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/**
 * Supplied captions describe this illustrative bounded task without performance
 * claims.
 */
export function DeviceCopy({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-device-copy="captions">
      {input.showLabels
        ? [
            { text: input.copy.device, y: 58 },
            { text: input.copy.boundary, y: 532 },
            { text: input.copy.example, y: 580 },
          ].map(({ text, y }) => {
            return (
              <FitText
                key={y}
                {...{ text, y }}
                x={480}
                width={700}
                fontSize={14}
                maxLines={2}
                anchor="middle"
                normalizeWhitespace
                breakLongWords
                color={tokens.color.textMuted}
              />
            );
          })
        : undefined}
    </g>
  );
}
