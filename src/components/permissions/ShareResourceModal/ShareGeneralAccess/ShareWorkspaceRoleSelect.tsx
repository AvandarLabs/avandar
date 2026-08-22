import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { roleSelectTooltip } from "../copy/roleSelectTooltip";

type Props = {
  /** `null` while the workspace-wide share row carries no role yet. */
  role: RoleLevel | null;
  isDisabled: boolean;
  onChange: (role: RoleLevel) => void;
};

/**
 * The role every workspace member gets, shown beside the General access
 * dropdown and only while that dropdown reads "Anyone in {App}". Any other
 * access shape grants no workspace-wide role, so there is nothing to pick.
 */
export function ShareWorkspaceRoleSelect({
  role,
  isDisabled,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Tooltip label={roleSelectTooltip()}>
      <Select
        w={120}
        disabled={isDisabled}
        data={[
          { value: "viewer", label: t`Viewer` },
          { value: "editor", label: t`Editor` },
          { value: "admin", label: t`Admin` },
        ]}
        value={role ?? "viewer"}
        allowDeselect={false}
        onChange={(nextRole) => {
          if (nextRole) {
            onChange(nextRole as RoleLevel);
          }
        }}
        aria-label={t`Role for everyone in the workspace`}
      />
    </Tooltip>
  );
}
