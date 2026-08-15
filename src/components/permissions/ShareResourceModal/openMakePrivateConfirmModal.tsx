import { t } from "@lingui/core/macro";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { makePrivateConfirmCopy } from "./copy/makePrivateConfirmCopy";

type OpenMakePrivateConfirmModalOptions = {
  resourceName: string;
  app: string;
  numUsers: number;
  numGroups: number;
  losesWorkspaceAccess: boolean;
  isPubliclyPublished: boolean;
  onConfirm: () => void;
};

/**
 * Confirms making a resource private when another principal would lose access.
 */
export function openMakePrivateConfirmModal(
  options: Readonly<OpenMakePrivateConfirmModalOptions>,
): void {
  const { title, body, confirmLabel } = makePrivateConfirmCopy({
    resourceName: options.resourceName,
    numUsers: options.numUsers,
    numGroups: options.numGroups,
    losesWorkspaceAccess: options.losesWorkspaceAccess,
    app: options.app,
    isPubliclyPublished: options.isPubliclyPublished,
  });

  modals.openConfirmModal({
    title,
    children: <Text size="sm">{body}</Text>,
    labels: { confirm: confirmLabel, cancel: t`Cancel` },
    confirmProps: { color: "danger" },
    onConfirm: options.onConfirm,
  });
}
