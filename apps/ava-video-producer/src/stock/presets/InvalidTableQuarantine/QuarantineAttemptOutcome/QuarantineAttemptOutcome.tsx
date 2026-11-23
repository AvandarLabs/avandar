import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { Input } from "../InvalidTableQuarantine.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  emphasis: number;
  isReplaced: ReturnType<typeof getQuarantineStateFromFrame>["isReplaced"];
  arrival: ReturnType<typeof getQuarantineStateFromFrame>["arrival"];
  readable: ReturnType<typeof getQuarantineStateFromFrame>["readable"];
  showAttempt: ReturnType<typeof getQuarantineStateFromFrame>["showAttempt"];
};
/** Displays attempted reads and a completed replacement separately. */
export function QuarantineAttemptOutcome({
  input,
  accent,
  tokens,
  emphasis,
  isReplaced,
  arrival,
  readable,
  showAttempt,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {showAttempt ? (
        <g data-attempt-outcome={input.attempt.outcome}>
          <SketchedShape
            shape={{
              kind: "path",
              d:
                input.attempt.outcome === "failed"
                  ? "M690 330 l20 20 m0 -20 l-20 20"
                  : "M690 340 l8 8 l16 -20",
            }}
            profile={tokens.sketch.shape}
            opacity={input.reload.performed ? 1 - arrival : 1}
            fill="none"
            stroke={tokens.color.highlight}
            strokeWidth={emphasis}
          />
        </g>
      ) : null}
      {readable && isReplaced ? (
        <g data-reload-outcome="complete">
          <SketchedShape
            shape={{ kind: "path", d: "M690 340 l8 8 l16 -20" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={emphasis}
          />
        </g>
      ) : null}
    </>
  );
}
