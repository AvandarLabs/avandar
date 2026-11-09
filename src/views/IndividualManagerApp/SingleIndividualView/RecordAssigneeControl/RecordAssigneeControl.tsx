import { useLingui } from "@lingui/react/macro";
import { Skeleton, Text, UnstyledButton, VisuallyHidden } from "@mantine/core";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl.module.css";
import { RecordAssigneeMenu } from "@/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeMenu";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { ReactNode } from "react";

type Props = {
  /** Every member of the workspace. `undefined` while they load. */
  members: readonly UserProfile.WithRole[] | undefined;
  /** Whether loading the members failed. */
  isMembersError: boolean;
  assigneeId: string | undefined;
  /** Whether the user may assign a record. */
  canEdit: boolean;
  /** Whether a change is being saved. The menu stays closed until then. */
  isSaving?: boolean;
  onChange: (userId: User.Id | undefined) => void;
};

/**
 * What to call the assignee. Empty while the members are still loading and
 * the name is not yet known.
 */
function useAssigneeLabel(
  props: Readonly<Pick<Props, "members" | "isMembersError" | "assigneeId">>,
): string | undefined {
  const { t } = useLingui();
  const { members, isMembersError, assigneeId } = props;
  if (assigneeId === undefined) {
    return t`Unassigned`;
  }
  if (isMembersError) {
    return t`Assignee unavailable`;
  }
  if (members === undefined) {
    return undefined;
  }
  const member = members.find((candidate) => {
    return candidate.userId === assigneeId;
  });
  return member ? member.displayName : t`Former member`;
}

/**
 * Holds the control's place while the members load. An editor sees the
 * trigger they will get, not yet openable. Everyone else sees a status.
 */
function AssigneeLoading({
  canEdit,
}: Readonly<{ canEdit: boolean }>): ReactNode {
  const { t } = useLingui();
  const placeholder = <Skeleton height={14} width={96} aria-hidden />;
  return canEdit ? (
    <UnstyledButton
      className={css.recordAssigneeControlTrigger}
      aria-label={t`Assigned to`}
      aria-busy
      disabled
    >
      {placeholder}
    </UnstyledButton>
  ) : (
    <span role="status" aria-label={t`Assigned to`} aria-busy>
      {placeholder}
    </span>
  );
}

/**
 * A record's assignee beside its status. A user who may assign gets a menu
 * of every member and Unassigned; everyone else gets the name as text. The
 * control is hidden rather than disabled for a user who cannot assign, and
 * the menu does not open while the members are loading or failed to load.
 */
export function RecordAssigneeControl({
  members,
  isMembersError,
  assigneeId,
  canEdit,
  isSaving = false,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const label = useAssigneeLabel({ members, isMembersError, assigneeId });
  if (label === undefined) {
    return <AssigneeLoading canEdit={canEdit} />;
  }
  if (!canEdit || !members || isMembersError) {
    return (
      <Text size="sm" className={css.recordAssigneeControlLabel}>
        <VisuallyHidden component="span">{t`Assigned to`}: </VisuallyHidden>
        {label}
      </Text>
    );
  }
  return (
    <RecordAssigneeMenu
      members={members}
      label={label}
      assigneeId={assigneeId}
      isSaving={isSaving}
      onChange={onChange}
    />
  );
}
