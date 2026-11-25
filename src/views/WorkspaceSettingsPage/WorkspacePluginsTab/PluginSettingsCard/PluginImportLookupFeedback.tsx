import { useLingui } from "@lingui/react/macro";
import { PluginLookupFeedback } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginLookupFeedback";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";

type Props = Readonly<{
  state: LookupState;
  onRetry: () => void;

  /** The id of the card's heading, which says which plugin Retry is for. */
  headingId: string;
}>;

/**
 * On a plugin's card, tells an admin that we could not check whether the
 * plugin imported datasets, and lets them retry. Uninstall stays available
 * meanwhile as an uninstall that keeps every dataset.
 */
export function PluginImportLookupFeedback({
  state,
  onRetry,
  headingId,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <PluginLookupFeedback
      state={state}
      message={t`We could not check whether this plugin imported datasets.`}
      retryingMessage={t`Checking for datasets this plugin imported.`}
      recoveredMessage={t`We checked for datasets this plugin imported.`}
      onRetry={onRetry}
      describedById={headingId}
      mt="md"
    />
  );
}
