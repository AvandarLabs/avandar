import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getMaterialItemsFromInput } from "../getMaterialItemsFromInput";
import { ROUTE_CATEGORY_KEYS } from "../routeColors";
import { SceneLabel } from "../SceneLabel";
import { MaterialPartsShared } from "./MaterialPartsShared";
import type { ReactNode } from "react";

type Props = {
  item: ReturnType<typeof getMaterialItemsFromInput>[number];
  index: number;
  point: Readonly<{ x: number; y: number }>;
};

/** One numbered part, tinted by the route it takes. */
export function MaterialPart({
  item,
  index,
  point,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const color = tokens.color.categorical[ROUTE_CATEGORY_KEYS[item.route]];
  return (
    <g>
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
            ? MaterialPartsShared.REPLACEMENT_CORNER
            : MaterialPartsShared.SOURCE_CORNER,
        )}
        fill={color}
        fillOpacity={scales.wash(atomic.opacity["22"])}
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
}
