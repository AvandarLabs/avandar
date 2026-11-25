import { useLingui } from "@lingui/react/macro";
import { Checkbox, Loader, Stack, Text } from "@mantine/core";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  chosenContentIds: readonly string[];
  onIsChosenChange: (contentId: string, isChosen: boolean) => void;
  importedContent: ImportedPluginContent;
}>;

/**
 * The install wizard's Content step: a checklist of the datasets the plugin
 * bundles, every one checked to start with. An item the workspace already
 * imported says so and cannot be chosen again.
 */
export function ContentStep({
  manifestModule,
  chosenContentIds,
  onIsChosenChange,
  importedContent,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{t`Datasets to import`}</InstallWizardStepHeading>
        <Text size="sm" c="dimmed">
          {t`Each one becomes a dataset in this workspace that every member can use.`}
        </Text>
      </Stack>
      {importedContent.isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : (
        <Stack gap="sm" role="group" aria-label={t`Datasets to import`}>
          {manifestModule.manifest.contributes.content.map((item) => {
            const isImported =
              getOwnValue(importedContent.importsByContentId, item.id) !==
              undefined;
            return (
              <Checkbox
                key={item.id}
                label={localize(item.title)}
                description={
                  isImported
                    ? t`Already in this workspace`
                    : localize(item.description)
                }
                checked={isImported || chosenContentIds.includes(item.id)}
                disabled={isImported}
                onChange={(event) => {
                  onIsChosenChange(item.id, event.currentTarget.checked);
                }}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
