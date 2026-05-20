import { Stack, Text } from "@mantine/core";
import { useShareCopy } from "./shareCopy";
import { SharePrincipalRow } from "./SharePrincipalRow/SharePrincipalRow";
import type {
  ResourceShareRow,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * One share row enriched with the resolved display name and a marker that
 * indicates whether it represents the (read-only) owner row.
 */
export type DisplayShare = ResourceShareRow & {
  displayName: string;
  isOwnerRow?: boolean;
};

type Props = {
  shares: readonly DisplayShare[];
  resourceType: ResourceType;
  onRoleChange: (share: DisplayShare, role: RoleLevel) => void;
  onToggleRequiresAppAccess: (share: DisplayShare, next: boolean) => void;
  onRemove: (share: DisplayShare) => void;
};

/**
 * Renders the "People with access" section: a header plus one
 * `SharePrincipalRow` per share. Pure presentational wiring; the
 * orchestrator drives mutations.
 */
export function SharePrincipalList({
  shares,
  resourceType,
  onRoleChange,
  onToggleRequiresAppAccess,
  onRemove,
}: Props): JSX.Element {
  const shareCopy = useShareCopy();
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm">
        {shareCopy.peopleWithAccessHeading}
      </Text>
      {shares.map((share) => {
        return (
          <SharePrincipalRow
            key={share.id}
            share={share}
            displayName={share.displayName}
            resourceType={resourceType}
            isOwnerRow={share.isOwnerRow}
            onRoleChange={(role) => {
              return onRoleChange(share, role);
            }}
            onToggleRequiresAppAccess={(next) => {
              return onToggleRequiresAppAccess(share, next);
            }}
            onRemove={() => {
              return onRemove(share);
            }}
          />
        );
      })}
    </Stack>
  );
}
