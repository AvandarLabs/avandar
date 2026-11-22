import { TextReveal } from "../../../../../../scenes/TextReveal/TextReveal";
import type { useVideoMotion } from "../../../../../../videoTheme/useVideoMotion";
import css from "./HeadingRevealPanel.module.css";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  mode: "rise" | "wipe";
  motion: ReturnType<typeof useVideoMotion>;
};
/** Shows one heading reveal mode and its delayed kicker. */
export function HeadingRevealPanel({
  frame,
  mode,
  motion,
}: Readonly<Props>): ReactNode {
  const styles = TextReveal.getHeadingRevealStyles({
    frame,
    reveal: { mode, atFrame: 8 },
    motion,
  });
  return (
    <div className={css.headingRevealPanelCardColumn}>
      <span className={css.headingRevealPanelCaption}>{`mode: "${mode}"`}</span>
      <div>
        <p className={css.headingRevealPanelHeadline} style={styles.title}>
          Shared helpers
        </p>
        <p className={css.headingRevealPanelKicker} style={styles.kicker}>
          The kicker follows a panel later
        </p>
      </div>
    </div>
  );
}
