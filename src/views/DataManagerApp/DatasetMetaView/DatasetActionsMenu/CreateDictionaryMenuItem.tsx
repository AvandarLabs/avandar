import { Trans } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A dataset menu's way into learning a dictionary from that dataset, for
 * people who can edit dictionaries. It opens the create flow at Review with
 * the dataset already being read.
 */
export function CreateDictionaryMenuItem({
  datasetId,
}: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const canEditDictionaries = useHasPermission(
    "data_sources__can_edit_dictionaries",
  );
  if (!canEditDictionaries) {
    return null;
  }
  const link = AppLinks.dataManagerNewDictionary(workspace.slug);
  return (
    <>
      <Menu.Item
        leftSection={<IconSparkles size={16} aria-hidden />}
        onClick={() => {
          navigate({
            to: link.to,
            params: link.params,
            search: { fromDatasetId: datasetId },
          });
        }}
      >
        <Text size="sm">
          <Trans>Create a dictionary from this dataset</Trans>
        </Text>
        <Text size="xs" c="dimmed">
          <Trans>Saved to Dictionaries, so other datasets can use it too</Trans>
        </Text>
      </Menu.Item>
      <Menu.Divider />
    </>
  );
}
