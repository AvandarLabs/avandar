import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PortableWorkTransfer.schema";

/** Data for getTransferSceneFromFrame. */
type GetTransferSceneFromFrameResult = {
  folioX: number;
  opening: number;
  copies: Array<{
    artifact: {
      id: string;
      label: string;
      kind: "note" | "sheet" | "chart";
    };
    x: number;
    y: number;
    packing: number;
  }>;
  hand: {
    x: number;
    y: number;
  };
  ownerX: number;
  ownerY: number;
  isPacking: boolean;
};

type ActiveIndexOptions = {
  frame: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["frame"];
  input: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"];
};

type ActiveIndexResult = {
  activeIndex: number;
  isPacking: boolean;
  isUnloading: boolean;
  unloadingIndex: number;
};

type TravelOptions = {
  frame: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["frame"];
  input: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"];
  motion: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["motion"];
};

type TravelResult = {
  travel: number;
  folioX: number;
  opening: number;
};

type GetArtifactPackingGeometryOptions = {
  folioX: TravelResult["folioX"];
  artifact: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"]["artifacts"][number];
  index: number;
  packing: number;
  placement: number;
};

type GetTransferSceneFromFrameCopiesOptions = {
  frame: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["frame"];
  input: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"];
  motion: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["motion"];
  folioX: TravelResult["folioX"];
};

/** Samples the artifact packing geometry for the current authored frame. */
function _getArtifactPackingGeometry({
  folioX,
  artifact,
  index,
  packing,
  placement,
}: Readonly<GetArtifactPackingGeometryOptions>): {
  artifact: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"]["artifacts"][number];
  x: number;
  y: number;
  packing: number;
} {
  return {
    artifact,
    x: Motion.mix({
      t: placement,
      from: Motion.mix({
        t: packing,
        from: 50,
        to: folioX + 12,
      }),
      to: 350,
    }),
    y: 210 + index * 86,
    packing,
  };
}

/**
 * Samples the transfer scene from frame copies for the current authored frame.
 */
function _getTransferSceneFromFrameCopies({
  frame,
  input,
  motion,
  folioX,
}: Readonly<GetTransferSceneFromFrameCopiesOptions>): Array<{
  artifact: Readonly<{
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"]["artifacts"][number];
  x: number;
  y: number;
  packing: number;
}> {
  return input.artifacts.map((artifact, index) => {
    const packing = motion.ramp(
      frame,
      43 + (index * motion.scaleStagger(36)) / input.artifacts.length,
      motion.scale(12),
      motion.travel.easing,
    );
    const placement =
      input.transferState === "accepted"
        ? motion.ramp(
            frame,
            124 + (index * motion.scaleStagger(6)) / input.artifacts.length,
            motion.scale(6) / input.artifacts.length,
            motion.travel.easing,
          )
        : 0;
    return _getArtifactPackingGeometry({
      folioX,
      artifact,
      index,
      packing,
      placement,
    });
  });
}

/**
 * Samples the transfer scene from frame travel state for the current authored
 * frame.
 */
function _getTransferSceneFromFrameTravelState({
  frame,
  input,
  motion,
}: Readonly<TravelOptions>): TravelResult {
  const travel = motion.ramp(frame, 93, motion.scale(22), motion.travel.easing);
  const folioX = Motion.mix({
    t: travel,
    from: 350,
    to: 640,
  });
  const opening =
    input.transferState === "accepted"
      ? motion.ramp(frame, 115, motion.panel, motion.travel.easing)
      : 0;
  return { travel, folioX, opening };
}

/**
 * Samples the transfer scene from frame active index state for the current
 * authored frame.
 */
function _getTransferSceneFromFrameActiveIndexState({
  frame,
  input,
}: Readonly<ActiveIndexOptions>): ActiveIndexResult {
  const activeIndex = Math.min(
    input.artifacts.length - 1,
    Math.max(0, Math.floor((frame - 43) / (36 / input.artifacts.length))),
  );
  const isPacking = frame >= 43 && frame < 92;
  const isUnloading =
    input.transferState === "accepted" && frame >= 124 && frame < 130;
  const unloadingIndex = Math.min(
    input.artifacts.length - 1,
    Math.floor(((frame - 124) * input.artifacts.length) / 6),
  );
  return { activeIndex, isPacking, isUnloading, unloadingIndex };
}

/** Rigid folio travel, staggered copies and accepted-only opening. */
export function getTransferSceneFromFrame({
  frame,
  input,
  motion,
}: Readonly<{
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): GetTransferSceneFromFrameResult {
  const { travel, folioX, opening } = _getTransferSceneFromFrameTravelState({
    frame,
    input,
    motion,
  });
  const copies = _getTransferSceneFromFrameCopies({
    frame,
    input,
    motion,
    folioX,
  });
  const { activeIndex, isPacking, isUnloading, unloadingIndex } =
    _getTransferSceneFromFrameActiveIndexState({ frame, input });
  const handledCopy = copies[isUnloading ? unloadingIndex : activeIndex];
  const hand =
    isPacking || isUnloading
      ? { x: handledCopy.x + 120, y: handledCopy.y }
      : { x: folioX + 125, y: 195 };
  return {
    folioX,
    opening,
    copies,
    hand,
    ownerX: folioX - 20,
    ownerY: 160,
    isPacking,
  };
}
