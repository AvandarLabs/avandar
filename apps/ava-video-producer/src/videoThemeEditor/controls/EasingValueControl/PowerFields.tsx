import { Text } from "@mantine/core";
import { RangeNumberInput } from "../RangeNumberInput";
import type { EasingValue } from "../../../videoTheme/videoTheme.types";

type Props = Readonly<{
  power: number;
  isCameraCurve: boolean;
  onChange: (easing: EasingValue) => void;
}>;

/** The power curve exponent. A camera supports only the cubic in-out curve. */
export function PowerFields({ power, isCameraCurve, onChange }: Props) {
  if (isCameraCurve) {
    return (
      <Text size="xs" c="dimmed">
        {"Cubic in-out. Cameras support no other power curve."}
      </Text>
    );
  }
  return (
    <RangeNumberInput
      size="xs"
      label="Exponent"
      min={1}
      max={8}
      step={0.5}
      decimalScale={2}
      value={power}
      onChange={(exponent) => {
        return onChange({ powerInOut: exponent });
      }}
    />
  );
}
