import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { SpineContribution } from "../SpineContribution";
import type { Input } from "../EntitySpineAssembly.schema";
import type { getSpineContributionFromFrame } from "../getSpineContributionFromFrame";
import type { ReactNode } from "react";

type Props = {
  observation: Input["observations"][number];
  isFirst: boolean;
  frame: number;
  groupStart: ReturnType<typeof getSpineContributionFromFrame>["groupStart"];
  input: Input;
  index: number;
  accent: string;
};

/** Renders the outline with authored geometry. */
export function SpineObservationContribution({
  observation,
  isFirst,
  frame,
  groupStart,
  input,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g key={observation.id}>
      {isFirst && frame >= 82 && frame < 106 ? (
        <LiteralDataText
          value={observation.entityId}
          x={235}
          y={groupStart + 14}
        />
      ) : null}
      {frame < 105 ? (
        <SpineContribution {...{ input, observation, index, frame, accent }} />
      ) : null}
    </g>
  );
}
