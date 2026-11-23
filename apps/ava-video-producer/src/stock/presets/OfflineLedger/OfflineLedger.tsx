import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LedgerCasing } from "./LedgerCasing";
import { LedgerConnection } from "./LedgerConnection/LedgerConnection";
import { LedgerCopy } from "./LedgerCopy";
import { LedgerEntry } from "./LedgerEntry";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./OfflineLedger.schema";
import type { ReactNode } from "react";

/** Complete notebook rendering input. */
export type Props = GraphicProps & { input: Input };

/** The page's corner before the corner style scales it. */
const PAGE_CORNER = 3;

/** Writing continues at a fixed cadence after the connection arc collapses. */
export function OfflineLedger({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <LedgerCasing shape={input.deviceShape} accent={accent} />
      <LedgerConnection {...{ frame, accent }} />
      <StockRect
        x={194}
        y={162}
        width={572}
        height={252}
        rx={scales.corner(PAGE_CORNER)}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M194 434 h572 v48 h-572 z M200 430 h560" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.ground}
        stroke={tokens.color.line}
      />
      {input.entries.map((entry, index) => {
        return (
          <LedgerEntry
            key={entry.id}
            {...{ entry, index, frame, accent, input }}
          />
        );
      })}
      <LedgerCopy {...{ frame, input }} />
    </g>
  );
}
