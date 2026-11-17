import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { PluginLookupFeedback } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginLookupFeedback";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";

type Props = Readonly<{
  state: LookupState;
  onRetry: () => void;
}>;

/**
 * In the uninstall modal, says the imported datasets could not be loaded and
 * lets the admin retry, then says every dataset stays. It is always mounted,
 * so the retry and the recovery are announced, and it shows nothing while the
 * datasets are fine.
 */
export function UninstallContentFailure({
  state,
  onRetry,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <>
      <PluginLookupFeedback
        state={state}
        message={t`We could not load the datasets this plugin imported.`}
        retryingMessage={t`Loading the datasets this plugin imported.`}
        recoveredMessage={t`The datasets this plugin imported are loaded.`}
        onRetry={onRetry}
      />
      {state === "ok" ? null : (
        <Text size="sm" c="dimmed">
          {t`Every dataset it imported stays in Data Sources.`}
        </Text>
      )}
    </>
  );
}
