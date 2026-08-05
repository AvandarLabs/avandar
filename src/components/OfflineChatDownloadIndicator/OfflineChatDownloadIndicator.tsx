import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { Trans, useLingui } from "@lingui/react/macro";
import { Progress, Text } from "@mantine/core";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { useOfflineChatEngineStatus } from "@/hooks/localChatModels/useOfflineChatEngineStatus";
import css from "./OfflineChatDownloadIndicator.module.css";

/**
 * Floating panel anchored to the bottom-left while an offline chat model
 * (WebLLM) is downloading or initializing.
 */
export function OfflineChatDownloadIndicator(): JSX.Element | null {
  const { t } = useLingui();
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const status = useOfflineChatEngineStatus();

  if (status.kind !== "downloading") {
    return null;
  }

  const model = LocalChatModel.Catalog.find(status.modelId);
  const modelCopy = getLocalChatModelCopy(model);
  const message = t`Downloading ${modelCopy.displayName} for offline chat`;
  const progressPercent = Math.round(
    Math.min(100, Math.max(0, status.progress * 100)),
  );
  const overallLabel =
    progressPercent > 0 ? `${progressPercent}%` : t`Starting…`;

  return (
    <div
      className={css.offlineChatDownloadIndicator}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={css.offlineChatDownloadIndicatorTitleRow}>
        <p className={css.offlineChatDownloadIndicatorTitle}>
          {modelCopy.displayName}
        </p>
        <Text size="xs" c="neutral.7" fw={600}>
          {overallLabel}
        </Text>
      </div>

      <Text
        size="xs"
        c="danger"
        fw={600}
        className={css.offlineChatDownloadIndicatorWarning}
      >
        <Trans>
          Do not refresh or close this tab or else the download will be
          canceled.
        </Trans>
      </Text>

      <Progress
        value={progressPercent}
        size="sm"
        radius="xl"
        color="primary"
        aria-label={overallLabel}
      />

      <Text size="xs" className={css.offlineChatDownloadIndicatorStatus}>
        <Trans>Preparing model files…</Trans>
      </Text>
    </div>
  );
}
