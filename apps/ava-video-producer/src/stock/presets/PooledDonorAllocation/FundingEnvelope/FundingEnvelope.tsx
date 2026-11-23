import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { AllocationCreditTotal } from "./AllocationCreditTotal";
import { useFundingEnvelopePresentation } from "./useFundingEnvelopePresentation";
import type { Input } from "../PooledDonorAllocation.schema.ts";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  allocatedCredits: number;
};
/** Funding-request envelope stays below every contributed identity mark. */
export function FundingEnvelope(props: Readonly<Props>): ReactNode {
  const presentation = useFundingEnvelopePresentation(props);

  return (
    <g>
      <g data-envelope={presentation.request.id} data-edge={presentation.top}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${presentation.x} ${presentation.top + 12 * (1 - presentation.motion.ramp(props.frame, 118, presentation.motion.scale(14), presentation.motion.exit.easing))} H${presentation.x + presentation.width - 18} V${presentation.top + 42} H${presentation.x} Z M${presentation.x} ${presentation.top} L${presentation.x + presentation.width / 2 - 9} ${presentation.top + 28} L${presentation.x + presentation.width - 18} ${presentation.top}`,
          }}
          profile={presentation.tokens.sketch.shape}
          fill={presentation.tokens.color.surface}
          stroke={props.accent}
        />
      </g>
      <text
        x={presentation.x + 12}
        y={presentation.top + 27}
        fill={presentation.tokens.color.highlight}
        fontSize={presentation.tokens.text.graphic.value.fontSize}
        fontFamily={presentation.tokens.text.graphic.value.fontFamily}
        fontWeight={presentation.tokens.text.graphic.value.fontWeight}
      >
        {props.index + 1}
      </text>
      <FitText
        text={presentation.request.label}
        x={presentation.x + 12}
        y={497}
        width={presentation.width - 42}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {props.input.showAllocationTotals ? (
        <AllocationCreditTotal {...presentation} />
      ) : undefined}
    </g>
  );
}
