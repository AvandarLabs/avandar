import { match, P } from "ts-pattern";
import { TOKEN_CONTROLS } from "../../videoTheme/tokenCatalog/TokenDefinitions";
import { useTokenEditor } from "../TokenEditorContext";
import { BooleanValueControl } from "./BooleanValueControl";
import { ColorValueControl } from "./ColorValueControl/ColorValueControl";
import { DashValueControl } from "./DashValueControl/DashValueControl";
import { DurationValueControl } from "./DurationValueControl/DurationValueControl";
import { EasingValueControl } from "./EasingValueControl/EasingValueControl";
import { EnumValueControl } from "./EnumValueControl/EnumValueControl";
import { FontValueControl } from "./FontValueControl";
import { GlowValueControl } from "./GlowValueControl";
import { GradientValueControl } from "./GradientValueControl";
import { NumberValueControl } from "./NumberValueControl/NumberValueControl";
import { PaletteValueControl } from "./PaletteValueControl/PaletteValueControl";
import { ShadeValueControl } from "./ShadeValueControl";
import { ShadowValueControl } from "./ShadowValueControl/ShadowValueControl";
import { SpringValueControl } from "./SpringValueControl/SpringValueControl";
import { TextShadowValueControl } from "./TextShadowValueControl";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

const STANDARD_VALUE_CONTROLS = [
  "palette",
  "shade",
  "gradient",
  "slider",
  "duration",
  "easing",
  "spring",
  "dash",
  "font",
  "segmented",
  "switch",
] as const;

type Props = ValueControlProps;

const LAYER_CONTROLS = {
  shadow: ShadowValueControl,
  glow: GlowValueControl,
  textShadow: TextShadowValueControl,
} as const;

const VALUE_CONTROLS = {
  palette: PaletteValueControl,
  shade: ShadeValueControl,
  gradient: GradientValueControl,
  slider: NumberValueControl,
  duration: DurationValueControl,
  easing: EasingValueControl,
  spring: SpringValueControl,
  dash: DashValueControl,
  font: FontValueControl,
  segmented: EnumValueControl,
  switch: BooleanValueControl,
} as const;

/**
 * The control for a literal value of any token kind, such as an atomic
 * value, a Mantine key, or a custom component value.
 */
export function ValueControl(props: Readonly<Props>): ReactNode {
  const { swatches } = useTokenEditor();
  const control = TOKEN_CONTROLS[props.definition.kind];
  if (
    control === "color" ||
    (control === "fill" && typeof props.value === "string")
  ) {
    return <ColorValueControl {...props} swatches={swatches} />;
  }
  return match(control)
    .with("fill", () => {
      return <GradientValueControl {...props} />;
    })
    .with("layers", () => {
      const LayerControl =
        LAYER_CONTROLS[props.definition.kind as keyof typeof LAYER_CONTROLS];
      return <LayerControl {...props} />;
    })
    .with(P.union(...STANDARD_VALUE_CONTROLS), (matchedControl) => {
      const Control = VALUE_CONTROLS[matchedControl];
      return <Control {...props} />;
    })
    .with(
      "typeStyle",
      "paint",
      "elevation",
      "sketch",
      "box",
      "motionStep",
      "cameraPreset",
      "range",
      () => {
        return null;
      },
    )
    .exhaustive();
}
