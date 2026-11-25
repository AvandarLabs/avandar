import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./RetailShelfReplenishment.schema";

type GetUnitOwnerOptions = {
  isSelected: boolean;
  purchase: number;
  isIncoming: boolean;
  load: number;
};

type Unit = {
  goodIndex: number;
  unitIndex: number;
  incomingIndex: number;
  selectedIndex: number;
  input: Input;
  frame: number;
  motion: VideoMotion;
};

type PurchaseOptions = {
  unitIndex: Readonly<Unit>["unitIndex"];
  selectedIndex: Readonly<Unit>["selectedIndex"];
  frame: Readonly<Unit>["frame"];
  motion: Readonly<Unit>["motion"];
  good: Readonly<Unit>["input"]["goods"][number];
  shelf: { x: number; y: number };
  trolley: ReturnType<typeof _getTrolleyPoint>;
  load: number;
};

type PurchaseResult = {
  purchase: number;
  isIncoming: boolean;
  isSelected: boolean;
  restocked: { x: number; y: number };
};

type GetShelfUnitPurchasePoseOptions = {
  unitIndex: Readonly<Unit>["unitIndex"];
  selectedIndex: Readonly<Unit>["selectedIndex"];
  frame: Readonly<Unit>["frame"];
  motion: Readonly<Unit>["motion"];
  good: Readonly<Unit>["input"]["goods"][number];
  shelf: { x: number; y: number };
  trolley: ReturnType<typeof _getTrolleyPoint>;
  load: number;
};

type GetShelfUnitPurchasePoseResult = {
  purchase: PurchaseResult["purchase"];
  isIncoming: PurchaseResult["isIncoming"];
  isSelected: PurchaseResult["isSelected"];
  position: { x: number; y: number } | PurchaseResult["restocked"];
};

/**
 * Samples the shelf unit pose from input and frame purchase state for the
 * current authored frame.
 */
function _getShelfUnitPoseFromInputAndFramePurchaseState({
  unitIndex,
  selectedIndex,
  frame,
  motion,
  good,
  shelf,
  trolley,
  load,
}: Readonly<PurchaseOptions>): PurchaseResult {
  const purchase = motion.ramp(
    frame,
    96 + selectedIndex * motion.scaleStagger(8),
    motion.whip,
    motion.travel.easing,
  );
  const isIncoming = unitIndex >= good.openingUnits;
  const isSelected = unitIndex < good.selectedUnits;
  const restocked = isIncoming
    ? {
        x: Motion.mix({
          t: load,
          from: trolley.x,
          to: shelf.x,
        }),
        y:
          Motion.mix({
            t: load,
            from: trolley.y,
            to: shelf.y,
          }) -
          Math.sin(load * Math.PI) * 28,
      }
    : shelf;
  return { purchase, isIncoming, isSelected, restocked };
}

/** Samples the shelf unit purchase pose for the current authored frame. */
function _getShelfUnitPurchasePose({
  unitIndex,
  selectedIndex,
  frame,
  motion,
  good,
  shelf,
  trolley,
  load,
}: Readonly<GetShelfUnitPurchasePoseOptions>): GetShelfUnitPurchasePoseResult {
  const { purchase, isIncoming, isSelected, restocked } =
    _getShelfUnitPoseFromInputAndFramePurchaseState({
      unitIndex,
      selectedIndex,
      frame,
      motion,
      good,
      shelf,
      trolley,
      load,
    });
  const position = isSelected
    ? {
        x: Motion.mix({
          t: purchase,
          from: restocked.x,
          to: 720 + selectedIndex * 40,
        }),
        y:
          Motion.mix({
            t: purchase,
            from: restocked.y,
            to: 476,
          }) -
          Math.sin(purchase * Math.PI) * 24,
      }
    : restocked;
  return { purchase, isIncoming, isSelected, position };
}

/** Who holds a unit: the shelf, the trolley, a hand, or the basket. */
function _getUnitOwner({
  isSelected,
  purchase,
  isIncoming,
  load,
}: Readonly<GetUnitOwnerOptions>): string {
  return isSelected && purchase > 0
    ? purchase === 1
      ? "basket"
      : "shopper-hand"
    : isIncoming && load < 1
      ? load === 0
        ? "trolley"
        : "retailer-hand"
      : "shelf";
}

/** A unit's place on the trolley as it arrives with its load. */
function _getTrolleyPoint({
  frame,
  incomingIndex,
  motion,
}: Readonly<{
  frame: number;
  incomingIndex: number;
  motion: VideoMotion;
}>) {
  const arrival = motion.ramp(frame, 38, motion.hero, motion.travel.easing);
  return {
    x:
      698 +
      (incomingIndex % 3) * 36 +
      Motion.mix({
        t: arrival,
        from: 100,
        to: 0,
      }),
    y: 370 + Math.floor(incomingIndex / 3) * 36,
  };
}

/** One conserved physical unit's position, owner and handling actor. */
export function getShelfUnitPoseFromInputAndFrame({
  goodIndex,
  unitIndex,
  incomingIndex,
  selectedIndex,
  input,
  frame,
  motion,
}: Readonly<Unit>): {
  owner: string;
  x: number;
  y: number;
} {
  const good = input.goods[goodIndex];
  const shelf = { x: 180 + unitIndex * 56, y: 200 + goodIndex * 105 };
  const trolley = _getTrolleyPoint({ frame, incomingIndex, motion });
  const load = motion.ramp(
    frame,
    58 + incomingIndex * motion.scaleStagger(5),
    motion.scale(5),
    motion.travel.easing,
  );
  const { purchase, isIncoming, isSelected, position } =
    _getShelfUnitPurchasePose({
      unitIndex,
      selectedIndex,
      frame,
      motion,
      good,
      shelf,
      trolley,
      load,
    });
  return {
    ...position,
    owner: _getUnitOwner({ isSelected, purchase, isIncoming, load }),
  };
}
