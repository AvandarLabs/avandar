import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Both destinations retain their common incoming-mass denominator. */
export function SedimentQuantities({ input }: Readonly<Props>): ReactNode {
  const exported = input.sediment.mobilizedKg - input.sediment.retainedKg;
  return (
    <g>
      {[
        { label: input.copy.mobilized, value: input.sediment.mobilizedKg },
        { label: input.copy.retained, value: input.sediment.retainedKg },
        { label: input.copy.exported, value: exported },
      ].map(({ label, value }, index) => (
        <g key={index}>
          <SceneLabel
            text={label}
            x={45 + index * 300}
            y={470}
            width={265}
            lines={3}
          />
          <SceneLabel
            text={`${value} ${input.copy.unit}`}
            x={45 + index * 300}
            y={520}
            width={265}
          />
        </g>
      ))}
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
