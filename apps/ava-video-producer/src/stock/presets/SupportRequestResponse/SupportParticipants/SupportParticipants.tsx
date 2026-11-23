import { Motion } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ColleagueBodyAndHead } from "./ColleagueBodyAndHead";
import { ColleagueHands } from "./ColleagueHands";
import { JoiningChairAndColleagueCaption } from "./JoiningChairAndColleagueCaption";
import type { Input } from "../SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

type ColleagueXOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  join: number;
};

type ColleagueXResult = {
  colleagueX: number;
  chairX: number;
  grab: number;
  reach: number;
  handX: number;
};

type GetColleagueJoinPoseOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GetColleagueJoinPoseResult = {
  colleagueX: ColleagueXResult["colleagueX"];
  chairX: ColleagueXResult["chairX"];
  handX: ColleagueXResult["handX"];
  handY: number;
};

/**
 * Samples the support participants colleague xstate for the current authored
 * frame.
 */
function _getSupportParticipantsColleagueXState({
  input,
  frame,
  motion,
  join,
}: Readonly<ColleagueXOptions>): ColleagueXResult {
  const colleagueX = Motion.mix({
    t: join,
    from: 780,
    to: 670,
  });
  const chairX = Motion.mix({
    t: join,
    from: 780,
    to: 650,
  });
  const grab =
    input.response.state === "joins"
      ? motion.ramp(frame, 89, motion.whip, motion.travel.easing)
      : 0;
  const reach =
    input.response.state === "joins"
      ? motion.ramp(frame, 117, motion.sheet, motion.travel.easing)
      : 0;
  const handX = Motion.mix({
    t: reach,
    from: Motion.mix({
      t: grab,
      from: 760,
      to: chairX + 55,
    }),
    to: 570,
  });
  return { colleagueX, chairX, grab, reach, handX };
}

/** Samples the colleague join pose for the current authored frame. */
function _getColleagueJoinPose({
  input,
  frame,
  motion,
}: Readonly<GetColleagueJoinPoseOptions>): GetColleagueJoinPoseResult {
  const join =
    input.response.state === "joins"
      ? motion.ramp(frame, 97, motion.scale(20), motion.travel.easing)
      : 0;
  const { colleagueX, chairX, grab, reach, handX } =
    _getSupportParticipantsColleagueXState({ input, frame, motion, join });
  const handY = Motion.mix({
    t: reach,
    from: Motion.mix({
      t: grab,
      from: 345,
      to: 375,
    }),
    to: 365,
  });
  return { colleagueX, chairX, handX, handY };
}

/**
 * Only accepting the request moves a chair and colleague to the shared task.
 */
export function SupportParticipants({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { colleagueX, chairX, handX, handY } = _getColleagueJoinPose({
    input,
    frame,
    motion,
  });
  const drawing = {
    frame,
    tokens,
    motion,
    colleagueX,
    input,
    scales,
    handX,
    handY,
    chairX,
  };
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <PersonGlyph x={240} y={330} size={76} posture="seated" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M240 330 L330 365" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <ColleagueBodyAndHead {...drawing} />
      <ColleagueHands {...drawing} />
      <JoiningChairAndColleagueCaption {...drawing} />
    </g>
  );
}
