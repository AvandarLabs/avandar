import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ScopeAperture.schema";
import type { ReactNode } from "react";
/** Inputs for ScopeTopicCopy. */
type Props = {
  topic: Input["topics"][number];
  accent: string;
};

/** A topic label keeps its full authored text clear of the rule stroke. */
export function ScopeTopicCopy({ topic, accent }: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={topic.label}
        x={0}
        y={0}
        width={topic.included ? 420 : 180}
        fontSize={16}
        maxLines={topic.included ? 1 : 4}
        anchor="middle"
        color={topic.included ? accent : STOCK.muted}
        breakLongWords
        normalizeWhitespace
      />
      <path
        d="M-38 -20 H38"
        stroke={topic.included ? accent : STOCK.line}
        strokeWidth={2}
      />
    </>
  );
}
