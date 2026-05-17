import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string | undefined;
};

/**
 * Opens the share modal when the user has admin on the resource.
 */
export function ShareResourceButton({
  resourceName,
  resourceType,
  resourceId,
}: Props): JSX.Element {
  const [effectiveRole, isLoadingRole] = useResourceRole({
    resourceType,
    resourceId,
  });

  const canManageShares = effectiveRole === "admin";
  const isDisabled = !resourceId || isLoadingRole || !canManageShares;

  return (
    <Tooltip
      label={
        canManageShares || isLoadingRole ?
          "Share this resource"
        : "You need admin access on this resource to manage sharing."
      }
    >
      <Button
        variant="outline"
        leftSection={<IconShare size={16} />}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (!resourceId || isDisabled) {
            event.preventDefault();
            return;
          }

          modals.open({
            title: "Share",
            size: "lg",
            children: (
              <ShareResourceModal
                resourceName={resourceName}
                resourceType={resourceType}
                resourceId={resourceId}
                onClose={() => {
                  modals.closeAll();
                }}
              />
            ),
          });
        }}
      >
        Share
      </Button>
    </Tooltip>
  );
}
