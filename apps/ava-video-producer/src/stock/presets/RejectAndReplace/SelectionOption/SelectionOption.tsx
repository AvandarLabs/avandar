import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SelectionOptionOption } from "./SelectionOptionOption";
import type { Input } from "../RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  isReplacement: boolean;
};

type EntryOptions = {
  frame: Readonly<Props>["frame"];
  isReplacement: Readonly<Props>["isReplacement"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GetSelectionOptionEntryStateResult = {
  entry: number;
  x: number;
  width: number;
};

/** Samples the selection option entry state for the current authored frame. */
function _getSelectionOptionEntryState({
  frame,
  isReplacement,
  motion,
}: Readonly<EntryOptions>): GetSelectionOptionEntryStateResult {
  const move = motion.ramp(frame, 48, motion.scale(30), motion.travel.easing);
  const entry = motion.ramp(
    frame,
    isReplacement ? 78 : 12,
    motion.scale(isReplacement ? 30 : 18),
    motion.travel.easing,
  );
  const x = isReplacement
    ? Motion.mix({
        t: entry,
        from: 1000,
        to: 480,
      })
    : Motion.mix({
        t: move,
        from: 480,
        to: 156,
      });
  const width = isReplacement
    ? 320
    : Motion.mix({
        t: move,
        from: 320,
        to: 296,
      });
  return { entry, x, width };
}

/**
 * One option retains a legible rationale as the shared selection role changes.
 */
export function SelectionOption({
  frame,
  input,
  accent,
  isReplacement,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { entry, x, width } = _getSelectionOptionEntryState({
    frame,
    isReplacement,
    motion,
  });
  const panel = {
    x: -width / 2,
    y: 210,
    width,
    height: 304,
    rx: scales.corner(tokens.corner.panel),
  };
  return (
    <SelectionOptionOption
      frame={frame}
      input={input}
      accent={accent}
      isReplacement={isReplacement}
      tokens={tokens}
      entry={entry}
      x={x}
      panel={panel}
    />
  );
}
