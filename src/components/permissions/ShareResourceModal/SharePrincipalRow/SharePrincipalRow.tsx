import {
  ActionIcon,
  Badge,
  Checkbox,
  Group,
  Select,
  Text,
} from "@mantine/core";
import { IconTag, IconUser, IconX } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { appForResource, appLabel, SHARE_COPY } from "../shareCopy";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

const ROLE_OPTIONS: Array<{ value: RoleLevel; label: string }> = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

type Props = {
  share: ResourceShareRow;
  displayName: string;
  resourceType: ResourceType;
  isOwnerRow?: boolean;
  onRoleChange: (role: RoleLevel) => void;
  onToggleRequiresAppAccess?: (next: boolean) => void;
  onRemove: () => void;
};

/**
 * One row in the People-with-access list. Renders a user or user_group
 * principal with a role picker and (for groups only) a "Limit to app
 * access" intersection checkbox. Owner rows are read-only.
 */
export function SharePrincipalRow({
  share,
  displayName,
  resourceType,
  isOwnerRow = false,
  onRoleChange,
  onToggleRequiresAppAccess,
  onRemove,
}: Props): JSX.Element {
  const isGroup = share.principalType === "user_group";
  const app = appLabel(appForResource(resourceType));
  const resource = resourceType === "dashboard" ? "dashboard" : "dataset";

  return (
    <Group wrap="nowrap" align="center" gap="sm">
      {isGroup ?
        <IconTag size={16} aria-hidden />
      : <IconUser size={16} aria-hidden />}
      <Text size="sm" flex={1}>
        {displayName}
      </Text>

      {isOwnerRow ?
        <Tooltip label={SHARE_COPY.ownerBadgeTooltip(resource)}>
          <Badge variant="light" color="gray" tabIndex={0}>
            Owner
          </Badge>
        </Tooltip>
      : <Tooltip label={SHARE_COPY.roleSelectTooltip}>
          <Select
            w={120}
            data={ROLE_OPTIONS}
            value={share.role}
            allowDeselect={false}
            onChange={(value) => {
              if (value) {
                onRoleChange(value as RoleLevel);
              }
            }}
            aria-label={`Role for ${displayName}`}
          />
        </Tooltip>
      }

      {isGroup && !isOwnerRow && onToggleRequiresAppAccess ?
        <Tooltip
          label={SHARE_COPY.limitToAppAccessTooltip(app)}
          multiline
          w={320}
        >
          <Checkbox
            checked={share.requiresAppAccess}
            onChange={(event) => {
              onToggleRequiresAppAccess(event.currentTarget.checked);
            }}
            label="Limit to app access"
            size="sm"
            aria-label={`Limit ${displayName} to app access`}
          />
        </Tooltip>
      : null}

      {!isOwnerRow ?
        <Tooltip label={SHARE_COPY.removeTooltip(displayName)}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onRemove}
            aria-label={`Remove access for ${displayName}`}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      : null}
    </Group>
  );
}
