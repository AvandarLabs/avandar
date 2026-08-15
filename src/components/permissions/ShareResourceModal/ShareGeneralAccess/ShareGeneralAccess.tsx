import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel/resourceTypeLabel";
import { roleSelectTooltip } from "../copy/roleSelectTooltip";
import { GeneralAccessModule } from "../GeneralAccessModule/GeneralAccessModule";
import { getAppTypeFromResourceType } from "../getAppTypeFromResourceType/getAppTypeFromResourceType";
import type { GeneralAccessValue } from "../GeneralAccessModule/GeneralAccessModule";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Props = {
  resourceType: ResourceType;
  value: GeneralAccessValue;
  isOwner: boolean;
  isBusy: boolean;
  workspaceShareRole: RoleLevel | null;
  onChange: (nextValue: GeneralAccessValue) => void;
  onWorkspaceRoleChange: (role: RoleLevel) => void;
};

/**
 * "General access" section: a single dropdown over the three access shapes
 * (`Only me`, `Restricted`, and `Anyone in {AppLabel}`), plus a role picker
 * that only appears for the workspace-wide option.
 */
export function ShareGeneralAccess({
  resourceType,
  value,
  isOwner,
  isBusy,
  workspaceShareRole,
  onChange,
  onWorkspaceRoleChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const app = appLabel(getAppTypeFromResourceType(resourceType));
  const resource = resourceTypeLabel(resourceType);

  const generalOptions = GeneralAccessModule.makeDropdownOptionsFromLabels({
    isOwner,
    labels: {
      private: t`Only me`,
      restricted: t`Restricted`,
      workspace: t`Anyone in ${app}`,
    },
  });

  const generalAccessTooltip = matchLiteral(value, {
    private: () => {
      return isOwner ?
          t`Only you can access this ${resource}. Everyone else loses access, including workspace admins.`
        : t`Only the owner can make this ${resource} private.`;
    },
    restricted: () => {
      return t`Only the people and groups listed below can access this ${resource}.`;
    },
    workspace: () => {
      return t`Every workspace member who can open the ${app} app gets this role on this ${resource}, in addition to whatever's listed below.`;
    },
  });

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        <Trans>General access</Trans>
      </Text>
      <Group wrap="nowrap" align="flex-end" gap="sm">
        <Tooltip label={generalAccessTooltip} multiline w={320}>
          <Select
            flex={1}
            disabled={isBusy}
            leftSection={<IconBuilding size={16} aria-hidden />}
            data={generalOptions}
            value={value}
            allowDeselect={false}
            onChange={(nextValue) => {
              if (
                nextValue &&
                GeneralAccessModule.isValidAccessValue(nextValue)
              ) {
                onChange(nextValue);
              }
            }}
            aria-label={t`General access`}
          />
        </Tooltip>
        {value === "workspace" ?
          <Tooltip label={roleSelectTooltip()}>
            <Select
              w={120}
              disabled={isBusy}
              data={[
                { value: "viewer", label: t`Viewer` },
                { value: "editor", label: t`Editor` },
                { value: "admin", label: t`Admin` },
              ]}
              value={workspaceShareRole ?? "viewer"}
              allowDeselect={false}
              onChange={(role) => {
                if (role) {
                  onWorkspaceRoleChange(role as RoleLevel);
                }
              }}
              aria-label={t`Role for everyone in the workspace`}
            />
          </Tooltip>
        : null}
      </Group>
      <Text size="xs" c="dimmed">
        <Trans>
          Controls the default for the rest of the workspace. People without app
          access still need a direct share below.
        </Trans>
      </Text>
    </Stack>
  );
}
