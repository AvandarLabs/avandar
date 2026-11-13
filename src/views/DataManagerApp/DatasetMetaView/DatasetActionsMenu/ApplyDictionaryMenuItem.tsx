import { Trans } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A dataset menu's way into applying dictionaries to that dataset.
 * `DictionaryMenuItems` decides who sees it.
 */
export function ApplyDictionaryMenuItem({
  datasetId,
}: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  return (
    <Menu.Item
      leftSection={<IconBook size={16} aria-hidden />}
      onClick={() => {
        navigate(
          AppLinks.dataManagerApplyDictionaries({
            workspaceSlug: workspace.slug,
            datasetId,
          }),
        );
      }}
    >
      <Text size="sm">
        <Trans>Apply a dictionary</Trans>
      </Text>
      <Text size="xs" c="dimmed">
        <Trans>Turn codes into labels and add column descriptions</Trans>
      </Text>
    </Menu.Item>
  );
}
