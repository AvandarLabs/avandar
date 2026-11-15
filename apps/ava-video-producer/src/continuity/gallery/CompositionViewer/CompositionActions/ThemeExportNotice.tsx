import { IconAlertCircle } from "@tabler/icons-react";
import css from "./CompositionActions.module.css";
import type {
  ThemeExportState,
  ThemeRefusalReason,
} from "../themeExportState/themeExportState";

type Props = Readonly<{
  id: string;
  state: ThemeExportState;
  onRetry: () => void;
}>;

/** Translated explanations for each reason an export cannot use the draft's theme. */
function useRefusalCopy(): (reason: ThemeRefusalReason) => string {
  const copy: Record<ThemeRefusalReason, string> = {
    "film-unsupported":
      "This film does not take design tokens, so its download would not match the preview.",
    "payload-too-large":
      "The design tokens are too large to send to the preview. Remove some edits and try again.",
    "payload-unreadable":
      "The preview could not read the design tokens. Discard the draft or try again.",
    "theme-unresolvable":
      "The design tokens do not resolve. Check the Design tokens tab for issues.",
    "theme-issues":
      "The preview rejected some design tokens. Check the Design tokens tab for issues.",
    "draft-issues":
      "Some design tokens have issues. Fix them in the Design tokens tab to download.",
  };
  return (reason) => copy[reason];
}

/**
 * Why Download MP4 is unavailable when the live player refused the theme or
 * never answered, with a retry for the latter. Renders nothing otherwise.
 */
export function ThemeExportNotice({ id, state, onRetry }: Props) {
  const getRefusalCopy = useRefusalCopy();
  if (state.kind !== "refused" && state.kind !== "timed-out") {
    return null;
  }
  return (
    <p id={id} className={css.compositionActionsError} role="alert">
      <IconAlertCircle
        className={css.compositionActionsErrorIcon}
        size={14}
        aria-hidden="true"
      />
      <span>
        {state.kind === "refused"
          ? getRefusalCopy(state.reason)
          : "Couldn't apply design tokens. The preview did not respond."}
      </span>
      {state.kind === "timed-out" ? (
        <button
          type="button"
          className={css.compositionActionsRetry}
          onClick={onRetry}
        >
          {"Try again"}
        </button>
      ) : null}
    </p>
  );
}
