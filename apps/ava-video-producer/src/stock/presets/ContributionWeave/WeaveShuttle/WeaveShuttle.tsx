import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WeftBandAndCrossings } from "./WeftBandAndCrossings";
import type { Input } from "../ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = {
  contributor: Input["weft"][number];
  index: number;
  input: Input;
  frame: number;
  id: string;
};

type PatternOptions = {
  contributor: Readonly<Props>["contributor"];
  index: Readonly<Props>["index"];
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  id: Readonly<Props>["id"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type PatternResult = {
  pattern: string;
  clipId: string;
  band: { x: number; y: number; width: number; height: number };
  end: { x: number; y: number; width: number; height: number; fill: string };
  label: {
    text: Readonly<Props>["contributor"]["label"];
    x: number;
    y: number;
    width: number;
    fontSize: 12;
    maxLines: number;
    breakLongWords: boolean;
    normalizeWhitespace: boolean;
  };
  crossingProps: {
    row: Readonly<Props>["index"];
    weft: Readonly<Props>["contributor"];
    input: Readonly<Props>["input"];
    id: Readonly<Props>["id"];
    y: number;
  };
};

/** Frames one shuttle pass takes, which also spaces the passes. */
const PASS_FRAMES = 24;

/** Frames a weft band takes to fade in. */
const FADE_FRAMES = 10;

/** Samples the weave shuttle pattern state for the current authored frame. */
function _getWeaveShuttlePatternState({
  contributor,
  index,
  input,
  frame,
  id,
  motion,
}: Readonly<PatternOptions>): PatternResult {
  const y = 240 + (index * 180) / (input.weft.length - 1);
  const progress = Motion.ramp({
    frame,
    at: 36 + index * motion.scale(PASS_FRAMES),
    dur: motion.scale(PASS_FRAMES),
    easing: motion.travel.easing,
  });
  const pattern = `url(#${id}-band-${input.warp.length + index})`;
  const clipId = `${id}-shuttle-${index}`;
  const band = { x: 330, y: y - 24, width: 530 * progress, height: 48 };
  const end = { x: 300, y: y - 24, width: 30, height: 48, fill: pattern };
  const label = {
    text: contributor.label,
    x: 40,
    y: y - 3,
    width: 240,
    fontSize: 12 as const,
    maxLines: 3,
    breakLongWords: true,
    normalizeWhitespace: true,
  };
  const crossingProps = { row: index, weft: contributor, input, id, y };
  return { pattern, clipId, band, end, label, crossingProps };
}

/** A single clipped shuttle pass reveals alternating over-under patches. */
export function WeaveShuttle({
  contributor,
  index,
  input,
  frame,
  id,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { pattern, clipId, band, end, label, crossingProps } =
    _getWeaveShuttlePatternState({
      contributor,
      index,
      input,
      frame,
      id,
      motion,
    });
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: 20 + index * motion.stagger.list,
        dur: motion.scale(FADE_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <WeftBandAndCrossings
        contributor={contributor}
        input={input}
        pattern={pattern}
        clipId={clipId}
        band={band}
        end={end}
        label={label}
        crossingProps={crossingProps}
      />
    </g>
  );
}
