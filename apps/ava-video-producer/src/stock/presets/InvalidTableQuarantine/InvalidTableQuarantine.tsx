import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getQuarantineStateFromFrame } from "./getQuarantineStateFromFrame";
import { InvalidTableQuarantineLabels } from "./InvalidTableQuarantineLabels/InvalidTableQuarantineLabels";
import { QuarantineAttemptOutcome } from "./QuarantineAttemptOutcome/QuarantineAttemptOutcome";
import { QuarantineIncomingSheet } from "./QuarantineIncomingSheet/QuarantineIncomingSheet";
import { QuarantineReadRoute } from "./QuarantineReadRoute/QuarantineReadRoute";
import { QuarantineShutter } from "./QuarantineShutter/QuarantineShutter";
import { QuarantineTableFrame } from "./QuarantineTableFrame/QuarantineTableFrame";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./InvalidTableQuarantine.schema";
import type { ReactNode } from "react";

/** Frame-driven authored study props. */
export type Props = GraphicProps & {
  input: Input;
};
/** Invalidation closes reads until a whole replacement precedes reopening. */
export function InvalidTableQuarantine({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const emphasis = scales.stroke(tokens.stroke.emphasis);
  const {
    isReplaced,
    rows,
    arrival,
    height,
    readable,
    incoming,
    showReload,
    showAttempt,
  } = getQuarantineStateFromFrame({ frame, input, motion });
  return (
    <g data-readable={readable}>
      <QuarantineTableFrame {...{ tokens, scales, rows }} />
      <QuarantineShutter {...{ input, tokens, scales, height }} />
      <QuarantineIncomingSheet {...{ input, arrival, incoming }} />
      <InvalidTableQuarantineLabels readable={readable} input={input} />
      {showReload ? (
        <LabelSlots labels={[[input.labels.reload, 680, 390, 230, 16, 4]]} />
      ) : null}
      <QuarantineAttemptOutcome
        {...{ input, accent, tokens, emphasis, isReplaced, arrival }}
        readable={readable}
        showAttempt={showAttempt}
      />
      <QuarantineReadRoute {...{ accent, atomic, tokens, scales, readable }} />
    </g>
  );
}
