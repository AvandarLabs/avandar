import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  accent: string;
};

type Props = {
  group: Readonly<ParentProps>["group"];
  x: Readonly<ParentProps>["x"];
  y: Readonly<ParentProps>["y"];
  isPair: Readonly<ParentProps>["isPair"];
  progress: Readonly<ParentProps>["progress"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the candidate group bracket in authored paint order. */
export function CandidateGroupBracket(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x - 6} ${options.y - 65}v-8h${Motion.mix({
            t: options.isPair ? options.progress : 0,
            from: 432,
            to: 904,
          })}v8`,
        }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.tokens.color.line}
      />
      <FitText
        text={options.group.label}
        x={options.x}
        y={options.y - 50}
        width={416}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
