import { SceneLabel } from "../SceneLabel";
import type { Input } from "../ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  exported: number;
};

/** Renders the label label with authored geometry. */
export function SedimentQuantityTerms({
  input,
  exported,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {[
        { label: input.copy.mobilized, value: input.sediment.mobilizedKg },
        { label: input.copy.retained, value: input.sediment.retainedKg },
        { label: input.copy.exported, value: exported },
      ].map(({ label, value }, index) => {
        return (
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
        );
      })}
    </>
  );
}
