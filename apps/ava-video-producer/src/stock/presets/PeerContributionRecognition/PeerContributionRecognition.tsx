import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { RecognitionExchange } from "./RecognitionExchange";
import { RecognitionObjects } from "./RecognitionObjects";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PeerContributionRecognition.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };

/** Specific appreciation retains the contributor's objects and authorship. */
export function PeerContributionRecognition({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const focusedIndex = input.contributions.findIndex(
    propEq("id", input.focusedContributionId),
  );
  const focusedX =
    input.contributions.length === 1 ? 400 : 300 + focusedIndex * 220;
  return (
    <g>
      <LabelSlots labels={[[input.exampleLabel, 60, 560, 840, 14, 2]]} />
      <RecognitionExchange
        input={input}
        frame={frame}
        accent={accent}
        focusedX={focusedX}
      />
      <RecognitionObjects input={input} frame={frame} accent={accent} />
      <g opacity={ramp(frame, 12, 14)}>
        <LabelSlots
          labels={[
            [input.people.contributor, 60, 420, 200, 20, 4],
            [input.people.colleague, 720, 420, 180, 20, 4],
          ]}
        />
      </g>
    </g>
  );
}
