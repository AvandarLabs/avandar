import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconShare } from "@tabler/icons-react";
import { ShareResourceModal } from "@/components/permissions/ShareResourceModal/ShareResourceModal";
import { useShareButtonState } from "@/components/permissions/useShareButtonState";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { ButtonProps } from "@mantine/core";

type Props = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string | undefined;
  size?: ButtonProps["size"];
};

/**
 * Opens the share modal when the user has admin on the resource.
 */
export function ShareResourceButton({
  resourceName,
  resourceType,
  resourceId,
  size,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { isDisabled, tooltip } = useShareButtonState({
    resourceType,
    resourceId,
  });

  return (
    <Tooltip label={tooltip}>
      <Button
        size={size}
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
            title: t`Share “${resourceName}”`,
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
