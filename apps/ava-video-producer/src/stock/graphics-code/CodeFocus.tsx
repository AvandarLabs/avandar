import { ramp } from "../../motion";
import {
  Eyebrow,
  GRAPHIC_WIDTH,
  Pill,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { STOCK } from "../stockPalette";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme";
import { CodeWindow } from "./CodeWindow";
import type { CodeFocusInput } from "../presets/CodeFocus/CodeFocus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: CodeFocusInput };

const BADGE_TOP = 44;
const BADGE_WIDTH = 156;
const HIGHLIGHT_CUE = 43;
const HIGHLIGHT_STEP = 38;
const HIGHLIGHT_FRAMES = 13;
const FIRST_LINE_Y = 189;
const LINE_STEP = 46;

type CodeLine = CodeFocusInput["lines"][number];

/** The fractional line the highlight sits on at `frame`, easing between authored lines. */
function useHighlightLine(highlight: readonly number[], frame: number): number {
  const motion = useGraphicMotion();
  return highlight
    .slice(1)
    .reduce(
      (offset, lineIndex, index) =>
        offset +
        ramp(
          frame,
          HIGHLIGHT_CUE + index * HIGHLIGHT_STEP,
          motion.scale(HIGHLIGHT_FRAMES),
          motion.travel.easing,
        ) *
          (lineIndex - highlight[index]),
      highlight[0],
    );
}

/** The tinted band and accent marker behind the focused line. */
function CodeHighlight({
  line,
  accent,
}: Readonly<{ line: number; accent: string }>): ReactNode {
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

/** One numbered code line. A mint token keeps meaning the graphic's accent. */
function CodeLineRow({
  codeTokens,
  index,
  accent,
}: Readonly<{
  codeTokens: CodeLine;
  index: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const code = tokens.text.graphic.code;
  const y = FIRST_LINE_Y + index * LINE_STEP;
  return (
    <g>
      <Text role="lineNumber" x={111} y={y} anchor="end">
        {index + 1}
      </Text>
      <text
        x={144}
        y={y}
        fontSize={code.fontSize}
        fontFamily={code.fontFamily}
        xmlSpace="preserve"
      >
        {codeTokens.map((token, j) => (
          <tspan
            key={j}
            fill={resolveContentColor(
              token.color === STOCK.mint ? "accent" : token.color,
              { tokens, accent },
            )}
          >
            {token.text}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/** The divider, accent dot, and footer note at the bottom of the window. */
function CodeFooter({
  footer,
  accent,
}: Readonly<{ footer: string; accent: string }>): ReactNode {
  const style = useGraphicProps("CodeFocus", {});
  const { color } = useGraphicTokens();
  return (
    <>
      <path
        d="M84 478 H876"
        stroke={color.line}
        strokeWidth={style.dividerWidth}
      />
      <circle cx={107} cy={500} r={style.footerDotRadius} fill={accent} />
      <Text role="pill" x={122} y={505}>
        {footer}
      </Text>
    </>
  );
}

/** Draws the bounded authored code-focus study at an explicit frame. */
export function CodeFocus({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const line = useHighlightLine(input.highlight, frame);
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].codeFocus,
        })}
      </Eyebrow>
      <Pill
        x={GRAPHIC_WIDTH - tokens.layout.graphic.margin - BADGE_WIDTH}
        y={BADGE_TOP}
        width={BADGE_WIDTH}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].exampleCode,
        })}
        color={accent}
      />
      <CodeWindow title={input.title}>
        {input.showHighlight ? (
          <CodeHighlight line={line} accent={accent} />
        ) : null}
        {input.lines.map((codeTokens, i) => (
          <CodeLineRow
            key={i}
            codeTokens={codeTokens}
            index={i}
            accent={accent}
          />
        ))}
        <CodeFooter footer={input.footer} accent={accent} />
      </CodeWindow>
    </g>
  );
}
