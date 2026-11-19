import { prop } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { HouseholdMap } from "./HouseholdMap";
import { OutreachLedger } from "./OutreachLedger";
import { OutreachWorker } from "./OutreachWorker";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";
/** Fixed household universe and an ordered authored visit sequence. */
export type Props = GraphicProps & { input: Input };
/** Visits accumulate while a successful household contact stays unique. */
export function OutreachHouseholdRevisits({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const numCompleted = Math.min(
    input.visits.length,
    Math.max(0, Math.floor(((frame - 36) / 72) * input.visits.length)),
  );
  const completed = input.visits.slice(0, numCompleted);
  return (
    <g
      opacity={motion.ramp(frame, 12, motion.hero, motion.reveal.easing)}
      data-unique-contacted={
        new Set(
          completed
            .filter(({ contacted }) => {
              return contacted;
            })
            .map(prop("householdId")),
        ).size
      }
      data-unique-visited={new Set(completed.map(prop("householdId"))).size}
    >
      <FitText
        text={input.sceneLabel}
        x={50}
        y={38}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.copy.map}
        x={50}
        y={78}
        width={540}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <HouseholdMap input={input} completed={completed} accent={accent} />
      <OutreachWorker input={input} frame={frame} accent={accent} />
      <OutreachLedger input={input} completed={completed} />
    </g>
  );
}
