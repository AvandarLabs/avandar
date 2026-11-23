import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, Text, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordAssigneeControl/RecordAssigneeControl.module.css";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { ReactNode } from "react";

type Props = {
  /** Every member of the workspace, loaded. */
  members: readonly UserProfile.WithRole[];
  /** What the trigger shows for the current assignee. */
  label: string;
  assigneeId: string | undefined;
  /** Whether a change is being saved. The menu stays closed until then. */
  isSaving: boolean;
  onChange: (userId: User.Id | undefined) => void;
};

type ItemProps = {
  label: string;
  isCurrent: boolean;
  onPick: () => void;
};

function AssigneeMenuItem({
  label,
  isCurrent,
  onPick,
}: Readonly<ItemProps>): ReactNode {
  return (
    <Menu.Item
      aria-current={isCurrent}
      rightSection={isCurrent ? <IconCheck size={14} aria-hidden /> : null}
      onClick={onPick}
    >
      {label}
    </Menu.Item>
  );
}

type DropdownProps = Pick<Props, "members" | "assigneeId" | "onChange">;

/** Unassigned first, then every member by name. */
function AssigneeMenuDropdown({
  members,
  assigneeId,
  onChange,
}: Readonly<DropdownProps>): ReactNode {
  const { t } = useLingui();
  const sortedMembers = [...members].sort((first, second) => {
    return first.displayName.localeCompare(second.displayName);
  });

  return (
    <Menu.Dropdown>
      <Menu.Label>
        <Trans>Assign to</Trans>
      </Menu.Label>
      <AssigneeMenuItem
        label={t`Unassigned`}
        isCurrent={assigneeId === undefined}
        onPick={() => {
          onChange(undefined);
        }}
      />
      {sortedMembers.map((member) => {
        return (
          <AssigneeMenuItem
            key={member.userId}
            label={member.displayName}
            isCurrent={member.userId === assigneeId}
            onPick={() => {
              onChange(member.userId);
            }}
          />
        );
      })}
    </Menu.Dropdown>
  );
}

/**
 * The assignee picker for a user who may assign a record: the current
 * assignee's name, opening a menu of Unassigned and every member.
 */
export function RecordAssigneeMenu({
  members,
  label,
  assigneeId,
  isSaving,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-start" width={260} disabled={isSaving}>
      <Menu.Target>
        <UnstyledButton
          className={css.recordAssigneeControlTrigger}
          aria-label={t`Assigned to: ${label}`}
          aria-busy={isSaving}
        >
          <Text size="sm" className={css.recordAssigneeControlLabel}>
            {label}
          </Text>
          <IconChevronDown
            size={14}
            aria-hidden
            className={css.recordAssigneeControlChevron}
          />
        </UnstyledButton>
      </Menu.Target>
      <AssigneeMenuDropdown
        members={members}
        assigneeId={assigneeId}
        onChange={onChange}
      />
    </Menu>
  );
}
