import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HandoverFurniture } from "./HandoverFurniture";
import { HandoverGoodsRow } from "./HandoverGoodsRow/HandoverGoodsRow";
import { HandoverLabels } from "./HandoverLabels";
import { HandoverReceipt } from "./HandoverReceipt";
import { HandoverRecipient } from "./HandoverRecipient";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
/** Complete authored handover and shared frame controls. */
export type Props = GraphicProps & { input: Input };
/** Physical recipient selection precedes the quantity acknowledgement. */
export function RecipientConfirmedHandover({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <HandoverLabels input={input} />
      <PersonGlyph
        x={368}
        y={95}
        size={36}
        role="worker"
        color={tokens.color.accentAlt}
      />
      <HandoverFurniture accent={accent} />
      {input.contents.map((content, index) => {
        return (
          <HandoverGoodsRow
            key={content.id}
            input={input}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <HandoverRecipient input={input} frame={frame} accent={accent} />
      <HandoverReceipt input={input} frame={frame} accent={accent} />
    </g>
  );
}
