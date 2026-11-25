import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { getLocalizedContributionTitlesFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest";
import { PluginAdditionsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection";
import { PluginDataAccessSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{ manifestModule: PluginManifestModule }>;

/**
 * The install wizard's first page: who publishes the plugin, its version and
 * license, what it does, what it adds, and which data it can read, all shown
 * at once so an admin can judge the plugin before going on.
 */
export function ReviewStep({ manifestModule }: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const { manifest, strings } = manifestModule;
  const titles = getLocalizedContributionTitlesFromManifest({
    manifest,
    strings,
    locale: i18n.locale,
  });
  const publisher = manifest.id.split(".")[0] ?? "";
  const { version, license } = manifest;
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{t`About this plugin`}</InstallWizardStepHeading>
        <Text size="sm" c="dimmed">
          {t`${publisher} · version ${version} · ${license} license`}
        </Text>
        <Text size="sm">
          {getLocalizedTextFromManifestStrings({
            strings,
            locale: i18n.locale,
            value: manifest.description,
          })}
        </Text>
      </Stack>
      <PluginAdditionsSection
        {...titles}
        contentCount={manifest.contributes.content.length}
        aiToolCount={manifest.contributes.aiTools.length}
        headingOrder={4}
      />
      <PluginDataAccessSection
        permissions={manifest.permissions}
        hasChartTypes={titles.chartTypeTitles.length > 0}
        headingOrder={4}
      />
    </Stack>
  );
}
