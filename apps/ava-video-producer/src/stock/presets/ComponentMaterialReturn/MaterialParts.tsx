import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getMaterialItemsFromInput } from "./getMaterialItemsFromInput";
import { getMaterialPlacementFromInputAndFrame } from "./getMaterialPlacementFromInputAndFrame";
import { ROUTE_CATEGORY_KEYS } from "./routeColors";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
const REPLACEMENT_CORNER = 6;
const SOURCE_CORNER = 2;
const PART_TINT = 0.22;
/** Stable numbered components retain source identity in all destinations. */
export function MaterialParts({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {getMaterialItemsFromInput(input).map((item, index) => {
        const point = getMaterialPlacementFromInputAndFrame({
          motion,
          input,
          index,
          frame,
        });
        const color = tokens.color.categorical[ROUTE_CATEGORY_KEYS[item.route]];
        return (
          <g key={item.id}>
            <StockRect
              data-part={index}
              data-part-id={item.id}
              data-origin={item.origin}
              data-route={item.route}
              data-mass={item.massKg}
              x={point.x}
              y={point.y}
              width={24}
              height={24}
              rx={scales.corner(
                item.origin === "replacement"
                  ? REPLACEMENT_CORNER
                  : SOURCE_CORNER,
              )}
              fill={color}
              fillOpacity={scales.wash(PART_TINT)}
              stroke={color}
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
