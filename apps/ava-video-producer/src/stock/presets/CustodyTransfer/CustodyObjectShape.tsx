import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SUPPORT_STROKE } from "./custodyShape";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";

type Props = { shape: Input["objectShape"]; accent: string };
type Box = Record<"x" | "y" | "width" | "height", number>;
const FOLIO: Box = { x: 452, y: 240, width: 56, height: 136 };
const BATON: Box = { x: 465, y: 240, width: 30, height: 136 };
/** The folio's corner before the corner style scales it. */
const FOLIO_CORNER = 5;
/** The baton's rounded end, half its width, before the corner style. */
const BATON_CORNER = 15;
const KEY_STEM = { kind: "line", x1: 480, x2: 480, y1: 284, y2: 376 } as const;
/** Every silhouette ends at the shared physical support anchor. */
export function CustodyObjectShape({
  shape,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const keyWidth = scales.stroke(SUPPORT_STROKE);
  return shape === "key" ? (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: 480, cy: 262, r: 22 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={keyWidth}
      />
      <g data-object-base={shape}>
        <SketchedShape
          shape={KEY_STEM}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={keyWidth}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: "M480 366 H498 V352 H480" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={keyWidth}
      />
    </g>
  ) : (
    <StockRect
      data-object-base={shape}
      {...(shape === "folio" ? FOLIO : BATON)}
      rx={scales.corner(shape === "folio" ? FOLIO_CORNER : BATON_CORNER)}
      fill={tokens.color.elevated}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
