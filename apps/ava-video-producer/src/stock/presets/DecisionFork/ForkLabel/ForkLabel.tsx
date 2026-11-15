import { STOCK, Text } from "../../../graphics-common";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import type { ReactNode } from "react";

const GRAPHEME_SEGMENTER: Intl.Segmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});

type Props = {
  text: string;
  x: number;
  y: number;
  size?: number;
  width?: number;
  fill?: string;
};

function _append({ lines, text, width, size }: AppendOptions): string[] {
  const candidate = `${lines.at(-1) ?? ""}${text}`;
  return lines.length &&
    getConservativeWidthFromText({
      text: candidate.trimEnd(),
      fontSize: size,
    }) <= width
    ? [...lines.slice(0, -1), candidate]
    : [...lines, text];
}

/** Stable, bounded SVG lines preserve every authored character. */
export function ForkLabel({
  text,
  x,
  y,
  size = 17,
  width = 168,
  fill = STOCK.text,
}: Readonly<Props>): ReactNode {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [""];
  const lines = tokens.reduce<string[]>((result, token) => {
    return getConservativeWidthFromText({
      text: token.trimEnd(),
      fontSize: size,
    }) > width
      ? Array.from(GRAPHEME_SEGMENTER.segment(token)).reduce(
          (chunks, { segment }) =>
            _append({ lines: chunks, text: segment, width, size }),
          result,
        )
      : _append({ lines: result, text: token, width, size });
  }, []);
  return (
    <g aria-label={text}>
      {lines.map((line, index) => (
        <Text
          key={index}
          x={x}
          y={y + index * (size + 4)}
          size={size}
          anchor="middle"
          fill={fill}
        >
          {line}
        </Text>
      ))}
    </g>
  );
}
/** Inputs for append. */
type AppendOptions = {
  lines: readonly string[];
  text: string;
  width: number;
  size: number;
};
