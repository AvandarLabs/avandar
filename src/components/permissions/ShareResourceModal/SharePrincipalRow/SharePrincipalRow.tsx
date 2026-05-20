import { Trans, useLingui } from "@lingui/react/macro";
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
import {
  appForResource,
  appLabel,
  resourceTypeLabel,
  useShareCopy,
} from "../shareCopy";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

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
  const { t } = useLingui();
  const shareCopy = useShareCopy();
  const isGroup = share.principalType === "user_group";
  const app = appLabel(appForResource(resourceType), t);
  const resource = resourceTypeLabel(resourceType, t);

  const roleOptions: Array<{ value: RoleLevel; label: string }> = [
    { value: "viewer", label: t`Viewer` },
    { value: "editor", label: t`Editor` },
    { value: "admin", label: t`Admin` },
  ];

  return (
    <Group wrap="nowrap" align="center" gap="sm">
      {isGroup ?
        <IconTag size={16} aria-hidden />
      : <IconUser size={16} aria-hidden />}
      <Text size="sm" flex={1}>
        {displayName}
      </Text>

      {isOwnerRow ?
        <Tooltip label={shareCopy.ownerBadgeTooltip(resource)}>
          <Badge variant="light" color="gray" tabIndex={0}>
            <Trans>Owner</Trans>
          </Badge>
        </Tooltip>
      : <Tooltip label={shareCopy.roleSelectTooltip}>
          <Select
            w={120}
            data={roleOptions}
            value={share.role}
            allowDeselect={false}
            onChange={(value) => {
              if (value) {
                onRoleChange(value as RoleLevel);
              }
            }}
            aria-label={t`Role for ${displayName}`}
          />
        </Tooltip>
      }

      {isGroup && !isOwnerRow && onToggleRequiresAppAccess ?
        <Tooltip
          label={shareCopy.limitToAppAccessTooltip(app)}
          multiline
          w={320}
        >
          <Checkbox
            checked={share.requiresAppAccess}
            onChange={(event) => {
              onToggleRequiresAppAccess(event.currentTarget.checked);
            }}
            label={t`Limit to app access`}
            size="sm"
            aria-label={t`Limit ${displayName} to app access`}
          />
        </Tooltip>
      : null}

      {!isOwnerRow ?
        <Tooltip label={shareCopy.removeTooltip(displayName)}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onRemove}
            aria-label={t`Remove access for ${displayName}`}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      : null}
    </Group>
  );
}
