import { Trans, useLingui } from "@lingui/react/macro";
import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { LocalChatModelCatalog } from "@/lib/offlineChat/LocalChatModelCatalog/LocalChatModelCatalog";
import { useLocalChatModelCopy } from "@/lib/offlineChat/useLocalChatModelCopy/useLocalChatModelCopy";
import type { LocalChatModelId } from "@/lib/offlineChat/LocalChatModelCatalog/LocalChatModelCatalog";

type Props = {
  downloadedModelIds: readonly LocalChatModelId[];
  deletingModelId?: LocalChatModelId;
  areControlsDisabled: boolean;
  onRequestDelete: (modelId: LocalChatModelId) => void;
};

/** Lists downloaded offline models with controls for removing each one. */
export function DownloadedModelList({
  downloadedModelIds,
  deletingModelId,
  areControlsDisabled,
  onRequestDelete,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  if (downloadedModelIds.length === 0) {
    return null;
  }

  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        <Trans>Downloaded on this browser</Trans>
      </Text>
      {downloadedModelIds.map((modelId) => {
        const model = LocalChatModelCatalog.find(modelId);
        const modelCopy = getLocalChatModelCopy(model);
        return (
          <Group key={modelId} justify="space-between" wrap="nowrap">
            <Text size="sm" truncate>
              {modelCopy.displayName}
            </Text>
            <Tooltip label={t`Remove ${modelCopy.displayName}`}>
              <ActionIcon
                variant="subtle"
                color="neutral"
                size="sm"
                aria-label={t`Remove ${modelCopy.displayName}`}
                loading={deletingModelId === modelId}
                disabled={areControlsDisabled}
                onClick={() => {
                  onRequestDelete(modelId);
                }}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      })}
    </Stack>
  );
}
