import { PhraseCopy } from "../PhraseCopy";
import { PhraseSocket } from "../PhraseSocket";
import { DraftSourceGuide } from "./DraftSourceGuide";
import { useDraftSlipPresentation } from "./useDraftSlipPresentation";
import type { Input } from "../UtteranceToModelDraft.schema.ts";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  item: Input["draft"]["entities"][number];
  index: number;
  x: number;
  y: number;
  role: string;
};
/** One phrase copy travels while the socket body waits at its destination. */
export function DraftSlip(props: Readonly<Props>): ReactNode {
  const presentation = useDraftSlipPresentation(props);

  return (
    <g>
      {props.input.showSourceGuides ? (
        <DraftSourceGuide {...presentation} />
      ) : undefined}
      <PhraseCopy
        frame={props.frame}
        start={presentation.start}
        duration={presentation.duration}
        source={presentation.source}
        itemId={props.item.id}
        x={props.x}
        y={props.y}
      />
      <g
        data-model-item={props.item.id}
        data-source-part={props.item.partId}
        transform={`translate(${props.x} ${props.y})`}
        opacity={presentation.motion.ramp(
          props.frame,
          97,
          presentation.motion.whip,
        )}
      >
        <PhraseSocket
          role={props.role}
          label={props.item.label}
          accent={props.accent}
        />
      </g>
    </g>
  );
}
