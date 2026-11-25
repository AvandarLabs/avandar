import { SceneText } from "../SceneText";
import type { Input } from "../FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  representation: Input["representations"][number];
  input: Input;
  x: number;
};
/** Displays the selected material and optional fraction notation. */
export function FractionMaterialLabels({
  representation,
  input,
  x,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SceneText
        text={representation.materialLabel}
        anchor="middle"
        slot={[x, 462, 220, 14, 3]}
      />
      {input.showFractionNotation ? (
        <SceneText
          text={`${input.fraction.numerator} / ${input.fraction.denominator}`}
          anchor="middle"
          slot={[x, 540, 220, 18, 1]}
        />
      ) : undefined}
    </>
  );
}
