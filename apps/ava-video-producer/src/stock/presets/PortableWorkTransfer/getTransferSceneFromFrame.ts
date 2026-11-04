import { EASE, mix, ramp } from "../../../motion";
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
}: Readonly<{ frame: number; input: Input }>): GetTransferSceneFromFrameResult {
  const travel = ramp(frame, 93, 22, EASE.inOut);
  const folioX = mix(travel, 350, 640);
  const opening =
    input.transferState === "accepted" ? ramp(frame, 115, 9, EASE.inOut) : 0;
  const copies = input.artifacts.map((artifact, index) => {
    const packing = ramp(
      frame,
      43 + (index * 36) / input.artifacts.length,
      12,
      EASE.inOut,
    );
    const placement =
      input.transferState === "accepted"
        ? ramp(
            frame,
            124 + (index * 6) / input.artifacts.length,
            6 / input.artifacts.length,
            EASE.inOut,
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
