import { useLingui } from "@lingui/react/macro";
import { Radio, TextInput } from "@mantine/core";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { StatusSetEditorActions } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.types";
import type { ReactNode } from "react";

type Props = {
  status: ConceptStatus.Draft;
  /** The name to announce, with a fallback for a status not named yet. */
  displayName: string;
  isDefault: boolean;
  radioName: string;
  nameError: string | undefined;
  actions: StatusSetEditorActions;
};

/**
 * The editable parts of one status row: its name, what it means, and
 * whether new records start in it.
 */
export function StatusSetEditorFields({
  status,
  displayName,
  isDefault,
  radioName,
  nameError,
  actions,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <>
      <TextInput
        size="xs"
        className={css.statusSetEditorName}
        aria-label={t`Status name`}
        placeholder={t`Status name`}
        value={status.name}
        error={nameError}
        onChange={(event) => {
          actions.updateStatus({ ...status, name: event.currentTarget.value });
        }}
      />
      <TextInput
        size="xs"
        className={css.statusSetEditorDescription}
        aria-label={t`Description`}
        placeholder={t`What this status means`}
        value={status.description}
        onChange={(event) => {
          actions.updateStatus({
            ...status,
            description: event.currentTarget.value,
          });
        }}
      />
      <div className={css.statusSetEditorDefault}>
        <Radio
          size="xs"
          name={radioName}
          value={status.id}
          checked={isDefault}
          label={t`Default`}
          aria-label={t`Make ${displayName} the default`}
          onChange={() => {
            actions.makeDefault(status.id);
          }}
        />
      </div>
    </>
  );
}
