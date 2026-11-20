import { TOKEN_CONTROLS } from "../../videoTheme/tokenCatalog/defineTokensHelpers";
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
export function ValueControl(props: ValueControlProps): ReactNode {
  const { swatches } = useTokenEditor();
  const control = TOKEN_CONTROLS[props.definition.kind];
  if (
    control === "color" ||
    (control === "fill" && typeof props.value === "string")
  ) {
    return <ColorValueControl {...props} swatches={swatches} />;
  }
  if (control === "fill") {
    return <GradientValueControl {...props} />;
  }
  if (control === "layers") {
    const LayerControl =
      LAYER_CONTROLS[props.definition.kind as keyof typeof LAYER_CONTROLS];
    return <LayerControl {...props} />;
  }
  const Control = VALUE_CONTROLS[control as keyof typeof VALUE_CONTROLS];
  return Control ? <Control {...props} /> : null;
}
