import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ListToggleButton } from "@/views/DataManagerApp/DataManagerToolbarActions/ListToggleButton";
import { NewCrosswalkButton } from "@/views/DataManagerApp/DataManagerToolbarActions/NewCrosswalkButton";
import { NewDictionaryMenu } from "@/views/DataManagerApp/DataManagerToolbarActions/NewDictionaryMenu";
import type { ReactNode } from "react";

type Props = {
  onNewDictionary: () => void;
  /** Set on a task view, where the list is hidden until shown. */
  listToggle: { isListShown: boolean; onToggle: () => void } | undefined;
};

/**
 * The Data Sources toolbar: Show list or Hide list on a task view, the New
 * dictionary menu for people who can edit dictionaries, New crosswalk for
 * people who can edit crosswalks, and Add new dataset.
 */
export function DataManagerToolbarActions({
  onNewDictionary,
  listToggle,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const { t } = useLingui();
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  const canEditCrosswalks = useHasPermission(
    "data_sources__can_edit_crosswalks",
  );

  return (
    <Group gap="xs" wrap="nowrap">
      {listToggle ? <ListToggleButton {...listToggle} /> : null}
      {canEditDictionaries ? (
        <NewDictionaryMenu onStartEmpty={onNewDictionary} />
      ) : null}
      {canEditCrosswalks ? <NewCrosswalkButton /> : null}
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
