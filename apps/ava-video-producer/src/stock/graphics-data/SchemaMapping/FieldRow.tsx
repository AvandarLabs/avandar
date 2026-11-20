import { Text } from "../../graphics-common/Text";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  FIELD_BASELINE,
  FIELD_INSET,
  ROW_HALF_HEIGHT,
  ROW_HEIGHT,
  ROW_INSET,
  ROW_WIDTH,
} from "./SchemaMapping.constants";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  portX: number;
  color: string;
  label: string;
  isPortFirst: boolean;
};
/**
 * A field row's card, port dot, and name. A target row draws its port before
 * its name and a source row after it, so each keeps its legacy paint order.
 */
export function FieldRow({
  x,
  y,
  portX,
  color,
  label,
  isPortFirst,
}: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("SchemaMapping", {});
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const port = <circle cx={portX} cy={y} r={style.dotRadius} fill={color} />;
  return (
    <>
      <StockRect
        x={x + ROW_INSET}
        y={y - ROW_HALF_HEIGHT}
        width={ROW_WIDTH}
        height={ROW_HEIGHT}
        rx={shapes.corner(style.fieldRadius)}
        fill={tokens.color.elevated}
      />
      {isPortFirst ? port : null}
      <Text role="field" x={x + ROW_INSET + FIELD_INSET} y={y + FIELD_BASELINE}>
        {label}
      </Text>
      {isPortFirst ? null : port}
    </>
  );
}
