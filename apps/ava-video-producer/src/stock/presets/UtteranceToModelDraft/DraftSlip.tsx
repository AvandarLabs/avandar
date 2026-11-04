import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getPhrasePositionsFromSentenceParts } from "./getPhrasePositionsFromSentenceParts";
import { PhraseCopy } from "./PhraseCopy";
import { PhraseSocket } from "./PhraseSocket";
import type { Input } from "./UtteranceToModelDraft.schema";
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
export function DraftSlip({
  frame,
  input,
  accent,
  item,
  index,
  x,
  y,
  role,
}: Readonly<Props>): ReactNode {
  const source = getPhrasePositionsFromSentenceParts(input.sentenceParts).find(
    propEq("id", item.partId),
  )!;
  const duration = 48 / (3 + input.draft.attributes.length);
  const start = 49 + index * duration;
  return (
    <g>
      {input.showSourceGuides ? (
        <path
          data-source-guide={item.id}
          opacity={0.3 * ramp(frame, start, duration)}
          d={`M${source.x} ${source.y + 10} L${x} ${y}`}
          stroke={STOCK.muted}
          fill="none"
        />
      ) : undefined}
      <PhraseCopy
        frame={frame}
        start={start}
        duration={duration}
        source={source}
        itemId={item.id}
        x={x}
        y={y}
      />
      <g
        data-model-item={item.id}
        data-source-part={item.partId}
        transform={`translate(${x} ${y})`}
        opacity={ramp(frame, 97, 8)}
      >
        <PhraseSocket role={role} label={item.label} accent={accent} />
      </g>
    </g>
  );
}
