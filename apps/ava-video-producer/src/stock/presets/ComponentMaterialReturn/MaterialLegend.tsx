import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Numbered labels retain their explicit source, route and mass ownership. */
export function MaterialLegend({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {getMaterialItemsFromInput(input).map((item, index) => (
        <g key={item.id} data-label-owner={index}>
          <SceneLabel
            text={`${index + 1}. ${item.label}`}
            x={45 + (index % 3) * 300}
            y={430 + Math.floor(index / 3) * 44}
            width={280}
            lines={3}
          />
        </g>
      ))}
    </g>
  );
}
