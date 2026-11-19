import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { FoundationApproach } from "./FoundationApproach";
import { FoundationBase } from "./FoundationBase";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const motion = useGraphicMotion();
  return (
    <g>
      <g opacity={motion.ramp(frame, 12, motion.hero)}>
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
      {input.approaches.map((approach, index) => {
        return (
          <FoundationApproach
            key={approach.id}
            {...{ approach, index, frame, accent }}
            showTrait={input.showDistinctTraits}
          />
        );
      })}
      <FoundationBase {...{ ...remainingProps, input, frame, accent }} />
    </g>
  );
}
