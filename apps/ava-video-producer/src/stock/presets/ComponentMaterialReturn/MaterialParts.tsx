import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "./getMaterialPlacementFromInputAndFrame";
import { ROUTE_COLORS } from "./routeColors";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Stable numbered components retain source identity in all destinations. */
export function MaterialParts({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      {getMaterialItemsFromInput(input).map((item, index) => {
        const point = getMaterialPlacementFromInputAndFrame({
          input,
          index,
          frame,
        });
        return (
          <g key={item.id}>
            <rect
              data-part={index}
              data-part-id={item.id}
              data-origin={item.origin}
              data-route={item.route}
              data-mass={item.massKg}
              x={point.x}
              y={point.y}
              width={24}
              height={24}
              rx={item.origin === "replacement" ? 6 : 2}
              fill={ROUTE_COLORS[item.route]}
              fillOpacity={0.22}
              stroke={ROUTE_COLORS[item.route]}
            />
            <SceneLabel
              text={String(index + 1)}
              x={point.x + 4}
              y={point.y + 16}
              width={20}
              lines={1}
            />
          </g>
        );
      })}
    </g>
  );
}
