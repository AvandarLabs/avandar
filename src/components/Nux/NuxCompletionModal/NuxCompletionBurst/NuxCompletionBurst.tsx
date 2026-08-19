import clsx from "clsx";
import css from "@/components/Nux/NuxCompletionModal/NuxCompletionBurst/NuxCompletionBurst.module.css";
import type { CSSProperties, ReactElement } from "react";

const BURST_ANGLES_DEG = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330,
] as const;

const BURST_TONES = [
  "var(--mantine-color-primary-6)",
  "var(--mantine-color-teal-5)",
  "var(--mantine-color-yellow-5)",
] as const;

/**
 * A one-shot ring of particles around the completion seal. Hidden when the
 * user prefers reduced motion.
 */
export function NuxCompletionBurst(): ReactElement {
  return (
    <div className={css.nuxCompletionBurst} aria-hidden>
      {BURST_ANGLES_DEG.map((angleDeg, index) => {
        return (
          <span
            key={angleDeg}
            className={clsx(
              css.nuxCompletionBurstParticle,
              index % 2 === 0 && css.nuxCompletionBurstSpark,
            )}
            style={
              {
                "--burst-angle": `${angleDeg}deg`,
                "--burst-delay": `${index * 18}ms`,
                "--burst-tone":
                  BURST_TONES[index % BURST_TONES.length] ?? BURST_TONES[0],
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
