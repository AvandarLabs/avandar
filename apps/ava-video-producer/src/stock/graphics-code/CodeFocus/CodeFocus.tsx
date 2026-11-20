import { ramp } from "../../../motion";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Pill } from "../../graphics-common/Pill";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CodeWindow } from "../CodeWindow";
import { CodeFooter } from "./CodeFooter";
import { CodeHighlight } from "./CodeHighlight";
import { CodeLineRow } from "./CodeLineRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { CodeFocusInput } from "../../presets/CodeFocus/CodeFocus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: CodeFocusInput };

const BADGE_TOP = 44;
const BADGE_WIDTH = 156;
const HIGHLIGHT_CUE = 43;
const HIGHLIGHT_STEP = 38;
const HIGHLIGHT_FRAMES = 13;

/**
 * The fractional line the highlight sits on at `frame`, easing between authored
 * lines.
 */
function useHighlightLine(highlight: readonly number[], frame: number): number {
  const motion = useGraphicMotion();
  return highlight.slice(1).reduce((offset, lineIndex, index) => {
    return (
      offset +
      ramp(
        frame,
        HIGHLIGHT_CUE + index * HIGHLIGHT_STEP,
        motion.scale(HIGHLIGHT_FRAMES),
        motion.travel.easing,
      ) *
        (lineIndex - highlight[index])
    );
  }, highlight[0]);
}

function _buildKeyedCodeLines(lines: CodeFocusInput["lines"]) {
  const lineSignatureCounts = new Map<string, number>();
  return lines.map((codeTokens, lineNumber) => {
    const signature = codeTokens
      .map((token) => {
        return `${token.color}:${token.text}`;
      })
      .join("|");
    const occurrence = lineSignatureCounts.get(signature) ?? 0;
    lineSignatureCounts.set(signature, occurrence + 1);
    return { key: `${signature}#${occurrence}`, codeTokens, lineNumber };
  });
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
        {_buildKeyedCodeLines(input.lines).map(
          ({ key, codeTokens, lineNumber }) => {
            return (
              <CodeLineRow
                key={key}
                codeTokens={codeTokens}
                index={lineNumber}
                accent={accent}
              />
            );
          },
        )}
        <CodeFooter footer={input.footer} accent={accent} />
      </CodeWindow>
    </g>
  );
}
