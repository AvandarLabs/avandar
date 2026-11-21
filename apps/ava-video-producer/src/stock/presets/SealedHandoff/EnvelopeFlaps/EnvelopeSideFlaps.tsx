import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { EnvelopeCover } from "../EnvelopeCover";
import { FinalFlap } from "./FinalFlap";
import { FlapCreases } from "./FlapCreases";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SealedHandoff.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  accent: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  sides: number;
  final: number;
  opening: number;
};

/** Renders the envelope side flaps in authored paint order. */
export function EnvelopeSideFlaps(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M0 0 L${Motion.mix({
            t: options.sides * (1 - options.opening),
            from: -36,
            to: 268,
          })} 133 L0 266 z M536 0 L${Motion.mix({
            t: options.sides * (1 - options.opening),
            from: 572,
            to: 268,
          })} 133 L536 266 z`,
        }}
        profile={options.tokens.sketch.shape}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      {options.frame >= 66 ? (
        <EnvelopeCover opening={options.opening} />
      ) : undefined}
      {options.frame >= 56 ? (
        <FinalFlap
          fold={options.final * (1 - options.opening)}
          accent={options.accent}
        />
      ) : undefined}
      {options.frame >= 66 && options.opening === 0 ? (
        <FlapCreases />
      ) : undefined}
    </>
  );
}
