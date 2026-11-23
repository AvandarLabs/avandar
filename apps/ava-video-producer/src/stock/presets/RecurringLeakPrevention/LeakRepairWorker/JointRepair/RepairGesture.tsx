import { ReplacementSeal } from "../ReplacementSeal";
import { TighteningTool } from "../TighteningTool";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type ParentProps = { input: Input; accent: string };

type GetLeakRepairWorkerRepairStateResult = {
  repair: number;
  trayX: GetLeakRepairWorkerTrayXStateResult["trayX"];
  intervention: GetLeakRepairWorkerTrayXStateResult["intervention"];
  handX: GetLeakRepairWorkerTrayXStateResult["handX"];
  handY: GetLeakRepairWorkerTrayXStateResult["handY"];
};

type GetLeakRepairWorkerTrayXStateResult = {
  trayX: number;
  intervention: number;
  handX: number;
  handY: number;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  intervention: GetLeakRepairWorkerRepairStateResult["intervention"];
};

/** Renders the repair gesture in authored paint order. */
export function RepairGesture({
  input,
  accent,
  tokens,
  scales,
  intervention,
}: Readonly<Props>): ReactNode {
  return input.repair.gesture === "tighten" ? (
    <TighteningTool
      accent={accent}
      tokens={tokens}
      scales={scales}
      intervention={intervention}
    />
  ) : (
    <ReplacementSeal
      accent={accent}
      tokens={tokens}
      scales={scales}
      intervention={intervention}
    />
  );
}
