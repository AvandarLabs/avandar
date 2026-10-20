import { StockRect } from "../primitives/StockRect/StockRect";
import { EASE, ramp } from "../../motion";
import {
  Eyebrow,
  Pill,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { CodeWindow } from "./CodeWindow";
import type { CodeFocusInput } from "../presets/CodeFocus/CodeFocus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: CodeFocusInput };

/** Draws the bounded authored code-focus study at an explicit frame. */
export function CodeFocus({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const lines = input.lines;
  const line = input.highlight
    .slice(1)
    .reduce(
      (offset, lineIndex, index) =>
        offset +
        ramp(frame, 43 + index * 38, 13, EASE.inOut) *
          (lineIndex - input.highlight[index]),
      input.highlight[0],
    );
  const y = 189 + line * 46;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].codeFocus,
        })}
      </Eyebrow>
      <Pill
        x={740}
        y={44}
        width={156}
        text={getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["code-focus"].exampleCode,
        })}
        color={accent}
      />
      <CodeWindow title={input.title}>
        {input.showHighlight ? (
          <>
            <StockRect
              x={84}
              y={y - 23}
              width={792}
              height={40}
              rx={7}
              fill={accent}
              fillOpacity={0.065}
            />
            <StockRect
              x={84}
              y={y - 23}
              width={3}
              height={40}
              rx={1.5}
              fill={accent}
            />
          </>
        ) : null}
        {lines.map((tokens, i) => (
          <g key={i}>
            <Text
              x={111}
              y={189 + i * 46}
              size={17}
              fill={STOCK.muted}
              mono
              anchor="end"
            >
              {i + 1}
            </Text>
            <text
              x={144}
              y={189 + i * 46}
              fontSize={21}
              fontFamily="'Courier New', monospace"
              xmlSpace="preserve"
            >
              {tokens.map((token, j) => (
                <tspan
                  key={j}
                  fill={token.color === STOCK.mint ? accent : token.color}
                >
                  {token.text}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <path d="M84 478 H876" stroke={STOCK.line} />
        <circle cx={107} cy={500} r={3.5} fill={accent} />
        <Text x={122} y={505} size={13} mono fill={STOCK.muted}>
          {input.footer}
        </Text>
      </CodeWindow>
    </g>
  );
}
