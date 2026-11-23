import { Motion } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { JointRepair } from "./JointRepair/JointRepair";
import { RepairHandAndTray } from "./RepairHandAndTray";
import type { Input } from "../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

type TrayXOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  containment: number;
  repair: number;
};

type TrayXResult = {
  trayX: number;
  intervention: number;
  handX: number;
  handY: number;
};

type RepairOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type RepairResult = {
  repair: number;
  trayX: TrayXResult["trayX"];
  intervention: TrayXResult["intervention"];
  handX: TrayXResult["handX"];
  handY: TrayXResult["handY"];
};

/**
 * Samples the leak repair worker tray xstate for the current authored frame.
 */
function _getLeakRepairWorkerTrayXState({
  input,
  frame,
  motion,
  containment,
  repair,
}: Readonly<TrayXOptions>): TrayXResult {
  const trayX = Motion.mix({
    t: containment,
    from: 220,
    to: 480,
  });
  const intervention = motion.ramp(
    frame,
    81,
    motion.scale(25),
    motion.travel.easing,
  );
  const repairX =
    input.repair.gesture === "replace-seal"
      ? Motion.mix({
          t: intervention,
          from: 439,
          to: 480,
        })
      : 480;
  const handX = Motion.mix({
    t: repair,
    from: trayX,
    to: repairX,
  });
  const handY = Motion.mix({
    t: repair,
    from: 430,
    to: 260,
  });
  return { trayX, intervention, handX, handY };
}

/**
 * Samples the leak repair worker repair state for the current authored frame.
 */
function _getLeakRepairWorkerRepairState({
  input,
  frame,
  motion,
}: Readonly<RepairOptions>): RepairResult {
  const containment = motion.ramp(
    frame,
    39,
    motion.scale(23),
    motion.travel.easing,
  );
  const repair = motion.ramp(frame, 63, motion.hero, motion.travel.easing);
  const { trayX, intervention, handX, handY } = _getLeakRepairWorkerTrayXState({
    input,
    frame,
    motion,
    containment,
    repair,
  });
  return { repair, trayX, intervention, handX, handY };
}

/** The worker carries the catch tray and then physically handles the joint. */
export function LeakRepairWorker({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { repair, trayX, intervention, handX, handY } =
    _getLeakRepairWorkerRepairState({ input, frame, motion });
  return (
    <g opacity={motion.reveal(frame, 14)}>
      <PersonGlyph x={175} y={370} size={80} role="worker" color={accent} />
      <SketchedShape
        shape={{ kind: "path", d: `M175 370 L${handX} ${handY}` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
        fill="none"
      />
      <RepairHandAndTray
        frame={frame}
        accent={accent}
        tokens={tokens}
        motion={motion}
        scales={scales}
        trayX={trayX}
        handX={handX}
        handY={handY}
      />
      <JointRepair
        input={input}
        frame={frame}
        accent={accent}
        tokens={tokens}
        motion={motion}
        scales={scales}
        intervention={intervention}
      />
    </g>
  );
}
