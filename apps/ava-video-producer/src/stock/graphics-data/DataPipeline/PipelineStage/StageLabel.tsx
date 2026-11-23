import { Text } from "../../../graphics-common/Text";
import type { ReactNode } from "react";

type Props = Readonly<{ x: number; label: string; detail: string }>;

/** The stage's title and note, centred under its icon. */
export function StageLabel({ x, label, detail }: Props): ReactNode {
  return (
    <>
      <Text role="cardTitle" x={x} y={341} anchor="middle">
        {label}
      </Text>
      <Text role="note" x={x} y={371} anchor="middle">
        {detail}
      </Text>
    </>
  );
}
