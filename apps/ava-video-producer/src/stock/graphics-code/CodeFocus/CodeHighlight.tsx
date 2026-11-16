import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicProps } from "../../theme/useGraphicTheme/useGraphicTheme";
import { FIRST_LINE_Y, LINE_STEP } from "./CodeFocus.constants";
import type { ReactNode } from "react";

type Props = Readonly<{ line: number; accent: string }>;

/** The tinted band and accent marker behind the focused line. */
export function CodeHighlight({ line, accent }: Props): ReactNode {
  const style = useGraphicProps("CodeFocus", {});
  const y = FIRST_LINE_Y + line * LINE_STEP;
  return (
    <>
      <StockRect
        x={84}
        y={y - 23}
        width={792}
        height={40}
        rx={style.highlightRadius}
        fill={accent}
        fillOpacity={style.highlightAlpha}
      />
      <StockRect
        x={84}
        y={y - 23}
        width={style.markerWidth}
        height={40}
        rx={style.markerWidth / 2}
        fill={accent}
      />
    </>
  );
}
