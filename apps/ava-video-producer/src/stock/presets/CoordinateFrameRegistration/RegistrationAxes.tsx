import { Text } from "../../graphics-common/Text";
import type { ReactNode } from "react";

type Props = { x: number; index: number };
/** Source circle and target diamond also key their coordinate-pair rows. */
export function RegistrationAxes({ x, index }: Readonly<Props>): ReactNode {
  return (
    <g>
      <Text x={x - 20} y={185} role="data" anchor="end">
        0
      </Text>
      <Text x={x - 20} y={425} role="data" anchor="end">
        100
      </Text>
      <Text x={x - 20} y={167} role="data" anchor="end">
        {index ? "◇" : "○"}
      </Text>
    </g>
  );
}
