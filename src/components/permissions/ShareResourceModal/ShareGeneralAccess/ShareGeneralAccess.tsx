import { useLingui } from "@lingui/react/macro";
import { Group, Select, Stack, Text } from "@mantine/core";
import { IconBuilding } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import {
  appForResource,
  appLabel,
  resourceTypeLabel,
  useShareCopy,
} from "../shareCopy";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

type Props = {
  resourceType: ResourceType;
  isRestricted: boolean;
  workspaceShareRole: RoleLevel | null;
  onChange: (next: { isRestricted: boolean; role: RoleLevel | null }) => void;
};

/**
 * "General access" section: a single dropdown that toggles between
 * `Restricted` (no workspace-wide share, hides the role picker) and
 * `Anyone in {AppLabel}` (a `workspace`-principal share at the chosen
 * role). The orchestrator decides how to persist the change.
 */
export function ShareGeneralAccess({
  resourceType,
  isRestricted,
  workspaceShareRole,
  onChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const shareCopy = useShareCopy();
  const app = appLabel(appForResource(resourceType));
  const resource = resourceTypeLabel(resourceType);

  const generalValue: "restricted" | "workspace" =
    isRestricted ? "restricted" : "workspace";

  const generalOptions = [
    { value: "restricted", label: t`Restricted` },
    { value: "workspace", label: t`Anyone in ${app}` },
  ];

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {shareCopy.generalAccessHeading}
      </Text>
      <Group wrap="nowrap" align="flex-end" gap="sm">
        <Tooltip
          label={
            generalValue === "restricted" ?
              shareCopy.restrictedOptionTooltip(resource)
            : shareCopy.workspaceOptionTooltip(resource, app)
          }
          multiline
          w={320}
        >
          <Select
            flex={1}
            leftSection={<IconBuilding size={16} aria-hidden />}
            data={generalOptions}
            value={generalValue}
            allowDeselect={false}
            onChange={(value) => {
              if (value === "restricted") {
                onChange({ isRestricted: true, role: null });
              } else if (value === "workspace") {
                onChange({
                  isRestricted: false,
                  role: workspaceShareRole ?? "viewer",
                });
              }
            }}
            aria-label={t`General access`}
          />
        </Tooltip>
        {generalValue === "workspace" ?
          <Tooltip label={shareCopy.roleSelectTooltip}>
            <Select
              w={120}
              data={[
                { value: "viewer", label: t`Viewer` },
                { value: "editor", label: t`Editor` },
                { value: "admin", label: t`Admin` },
              ]}
              value={workspaceShareRole ?? "viewer"}
              allowDeselect={false}
              onChange={(value) => {
                if (value) {
                  onChange({
                    isRestricted: false,
                    role: value as RoleLevel,
                  });
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
