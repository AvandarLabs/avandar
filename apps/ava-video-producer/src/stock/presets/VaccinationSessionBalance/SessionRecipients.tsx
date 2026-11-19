import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Only referenced recipients appear, with stable dose-adjacent label slots. */
export function SessionRecipients({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g>
      {input.recipients.map((recipient, index) => {
        return (
          <g
            key={recipient.id}
            data-recipient={recipient.id}
            opacity={motion.ramp(
              frame,
              70 + index * motion.stagger.list,
              motion.word,
              motion.reveal.easing,
            )}
          >
            <PersonGlyph
              x={310 + (index % 2) * 185}
              y={200 + Math.floor(index / 2) * 90}
              size={30}
              color={accent}
            />
            <SceneLabel
              text={recipient.label}
              x={290 + (index % 2) * 185}
              y={240 + Math.floor(index / 2) * 90}
              width={168}
              lines={3}
            />
          </g>
        );
      })}
    </g>
  );
}
