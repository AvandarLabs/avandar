import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { ConfirmContentItemRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/ConfirmContentItemRow";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { InstallWizardContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardContent";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  content: InstallWizardContent;
}>;

/**
 * The Confirm step's list of the datasets the install imports. Once the
 * imports start, each one shows its progress, and a failed one shows why
 * with a Retry button. Shows nothing for a plugin without content.
 */
export function ConfirmContentSummary({
  manifestModule,
  content,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const { statusesByContentId, importItems } = content.contentImports;
  const allItems = manifestModule.manifest.contributes.content;
  const startedItems = allItems.filter((item) => {
    return getOwnValue(statusesByContentId, item.id) !== undefined;
  });
  const items = startedItems.length > 0 ? startedItems : content.itemsToImport;
  if (allItems.length === 0) {
    return null;
  }
  return (
    <PluginDetailsSection title={t`Datasets to import`} headingOrder={4}>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">{t`None`}</Text>
      ) : (
        <Stack gap="xs" aria-live="polite">
          {items.map((item) => {
            return (
              <ConfirmContentItemRow
                key={item.id}
                title={localize(item.title)}
                status={getOwnValue(statusesByContentId, item.id)}
                onRetry={() => {
                  void importItems([item]);
                }}
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
