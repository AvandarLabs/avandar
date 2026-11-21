import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the artifact heading and guide in authored paint order. */
export function ArtifactHeadingAndGuide(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.artifactLabel}
        x={80}
        y={76}
        width={800}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <SketchedShape
        shape={{ kind: "path", d: "M100 330 H860" }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.line}
        strokeDasharray={options.atomic.dash.airy.join(" ")}
      />
    </>
  );
}
