import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";

import { AvaMapClient } from "@/clients/maps/AvaMapClient/AvaMapClient";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { notifySuccess } from "@/utils/notifications/notify";

type Props = { avaMap: AvaMap.T };

/**
 * Deletes one map after an irreversible-action confirmation.
 *
 * Renders nothing for a user without the map-management permission, which
 * mirrors the `maps` delete policy that only admins can satisfy.
 */
export function DeleteMapButton({ avaMap }: Props): ReactNode {
  const { t } = useLingui();
  const canManageMaps = useHasPermission("gis__can_manage_maps");
  const [deleteMap, isDeleting] = AvaMapClient.useDelete({
    queriesToInvalidate: [AvaMapClient.QueryKeys.getAll()],
    onSuccess: () => {
      notifySuccess({
        title: t`Map deleted`,
        message: t`${avaMap.name} was deleted.`,
      });
    },
  });

  if (!canManageMaps) {
    return null;
  }

  const label = t`Delete the map ${avaMap.name}`;

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant="subtle"
        color="danger"
        size="sm"
        aria-label={label}
        loading={isDeleting}
        onClick={() => {
          modals.openConfirmModal({
            title: t`Delete map?`,
            children: t`${avaMap.name} and its layers will be removed. This cannot be undone.`,
            labels: { confirm: t`Delete`, cancel: t`Cancel` },
            confirmProps: { color: "danger" },
            onConfirm: () => {
              deleteMap({ id: avaMap.id });
            },
          });
        }}
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}
