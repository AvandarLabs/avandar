import { Trans, useLingui } from "@lingui/react/macro";
import { Progress, Text } from "@mantine/core";
import { findLocalChatModel } from "@/lib/offlineChat/localChatModelCatalog";
import { useOfflineChatManagerStatus } from "@/lib/offlineChat/useOfflineChatManagerStatus";
import css from "./OfflineChatDownloadIndicator.module.css";

/**
 * Floating panel anchored to the bottom-right while an offline chat model
 * (WebLLM) is downloading or initializing.
 */
export function OfflineChatDownloadIndicator(): JSX.Element | null {
  const { t } = useLingui();
  const status = useOfflineChatManagerStatus();

  if (status.kind !== "downloading") {
    return null;
  }

  const model = findLocalChatModel(status.modelId);
  const message = t`Downloading ${model.displayName} for offline chat`;
  const progressPercent = Math.round(
    Math.min(100, Math.max(0, status.progress * 100)),
  );
  const overallLabel =
    progressPercent > 0 ? `${progressPercent}%` : t`Starting…`;

  return (
    <div
      className={css.root}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={css.titleRow}>
        <p className={css.title}>{model.displayName}</p>
        <Text size="xs" c="neutral.7" fw={600}>
          {overallLabel}
        </Text>
      </div>

      <Text size="xs" c="danger" fw={600} className={css.warning}>
        <Trans>
          Do not refresh or close this tab — the download will be canceled.
        </Trans>
      </Text>

      <Progress
        value={progressPercent}
        size="sm"
        radius="xl"
        color="primary"
        aria-label={overallLabel}
      />

      {status.statusText.length > 0 ?
        <Text size="xs" className={css.statusText}>
          {status.statusText}
        </Text>
      : null}
    </div>
  );
}
