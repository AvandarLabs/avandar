import { useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Closes the modal the gate is in. */
  onClose: () => void;

  /** What a settings admin sees. */
  children: ReactNode;
}>;

/**
 * Shows its children only to a settings admin. While the user's roles load
 * it shows a loader, and anyone else is told to ask a workspace admin, with
 * a Close button. The binding modal checks here, not in the command that
 * opens it, because the roles are read through the router, which a modal
 * under the workspace layout always has and a plugin command may not.
 */
export function DataSlotBindingAdminGate({
  onClose,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [, isLoadingRoles] = useUserAppRoles();
  const canManagePlugins = useHasPermission("settings__can_manage_plugins");
  if (isLoadingRoles) {
    return (
      <Loader size="sm" role="status" aria-label={t`Checking your access`} />
    );
  }
  if (canManagePlugins) {
    return <>{children}</>;
  }
  return (
    <Stack gap="lg">
      <Text size="sm">
        {t`Ask a workspace admin to choose which records this plugin reads.`}
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {t`Close`}
        </Button>
      </Group>
    </Stack>
  );
}
