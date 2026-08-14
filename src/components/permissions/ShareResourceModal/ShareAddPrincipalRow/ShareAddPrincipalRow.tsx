import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Select } from "@mantine/core";
import { useMemo, useState } from "react";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Option = { value: string; label: string };

type Selection = {
  principalType: "user" | "user_group";
  principalId: string;
  role: RoleLevel;
};

type Props = {
  members: readonly Option[];
  groups: readonly Option[];
  isAdding: boolean;
  /**
   * Greys out the whole row. Set when the resource is private, where adding a
   * principal is not an available action.
   */
  isDisabled?: boolean;
  onAdd: (selection: Selection) => void;
};

/**
 * Top of the modal: a single searchable combobox over users + user_groups
 * with an inline role picker and a Share button. Emits a normalized
 * `Selection` when the user commits a row.
 */
export function ShareAddPrincipalRow({
  members,
  groups,
  isAdding,
  isDisabled = false,
  onAdd,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [target, setTarget] = useState<string | null>(null);
  const [role, setRole] = useState<RoleLevel>("viewer");

  const roleOptions: Array<{ value: RoleLevel; label: string }> = [
    { value: "viewer", label: t`Viewer` },
    { value: "editor", label: t`Editor` },
    { value: "admin", label: t`Admin` },
  ];

  const groupedOptions = useMemo(() => {
    const data: Array<{ group: string; items: Option[] }> = [];
    if (members.length > 0) {
      data.push({
        group: t`Members`,
        items: members.map((member) => {
          return { value: `user:${member.value}`, label: member.label };
        }),
      });
    }
    if (groups.length > 0) {
      data.push({
        group: t`User groups`,
        items: groups.map((group) => {
          return { value: `user_group:${group.value}`, label: group.label };
        }),
      });
    }
    return data;
  }, [members, groups, t]);

  const onClick = (): void => {
    if (!target) {
      return;
    }
    const [kind, id] = target.split(":") as ["user" | "user_group", string];
    onAdd({ principalType: kind, principalId: id, role });
    setTarget(null);
  };

  const isEmptySource = members.length === 0 && groups.length === 0;

  return (
    <Group align="flex-end" wrap="nowrap" gap="sm">
      <Select
        flex={1}
        disabled={isDisabled}
        placeholder={t`Search by name or user group`}
        description={t`Add a member or a user group to grant access. Use General access above to share more broadly.`}
        data={groupedOptions}
        value={target}
        onChange={setTarget}
        searchable
        nothingFoundMessage={
          isEmptySource ?
            t`No members or user groups yet. Invite members or create user groups in Workspace settings.`
          : t`No matches`
        }
        aria-label={t`Add people or user groups`}
      />
      <Select
        w={120}
        disabled={isDisabled}
        label={t`Role`}
        data={roleOptions}
        value={role}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            setRole(value as RoleLevel);
          }
        }}
        aria-label={t`Role for new share`}
      />
      <Button
        loading={isAdding}
        disabled={isDisabled || !target}
        onClick={onClick}
      >
        <Trans>Share</Trans>
      </Button>
    </Group>
  );
}
