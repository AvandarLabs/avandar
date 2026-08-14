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
 * Confirms making a resource private, stacked over the share modal.
 *
 * Never dismiss this with `modals.closeAll()`: the share modal's Done button
 * calls that (via the `onClose` that `ShareResourceButton` passes), and it
 * would tear down both dialogs. `openConfirmModal` manages its own id and
 * closes only itself.
 *
 * The caller is responsible for skipping this entirely when nothing would be
 * lost, which is the case when the resource is already private.
 */
export function openMakePrivateConfirmModal(
  options: Readonly<OpenMakePrivateConfirmModalOptions>,
): void {
  const { title, body, confirmLabel } = options.shareCopy.makePrivateConfirm({
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
