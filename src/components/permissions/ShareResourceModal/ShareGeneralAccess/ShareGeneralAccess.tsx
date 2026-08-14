import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { appLabel } from "$/copy/appLabel";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { buildGeneralAccessOptions } from "../deriveGeneralAccess/deriveGeneralAccess";
import { appForResource, useShareCopy } from "../shareCopy";
import type { GeneralAccessValue } from "../deriveGeneralAccess/deriveGeneralAccess";
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
 *
 * Purely presentational. The orchestrator derives `value` (see
 * `deriveGeneralAccessValue`), decides what a change means, and persists it.
 * The option list comes from `buildGeneralAccessOptions` rather than being
 * built inline so that its contents and its owner gate stay unit-testable: a
 * Mantine dropdown cannot be opened in jsdom.
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

  const generalOptions = buildGeneralAccessOptions({
    isOwner,
    labels: {
      private: shareCopy.privateOptionLabel,
      restricted: t`Restricted`,
      workspace: t`Anyone in ${app}`,
    },
  });

  const generalAccessTooltip =
    value === "private" ?
      isOwner ? shareCopy.privateOptionTooltip(resource)
      : shareCopy.privateOptionDisabledTooltip(resource)
    : value === "restricted" ? shareCopy.restrictedOptionTooltip(resource)
    : shareCopy.workspaceOptionTooltip(resource, app);

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
              // Mantine hands back a plain string, so narrow it through the
              // option list rather than casting it.
              const selectedOption = generalOptions.find((option) => {
                return option.value === nextValue;
              });
              if (selectedOption) {
                onChange(selectedOption.value);
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
