import { Button, Group, Select } from "@mantine/core";
import { useMemo, useState } from "react";
import { SHARE_COPY } from "./shareCopy";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

const ROLE_OPTIONS: Array<{ value: RoleLevel; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

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
  onAdd,
}: Props): JSX.Element {
  const [target, setTarget] = useState<string | null>(null);
  const [role, setRole] = useState<RoleLevel>("viewer");

  const groupedOptions = useMemo(() => {
    const data: Array<{ group: string; items: Option[] }> = [];
    if (members.length > 0) {
      data.push({
        group: "Members",
        items: members.map((m) => {
          return { value: `user:${m.value}`, label: m.label };
        }),
      });
    }
    if (groups.length > 0) {
      data.push({
        group: "Tags",
        items: groups.map((g) => {
          return { value: `user_group:${g.value}`, label: g.label };
        }),
      });
    }
    return data;
  }, [members, groups]);

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
        placeholder={SHARE_COPY.addPlaceholder}
        description={SHARE_COPY.addHelper}
        data={groupedOptions}
        value={target}
        onChange={setTarget}
        searchable
        nothingFoundMessage={
          isEmptySource ?
            SHARE_COPY.emptyState.noMembersOrTags
          : "No matches"
        }
        aria-label="Add people, groups, or tags"
      />
      <Select
        w={120}
        label="Role"
        data={ROLE_OPTIONS}
        value={role}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            setRole(value as RoleLevel);
          }
        }}
        aria-label="Role for new share"
      />
      <Button loading={isAdding} disabled={!target} onClick={onClick}>
        Share
      </Button>
    </Group>
  );
}
