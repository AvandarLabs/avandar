import { SketchedShape } from "../../../primitives/SketchedShape";
import { JournalEntryText } from "../JournalEntryText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getJournalGeometryFromFrame } from "../getJournalGeometryFromFrame";
import type { Input } from "../JournalReceipts.schema";
import type { ReactNode } from "react";

type ParentProps = {
  entry: Input["entries"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  entry: Readonly<ParentProps>["entry"];
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  closing: number;
  rise: number;
  horizontal: boolean;
  width: ReturnType<typeof getJournalGeometryFromFrame>["width"];
  height: ReturnType<typeof getJournalGeometryFromFrame>["height"];
};

/** Renders the journal fold face in authored paint order. */
export function JournalFoldFace(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 0 h${options.width} v${options.height} h-${options.width} z`,
        }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      <g data-fold-face={options.entry.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: options.horizontal
              ? `M0 0 l12 ${-options.rise} h${options.width - 24} l12 ${options.rise} z`
              : `M0 0 l${-options.rise} 10 v${options.height - 20} l${options.rise} 10 z`,
          }}
          profile={options.tokens.sketch.shape}
          fill={options.tokens.color.elevated}
          stroke={
            options.closing === 1
              ? options.accent
              : options.tokens.color.highlight
          }
        />
      </g>
      <JournalEntryText
        {...{
          entry: options.entry,
          input: options.input,
          frame: options.frame,
        }}
      />
    </>
  );
}
