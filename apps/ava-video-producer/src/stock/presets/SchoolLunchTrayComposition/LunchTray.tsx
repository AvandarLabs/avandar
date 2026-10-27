import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { TrayCompartment } from "./TrayCompartment";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; frame: number; accent: string };
/**
 * Learner identity stays attached to the same authored tray through serving.
 */
export function LunchTray({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const learner = input.learners[index];
  const tray = input.trays.find(({ learnerId }) => learnerId === learner.id)!;
  const x = 480 + (index - (input.learners.length - 1) / 2) * 150;
  const y = mix(ramp(frame, 88, 20, EASE.inOut), 244, 220);
  return (
    <g data-lunch-learner={learner.id} transform={`translate(${x} 0)`}>
      <FitText
        text={learner.label}
        x={0}
        y={122}
        width={132}
        fontSize={14}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <PersonGlyph x={0} y={190} size={32} color={accent} />
      <g data-tray-for={learner.id} transform={`translate(0 ${y})`}>
        {input.plannedComponents.map((component, componentIndex) => (
          <TrayCompartment
            key={component.id}
            component={component}
            index={componentIndex}
            frame={frame}
            isServed={tray.componentIds.includes(component.id)}
            showNames={input.showComponentNames}
            emphasize={input.emphasizeMissingComponents}
            accent={accent}
          />
        ))}
      </g>
    </g>
  );
}
