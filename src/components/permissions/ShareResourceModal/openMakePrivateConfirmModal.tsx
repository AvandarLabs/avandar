import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ShareCopy } from "./shareCopy";

type OpenMakePrivateConfirmModalOptions = {
  shareCopy: ShareCopy;
  resourceName: string;
  app: string;
  numUsers: number;
  numGroups: number;
  losesWorkspaceAccess: boolean;
  onConfirm: () => void;
};

/**
 * Confirms making a resource private when another principal would lose access.
 */
export function openMakePrivateConfirmModal(
  options: Readonly<OpenMakePrivateConfirmModalOptions>,
): void {
  const { title, body, confirmLabel } = options.shareCopy.privateConfirmCopy({
    resourceName: options.resourceName,
    numUsers: options.numUsers,
    numGroups: options.numGroups,
    losesWorkspaceAccess: options.losesWorkspaceAccess,
    app: options.app,
  });

  modals.openConfirmModal({
    title,
    children: <Text size="sm">{body}</Text>,
    labels: { confirm: confirmLabel, cancel: options.shareCopy.cancelLabel },
    confirmProps: { color: "danger" },
    onConfirm: options.onConfirm,
  });
}
