import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as PremiseSupportSharedProps } from "./PremiseSupportShared.types";
import type { ReactNode } from "react";

type Props = Pick<
  PremiseSupportSharedProps,
  "joining" | "center" | "accent" | "premise"
> & {
  dash: string | undefined;
  width: number;
};
/** The premise's own centre post, rising to the deck. */
export function SupportPost({
  joining,
  center,
  accent,
  premise,
  dash,
  width,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-individual-support={premise.id}>
      <SketchedShape
        shape={{
          kind: "line",
          x1: center,
          y1: 390,
          x2: center,
          y2: Motion.mix({
            t: joining,
            from: 390,
            to: 350,
          }),
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={width}
        strokeDasharray={dash}
      />
    </g>
  );
}
