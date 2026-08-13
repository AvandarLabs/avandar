import { useLingui } from "@lingui/react/macro";
import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Configures ownership-transfer notifications and count invalidation. */
export function useTransferAllOwnedResources(
  options: Readonly<{
    workspaceId: Workspace.Id;
    onClose: () => void;
  }>,
): ReturnType<
  typeof PrivateResourceAdminClient.useTransferAllOwnedResources
> {
  const { t } = useLingui();
  return PrivateResourceAdminClient.useTransferAllOwnedResources({
    queriesToInvalidate: [
      PrivateResourceAdminClient.QueryKeys.getPrivateResourceCounts({
        workspaceId: options.workspaceId,
      }),
    ],
    onSuccess: () => {
      notifySuccess(t`Ownership reassigned.`);
      options.onClose();
    },
    onError: (error: Error) => {
      notifyError({ title: t`Reassign failed`, message: error.message });
    },
  });
}
