import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import { resourceTypeLabel } from "@/components/permissions/ShareResourceModal/shareCopy";
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
  const { t } = useLingui();
  const [effectiveRole, isLoadingRole] = useResourceRole({
    resourceType,
    resourceId,
  });

  const canManageShares = effectiveRole === "admin";
  const isDisabled = !resourceId || isLoadingRole || !canManageShares;
  const resourceLabel = resourceTypeLabel(resourceType, t);

  return (
    <Tooltip
      label={
        canManageShares || isLoadingRole ?
          t`Share this ${resourceLabel}`
        : t`You need admin access on this resource to manage sharing.`
      }
    >
      <Button
        variant="default"
        leftSection={<IconShare size={16} />}
        data-disabled={isDisabled || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={(event) => {
          if (!resourceId || isDisabled) {
            event.preventDefault();
            return;
          }

          modals.open({
            title: t`Share`,
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
        <Trans>Share</Trans>
      </Button>
    </Tooltip>
  );
}
