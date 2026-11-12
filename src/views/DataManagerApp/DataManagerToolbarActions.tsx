import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconBook, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

type Props = {
  onNewDictionary: () => void;
};

/**
 * The Data Sources toolbar buttons: New dictionary for people who can edit
 * dictionaries, and Add new dataset.
 */
export function DataManagerToolbarActions({
  onNewDictionary,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const { t } = useLingui();
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );

  return (
    <Group gap="xs" wrap="nowrap">
      {canEditDictionaries ? (
        <Button
          leftSection={<IconBook size={18} aria-hidden />}
          onClick={onNewDictionary}
          size="compact-sm"
          variant="default"
        >
          {t`New dictionary`}
        </Button>
      ) : null}
      <Button
        leftSection={<IconPlus size={18} />}
        onClick={() => {
          navigate(AppLinks.dataImport(workspace.slug));
        }}
        size="compact-sm"
        variant="light"
      >
        {t`Add new dataset`}
      </Button>
    </Group>
  );
}
