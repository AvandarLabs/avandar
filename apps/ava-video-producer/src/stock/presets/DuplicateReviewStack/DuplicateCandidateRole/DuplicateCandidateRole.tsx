import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CandidateRoleCaption } from "./CandidateRoleCaption";
import type { Input } from "../DuplicateReviewStack.schema";
import type { getDuplicateCardLayoutFromGroupAndFrame } from "../getDuplicateCardLayoutFromGroupAndFrame";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  layout: ReturnType<typeof getDuplicateCardLayoutFromGroupAndFrame>;
  accent: string;
};

/** Each comparison card owns its role in a reserved three-line caption slot. */
export function DuplicateCandidateRole({
  frame,
  input,
  group,
  layout,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  if (
    input.finalView !== "comparison-pair" ||
    group.retainedId === null ||
    frame <= 90
  ) {
    return null;
  }
  const { x, y, width, height, isRetained } = layout;
  const color = isRetained ? accent : tokens.color.textMuted;
  return (
    <CandidateRoleCaption
      frame={frame}
      input={input}
      tokens={tokens}
      motion={motion}
      x={x}
      y={y}
      width={width}
      height={height}
      isRetained={isRetained}
      color={color}
    />
  );
}
