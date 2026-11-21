import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CarbonCaptureEquipment } from "./CarbonCaptureEquipment/CarbonCaptureEquipment";
import { CarbonOperator } from "./CarbonOperator";
import { CarbonPhysicalLabels } from "./CarbonPhysicalLabels";
import { CarbonStorageVessel } from "./CarbonStorageVessel/CarbonStorageVessel";
import { CarbonTransferRibbons } from "./CarbonTransferRibbons/CarbonTransferRibbons";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/** An operator cues separate retained and released physical CO2 ribbons. */
export function CarbonPhysical({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const transfer = motion.ramp(
    frame,
    60,
    motion.scale(48),
    motion.travel.easing,
  );
  const retained =
    input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
  const retainedShare = retained / input.capture.capturedTonnesCO2;
  return (
    <g data-retained={retained}>
      <CarbonCaptureEquipment {...{ accent, atomic, tokens, scales }} />
      <CarbonTransferRibbons
        {...{ input, accent, tokens, scales, transfer, retained }}
        retainedShare={retainedShare}
      />
      <CarbonStorageVessel
        {...{ input, accent, tokens, scales, transfer, retainedShare }}
      />
      <CarbonOperator frame={frame} /> <CarbonPhysicalLabels input={input} />
    </g>
  );
}
