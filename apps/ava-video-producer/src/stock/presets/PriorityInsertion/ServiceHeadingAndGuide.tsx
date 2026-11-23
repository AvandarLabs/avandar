import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the service heading and guide in authored paint order. */
export function ServiceHeadingAndGuide(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.serviceLabel}
        x={100}
        y={108}
        width={400}
        fontSize={20}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={options.accent}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M80 160 l-6 10 M80 160 l6 10 M80 160 V532",
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.accent}
        fill="none"
      />
    </>
  );
}
