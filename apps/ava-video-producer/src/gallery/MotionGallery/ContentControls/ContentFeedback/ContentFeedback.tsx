import styles from "./ContentFeedback.module.css";
import type { ContentDraft } from "../ContentDraftModule/ContentDraftModule";
import type { ReactNode } from "react";
/** Inputs for ContentFeedback. */
type Props = { state: ContentDraft };

/**
 * Validation feedback identifies the authored path and the retained preview.
 */
export function ContentFeedback({ state }: Readonly<Props>): ReactNode {
  return (
    <>
      <p className={styles.contentFeedbackStatus} role="status">
        {state.isValid
          ? "Content is valid. Ready to copy or export."
          : "Fix the marked fields to copy or export. The preview keeps your last valid content."}
      </p>
      {state.issues.map((issue, index) => {
        return (
          <p
            className={styles.contentFeedbackError}
            id={`content-issue-${index}`}
            key={`${issue.path.join(".")}-${index}`}
          >
            <code>{issue.path.join(".") || "input"}</code>: Check this value and
            its related fields.
          </p>
        );
      })}
    </>
  );
}
