import { AquiferCutawayFlowGuide } from "../AquiferCutawayFlowGuide/AquiferCutawayFlowGuide";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { AquiferCutawayDrawOnLengthValue } from "../AquiferCutaway";
import type { ReactNode } from "react";

type Props = {
  paths: Array<
    | {
        key: string;
        number: number;
        x: number;
        y: number;
        path: string;
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["flows"]["rechargeM3"];
        color: string;
      }
    | {
        key: string;
        number: number;
        x: number;
        y: number;
        path: string;
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["flows"]["approvedWithdrawalM3"];
        color: ReturnType<
          typeof GraphicThemeHooks.useGraphicTokens
        >["color"]["accentAlt"];
      }
    | {
        key: string;
        number: number;
        x: number;
        y: number;
        path: string;
        progress: ReturnType<
          ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
        >;
        value: Input["flows"]["naturalOutflowM3"];
        color: ReturnType<
          typeof GraphicThemeHooks.useGraphicTokens
        >["color"]["highlight"];
      }
  >;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  drawOnLength: AquiferCutawayDrawOnLengthValue;
};

/** Renders the paths layer with authored geometry. */
export function AquiferFlowPaths({
  paths,
  tokens,
  scales,
  atomic,
  drawOnLength: DRAW_ON_LENGTH,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {paths.map(({ key, number, x, y, path, progress, value, color }) => {
        return (
          <AquiferCutawayFlowGuide
            key={key}
            itemKey={key}
            {...{ path, tokens, scales, atomic, value }}
            drawOnLength={DRAW_ON_LENGTH}
            {...{ progress, color, number, x, y }}
          />
        );
      })}
    </>
  );
}
