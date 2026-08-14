import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { GeneralAccessModule } from "../GeneralAccessModule/GeneralAccessModule";
import { appForResource, useShareCopy } from "../shareCopy";
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
  const shareCopy = useShareCopy();
  const app = appLabel(appForResource(resourceType));
  const resource = resourceTypeLabel(resourceType);

  const generalOptions = GeneralAccessModule.makeDropdownOptionsFromLabels({
    isOwner,
    labels: {
      private: shareCopy.privateOptionLabel,
      restricted: t`Restricted`,
      workspace: t`Anyone in ${app}`,
    },
  });

  const generalAccessTooltip = matchLiteral(value, {
    private: () => {
      return isOwner ?
          shareCopy.privateOptionTooltip(resource)
        : shareCopy.privateOptionDisabledTooltip(resource);
    },
    restricted: () => {
      return shareCopy.restrictedOptionTooltip(resource);
    },
    workspace: () => {
      return shareCopy.workspaceOptionTooltip(resource, app);
    },
  });

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {shareCopy.generalAccessHeading}
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
          <Tooltip label={shareCopy.roleSelectTooltip}>
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
        {shareCopy.generalAccessHelper}
      </Text>
    </Stack>
  );
}
