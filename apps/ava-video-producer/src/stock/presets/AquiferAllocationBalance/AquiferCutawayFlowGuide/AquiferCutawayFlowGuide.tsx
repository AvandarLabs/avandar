import { SketchedShape } from "../../../primitives/SketchedShape";
import { AquiferOwnershipKey } from "../AquiferOwnershipKey";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { AquiferCutawayDrawOnLengthValue } from "../AquiferCutaway";
import type { ReactNode } from "react";

type Props = {
  itemKey: Array<
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
  >[number]["key"];
  path: Array<
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
  >[number]["path"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  value: Array<
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
  >[number]["value"];
  drawOnLength: AquiferCutawayDrawOnLengthValue;
  progress: Array<
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
  >[number]["progress"];
  color: Array<
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
  >[number]["color"];
  number: Array<
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
  >[number]["number"];
  x: Array<
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
  >[number]["x"];
  y: Array<
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
  >[number]["y"];
};

/** Renders the flow guide with authored geometry. */
export function AquiferCutawayFlowGuide({
  itemKey: key,
  path,
  tokens,
  scales,
  atomic,
  value,
  drawOnLength: DRAW_ON_LENGTH,
  progress,
  color,
  number,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <g key={key}>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        data-flow-guide={key}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={atomic.dash.short.join(" ")}
        fill="none"
      />
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        data-flow={key}
        data-quantity={value}
        pathLength={DRAW_ON_LENGTH}
        strokeDasharray={DRAW_ON_LENGTH}
        strokeDashoffset={DRAW_ON_LENGTH - progress}
        opacity={value ? 1 : 0}
        stroke={color}
        strokeWidth={scales.stroke(7)}
        fill="none"
      />
      <g data-flow-ownership={key}>
        <AquiferOwnershipKey {...{ number, x, y }} />
      </g>
    </g>
  );
}
