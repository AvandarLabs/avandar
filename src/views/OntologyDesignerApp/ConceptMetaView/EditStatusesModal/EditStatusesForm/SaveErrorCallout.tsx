import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconAlertCircle } from "@tabler/icons-react";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The last save's failure, or `undefined` when there is none. */
  saveError: unknown;
};

/**
 * Explains why the last save failed, in the user's terms. The database's own
 * message never reaches the screen: the save raises a stable hint for each
 * failure, and every hint has its own copy here.
 */
export function SaveErrorCallout({ saveError }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (saveError === undefined || saveError === null) {
    return null;
  }

  const messagesByHint: Record<ConceptStatus.SaveErrorHint, string> = {
    case_types_editor_required: t`You need Case Types editor access to change these statuses.`,
    status_set_empty: t`Add at least one status.`,
    status_name_required: t`Every status needs a name.`,
    status_names_not_unique: t`Two statuses have the same name. Give each one its own name.`,
    status_color_invalid: t`One of the colors is not in the palette. Pick another color.`,
    status_not_in_case_type: t`These statuses changed somewhere else. Close this window and try again.`,
    status_default_not_in_set: t`Choose a default status from this list.`,
    status_replacement_required: t`Choose where the records of each removed status go.`,
    status_replacement_not_in_set: t`Records can only move to a status in this list.`,
  };
  const hint = ConceptStatus.toSaveErrorHint(saveError);
  return (
    <Callout
      icon={<IconAlertCircle size={18} aria-hidden />}
      messageSize="sm"
      message={
        hint === undefined
          ? t`Your statuses were not saved. Try again in a moment.`
          : messagesByHint[hint]
      }
    />
  );
}
