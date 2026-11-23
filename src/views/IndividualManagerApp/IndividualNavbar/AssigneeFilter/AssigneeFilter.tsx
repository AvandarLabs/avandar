import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { useMemo } from "react";
import { uuid } from "$/lib/uuid";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { AssigneeFilter as AssigneeChoice } from "@/views/IndividualManagerApp/makeRecordsListWhere/makeRecordsListWhere";
import type { ReactNode } from "react";

/** The option value for records no one is assigned to. Not a user id. */
const UNASSIGNED_VALUE = "unassigned";

type Props = {
  /** Every member of the workspace. `undefined` while they load. */
  members: readonly UserProfile.WithRole[] | undefined;
  value: AssigneeChoice;
  onChange: (assignee: AssigneeChoice) => void;
};

function _valueToSelectValue(value: AssigneeChoice): string | null {
  if (value.kind === "unassigned") {
    return UNASSIGNED_VALUE;
  }
  return value.kind === "member" ? value.userId : null;
}

function _selectValueToValue(selectValue: string | null): AssigneeChoice {
  if (selectValue === null) {
    return { kind: "anyone" };
  }
  if (selectValue === UNASSIGNED_VALUE) {
    return { kind: "unassigned" };
  }
  return { kind: "member", userId: uuid(selectValue) as User.Id };
}

/**
 * Narrows the records list to one assignee: no one, or a single member.
 * Clearing the select shows every record again.
 *
 * While the members load, the select still renders with only the Unassigned
 * option, so it never blocks the status filter beside it.
 */
export function AssigneeFilter({
  members,
  value,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const unassignedLabel = t`Unassigned`;
  const options = useMemo(() => {
    const memberOptions = [...(members ?? [])]
      .sort((first, second) => {
        return first.displayName.localeCompare(second.displayName);
      })
      .map((member) => {
        return { value: member.userId, label: member.displayName };
      });
    return [
      { value: UNASSIGNED_VALUE, label: unassignedLabel },
      ...memberOptions,
    ];
  }, [members, unassignedLabel]);

  return (
    <Select
      size="xs"
      searchable
      clearable
      aria-label={t`Filter by assignee`}
      clearButtonProps={{ "aria-label": t`Show every assignee` }}
      placeholder={value.kind === "anyone" ? t`Anyone` : undefined}
      data={options}
      value={_valueToSelectValue(value)}
      onChange={(selectValue) => {
        onChange(_selectValueToValue(selectValue));
      }}
    />
  );
}
