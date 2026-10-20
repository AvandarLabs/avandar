import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { FoundationApproach } from "./FoundationApproach";
import { FoundationBase } from "./FoundationBase";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SharedFoundation.schema";
import type { ReactNode } from "react";
/** Two authored approaches and their single shared principle. */
export type Props = GraphicProps & { input: Input };
/** Distinct approaches lift to reveal one continuous common foundation. */
export function SharedFoundation({
  input,
  frame,
  accent,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <g opacity={ramp(frame, 12, 18)}>
        <FitText
          text={input.openingConnector}
          x={480}
          y={66}
          width={840}
          fontSize={20}
          maxLines={1}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      {input.approaches.map((approach, index) => (
        <FoundationApproach
          key={approach.id}
          {...{ approach, index, frame, accent }}
          showTrait={input.showDistinctTraits}
        />
      ))}
      <FoundationBase {...{ ...remainingProps, input, frame, accent }} />
    </g>
  );
}
