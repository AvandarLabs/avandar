import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ReadinessLatch.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  participant: Input["participants"][number];
  input: Input;
  state: string;
  horizontal: boolean;
  x: number;
  y: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  participant: Options["participant"];
  input: Options["input"];
  label: {
    text: string;
    x: number;
    y: number;
    width: number;
    maxLines: number;
    anchor: "start" | "middle";
  };
  status: {
    text: string;
    x: number;
    y: number;
    width: number;
    maxLines: number;
    anchor: "start" | "middle";
    color: string;
  };
  unit: { text: string; x: number; y: number; width: number; maxLines: number };
  value: {
    x: number;
    y: number;
    fill: string;
    fontSize: number;
    fontFamily: string;
  };
};

/**
 * Returns participant, readiness status, unit, and value text slots for
 * `ReadinessRibbonLabels`.
 */
export function useReadinessRibbonLabelsPresentation({
  participant,
  input,
  state,
  horizontal,
  x,
  y,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const label = {
    text: participant.label,
    x: horizontal ? 40 : x + 4,
    y: horizontal ? y - 8 : 135,
    width: horizontal ? 230 : 146,
    maxLines: 3,
    anchor: horizontal ? ("start" as const) : ("middle" as const),
  };
  const status = {
    text: state,
    x: horizontal ? 720 : x + 4,
    y: horizontal ? y - 8 : 190,
    width: horizontal ? 210 : 146,
    maxLines: 4,
    anchor: horizontal ? ("start" as const) : ("middle" as const),
    color: tokens.color.highlight,
  };
  const unit = {
    text: input.unitLabel,
    x: horizontal ? 324 : x - 50,
    y: horizontal ? y + 35 : 256,
    width: horizontal ? 280 : 118,
    maxLines: 3,
  };
  const value = {
    x: horizontal ? 300 : x - 75,
    y: unit.y,
    fill: tokens.color.textMuted,
    fontSize: tokens.text.graphic.data.fontSize,
    fontFamily: tokens.text.graphic.data.fontFamily,
  };
  return { participant, input, label, status, unit, value };
}
