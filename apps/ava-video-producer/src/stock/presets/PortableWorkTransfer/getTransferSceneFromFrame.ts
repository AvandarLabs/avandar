import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./PortableWorkTransfer.schema";
/** Data for getTransferSceneFromFrame. */
type GetTransferSceneFromFrameResult = {
  folioX: number;
  opening: number;
  copies: Array<{
    artifact: { id: string; label: string; kind: "note" | "sheet" | "chart" };
    x: number;
    y: number;
    packing: number;
  }>;
  hand: { x: number; y: number };
  ownerX: number;
  ownerY: number;
  isPacking: boolean;
};

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
  const travel = motion.ramp(frame, 93, motion.scale(22), motion.travel.easing);
  const folioX = mix(travel, 350, 640);
  const opening =
    input.transferState === "accepted"
      ? motion.ramp(frame, 115, motion.panel, motion.travel.easing)
      : 0;
  const copies = input.artifacts.map((artifact, index) => {
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
    return {
      artifact,
      x: mix(placement, mix(packing, 50, folioX + 12), 350),
      y: 210 + index * 86,
      packing,
    };
  });
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
