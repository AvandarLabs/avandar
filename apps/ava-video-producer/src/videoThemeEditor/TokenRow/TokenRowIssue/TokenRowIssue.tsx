import { IconAlertCircle } from "@tabler/icons-react";
import { describeRowIssue } from "../../tokenRows/tokenRows";
import css from "./TokenRowIssue.module.css";
import type {
  TokenKind,
  VideoThemeIssue,
} from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = Readonly<{ issue: VideoThemeIssue; kind: TokenKind }>;

function _issueToSentence(issue: VideoThemeIssue, kind: TokenKind): string {
  const description = describeRowIssue(issue);
  if (description.kind === "missingReference") {
    return kind === "color" || kind === "fill"
      ? "This colour is missing. Pick another."
      : "This value is missing. Pick another.";
  }
  return description.kind === "loop"
    ? "This value points back at itself. Pick another."
    : "This value cannot be used.";
}

/**
 * A problem in plain words, with the resolver's own message as secondary
 * detail.
 */
export function TokenRowIssue({ issue, kind }: Props): ReactNode {
  return (
    <div className={css.tokenRowIssue} role="alert">
      <IconAlertCircle
        className={css.tokenRowIssueIcon}
        size={14}
        aria-hidden="true"
      />
      <div>
        <p className={css.tokenRowIssueSentence}>
          {_issueToSentence(issue, kind)}
        </p>
        <code className={css.tokenRowIssueMessage}>{issue.message}</code>
      </div>
    </div>
  );
}
