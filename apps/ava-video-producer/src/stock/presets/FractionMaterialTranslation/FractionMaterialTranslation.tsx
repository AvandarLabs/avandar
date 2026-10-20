import { FractionDesk } from "./FractionDesk";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Three physical operations preserve one exact supplied fraction. */
export function FractionMaterialTranslation({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneText
        text={input.lessonLabel}
        anchor="middle"
        slot={[480, 54, 850, 18, 1]}
      />
      {input.showFractionNotation ? (
        <SceneText
          text={`${input.fraction.numerator} / ${input.fraction.denominator}`}
          anchor="middle"
          slot={[480, 109, 850, 28, 1]}
        />
      ) : undefined}
      {input.representations.map((representation, index) => (
        <FractionDesk
          key={representation.id}
          representation={representation}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 566, 850, 14, 2]}
      />
    </g>
  );
}
