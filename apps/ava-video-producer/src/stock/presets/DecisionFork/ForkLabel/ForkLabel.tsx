import { Text } from "../../../graphics-common/Text";
import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

const GRAPHEME_SEGMENTER: Intl.Segmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
type Props = {
  text: string;
  x: number;
  y: number;
  /**
   * The decision type role; `size` overrides its size, for example in width
   * tests.
   */
  role?: "choice" | "question";
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
function _wrap({
  text,
  width,
  fontSize,
}: Readonly<{ text: string; width: number; fontSize: number }>): string[] {
  const tokens = text.match(/\S+\s*|\s+/g) ?? [""];
  return tokens.reduce<string[]>((result, token) => {
    return getConservativeWidthFromText({ text: token.trimEnd(), fontSize }) >
      width
      ? Array.from(GRAPHEME_SEGMENTER.segment(token)).reduce(
          (chunks, { segment }) => {
            return _append({
              lines: chunks,
              text: segment,
              width,
              size: fontSize,
            });
          },
          result,
        )
      : _append({ lines: result, text: token, width, size: fontSize });
  }, []);
}
/** Stable, bounded SVG lines preserve every authored character. */
export function ForkLabel({
  text,
  x,
  y,
  role = "choice",
  size,
  width = 168,
  fill,
}: Readonly<Props>): ReactNode {
  const roleStyle = GraphicThemeHooks.useGraphicTokens().text.graphic[role];
  const fontSize = size ?? roleStyle.fontSize;
  const { lineGap } = GraphicThemeHooks.useGraphicProps("DecisionFork", {});
  const lines = _wrap({ text, width, fontSize });
  return (
    <g aria-label={text}>
      {lines.map((line, index) => {
        return (
          // prettier-ignore
          // Wrapped text uses fixed line slots within one fork
          // label. Duplicate lines carry no independent state.
          // react-doctor-disable-next-line no-array-index-as-key
          <Text key={index}
            role={role}
            x={x}
            y={y + index * (fontSize + lineGap)}
            fittedSize={fontSize}
            anchor="middle"
            fill={fill}
          >
            {line}
          </Text>
        );
      })}
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
