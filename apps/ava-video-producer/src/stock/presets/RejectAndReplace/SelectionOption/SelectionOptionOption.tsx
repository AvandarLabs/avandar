import { StockRect } from "../../../primitives/StockRect";
import { SelectionCopy } from "../SelectionCopy";
import { SelectionMarker } from "../SelectionMarker/SelectionMarker";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RejectAndReplace.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  accent: string;
  isReplacement: boolean;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  isReplacement: Readonly<ParentProps>["isReplacement"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  entry: number;
  x: number;
  panel: { x: number; y: number; width: number; height: number; rx: number };
};

/** Renders the selection option option in authored paint order. */
export function SelectionOptionOption(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-option={options.isReplacement ? "replacement" : "rejected"}
      opacity={options.entry}
      transform={`translate(${options.x} 0)`}
    >
      <StockRect
        {...options.panel}
        fill={options.tokens.color.surface}
        stroke={
          options.isReplacement ? options.accent : options.tokens.color.line
        }
      />
      <SelectionMarker
        {...{
          frame: options.frame,
          accent: options.accent,
          isReplacement: options.isReplacement,
        }}
        rejectionMark={options.input.rejectionMark}
      />
      <SelectionCopy
        {...{
          frame: options.frame,
          input: options.input,
          isReplacement: options.isReplacement,
        }}
      />
    </g>
  );
}
