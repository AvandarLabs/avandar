import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { HandoverGoodsRow } from "./HandoverGoodsRow";
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
  const tokens = useGraphicTokens();
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

/** The delivery table and the recipient's basket mat. */
function HandoverFurniture({
  accent,
}: Readonly<{ accent: string }>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={353}
        y={165}
        width={140}
        height={300}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.spaced.join(" ")}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M520 165 V475 H678 V165 M520 455 H678 M540 450 V475 M560 450 V475 M580 450 V475 M600 450 V475 M620 450 V475 M640 450 V475 M660 450 V475",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </>
  );
}
