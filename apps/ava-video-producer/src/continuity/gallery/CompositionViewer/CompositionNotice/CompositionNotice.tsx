import css from "./CompositionNotice.module.css";
import type { ReactNode } from "react";

type Props = { isScene: boolean };
/** Disclose the evidence boundary of the selected live composition. */
export function CompositionNotice({ isScene }: Readonly<Props>): ReactNode {
  return (
    <p className={css.compositionNoticeRoot}>
      {isScene
        ? "Live React storyboard scenes. Fictional demonstration data. Window contents are curated fictional screenshots; figures, timings and diagrams are illustrations. Downloads render the current composition as authored."
        : "Live React compositions. Fictional demonstration data. Product states are scripted; architecture diagrams are illustrations. Plugin capabilities are future vision. Downloads render the current composition and caption selection."}
    </p>
  );
}
