import { TOKEN_CONTROLS } from "../../videoTheme/tokenCatalog/defineTokens";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import {
  BooleanValueControl,
  EnumValueControl,
  FontValueControl,
} from "./ChoiceControls";
import {
  ColorValueControl,
  GradientValueControl,
  PaletteValueControl,
  ShadeValueControl,
} from "./ColorControls";
import {
  DashValueControl,
  GlowValueControl,
  ShadowValueControl,
  TextShadowValueControl,
} from "./EffectControls";
import { EasingValueControl, SpringValueControl } from "./MotionControls";
import { DurationValueControl, NumberValueControl } from "./NumberControls";
import type { ValueControlProps } from "./valueControl.types";

const LAYER_CONTROLS = {
  shadow: ShadowValueControl,
  glow: GlowValueControl,
  textShadow: TextShadowValueControl,
} as const;

/**
 * The control for a literal value of any token kind, such as an atomic
 * value, a Mantine key, or a custom component value.
 */
export function ValueControl(props: ValueControlProps) {
  const { swatches } = useTokenEditor();
  switch (TOKEN_CONTROLS[props.definition.kind]) {
    case "color":
      return <ColorValueControl {...props} swatches={swatches} />;
    case "fill":
      return typeof props.value === "string" ? (
        <ColorValueControl {...props} swatches={swatches} />
      ) : (
        <GradientValueControl {...props} />
      );
    case "palette":
      return <PaletteValueControl {...props} />;
    case "shade":
      return <ShadeValueControl {...props} />;
    case "gradient":
      return <GradientValueControl {...props} />;
    case "slider":
      return <NumberValueControl {...props} />;
    case "duration":
      return <DurationValueControl {...props} />;
    case "easing":
      return <EasingValueControl {...props} />;
    case "spring":
      return <SpringValueControl {...props} />;
    case "dash":
      return <DashValueControl {...props} />;
    case "font":
      return <FontValueControl {...props} />;
    case "segmented":
      return <EnumValueControl {...props} />;
    case "switch":
      return <BooleanValueControl {...props} />;
    case "layers": {
      const LayerControl =
        LAYER_CONTROLS[props.definition.kind as keyof typeof LAYER_CONTROLS];
      return <LayerControl {...props} />;
    }
    default:
      return null;
  }
}
