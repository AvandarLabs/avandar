import { prop } from "@avandar/utils";
import { HouseholdMap } from "./HouseholdMap";
import { OutreachLedger } from "./OutreachLedger";
import { OutreachMapCaption } from "./OutreachMapCaption";
import { OutreachSceneHeading } from "./OutreachSceneHeading";
import { OutreachWorker } from "./OutreachWorker";
import { useOutreachHouseholdRevisitsPresentation } from "./useOutreachHouseholdRevisitsPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OutreachHouseholdRevisits.schema";
import type { ReactNode } from "react";
/** Fixed household universe and an ordered authored visit sequence. */
export type Props = GraphicProps & { input: Input };
/** Visits accumulate while a successful household contact stays unique. */
export function OutreachHouseholdRevisits(props: Readonly<Props>): ReactNode {
  const presentation = useOutreachHouseholdRevisitsPresentation(props);

  return (
    <g
      opacity={presentation.motion.ramp(
        props.frame,
        12,
        presentation.motion.hero,
        presentation.motion.reveal.easing,
      )}
      data-unique-contacted={
        new Set(
          presentation.completed
            .filter(prop("contacted"))
            .map(prop("householdId")),
        ).size
      }
      data-unique-visited={
        new Set(presentation.completed.map(prop("householdId"))).size
      }
    >
      <OutreachSceneHeading {...presentation} />
      <OutreachMapCaption {...presentation} />
      <HouseholdMap
        input={props.input}
        completed={presentation.completed}
        accent={props.accent}
      />
      <OutreachWorker
        input={props.input}
        frame={props.frame}
        accent={props.accent}
      />
      <OutreachLedger input={props.input} completed={presentation.completed} />
    </g>
  );
}
