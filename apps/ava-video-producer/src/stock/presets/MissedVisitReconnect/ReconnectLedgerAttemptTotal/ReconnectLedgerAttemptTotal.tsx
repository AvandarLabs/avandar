import { SceneLabel } from "../SceneLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  numAttempts: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the attempt total with authored geometry. */
export function ReconnectLedgerAttemptTotal({
  input,
  numAttempts,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showAttemptCount ? (
        <g>
          <SceneLabel
            text={input.copy.attempts}
            x={510}
            y={562}
            width={360}
            lines={3}
          />
          <text
            data-attempt-total={numAttempts}
            x={900}
            y={562}
            fill={tokens.color.text}
            fontSize={tokens.text.graphic.label.fontSize}
            fontFamily={tokens.text.graphic.label.fontFamily}
            fontWeight={tokens.text.graphic.label.fontWeight}
          >
            {numAttempts}
          </text>
        </g>
      ) : undefined}
    </>
  );
}
