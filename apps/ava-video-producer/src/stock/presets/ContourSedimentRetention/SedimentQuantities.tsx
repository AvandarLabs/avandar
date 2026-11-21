import { SceneLabel } from "./SceneLabel";
import { SedimentQuantityTerms } from "./SedimentQuantityTerms/SedimentQuantityTerms";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Both destinations retain their common incoming-mass denominator. */
export function SedimentQuantities({ input }: Readonly<Props>): ReactNode {
  const exported = input.sediment.mobilizedKg - input.sediment.retainedKg;
  return (
    <g>
      <SedimentQuantityTerms input={input} exported={exported} />
      <g data-exported="quantity" data-quantity={exported}>
        <SceneLabel
          text={`${input.sediment.mobilizedKg} = ${input.sediment.retainedKg} + ${exported} ${input.copy.unit}`}
          x={45}
          y={560}
          width={860}
          lines={1}
        />
      </g>
      <SceneLabel
        text={input.copy.disclaimer}
        x={45}
        y={590}
        width={860}
        lines={1}
      />
    </g>
  );
}
