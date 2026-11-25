import { useLingui } from "@lingui/react/macro";
import { Box, Collapse, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useId } from "react";
import { getLocalizedContributionTitlesFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/getLocalizedContributionTitlesFromManifest";
import { PluginAdditionsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection";
import { PluginDataAccessSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection";
import { PluginDetailsToggle } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsToggle";
import type {
  PluginLocaleMessages,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  manifest: PluginManifest;

  /** The plugin's locale strings, for localizing its contribution titles. */
  strings: PluginLocaleMessages;

  /** The id of the card's heading, which describes the toggle. */
  headingId: string;
}>;

/**
 * What a plugin adds and which data it can read, in plain language, behind a
 * "See more" toggle so a plugin's settings card stays short until an admin
 * wants the detail to judge the plugin before installing it.
 */
export function PluginDetails({
  manifest,
  strings,
  headingId,
}: Props): JSX.Element {
  const { i18n } = useLingui();
  const [isExpanded, { toggle }] = useDisclosure(false);
  const regionId = useId();
  const titles = getLocalizedContributionTitlesFromManifest({
    manifest,
    strings,
    locale: i18n.locale,
  });
  return (
    <>
      <PluginDetailsToggle
        isExpanded={isExpanded}
        regionId={regionId}
        headingId={headingId}
        onToggle={toggle}
      />
      {/* The id sits on a wrapper because Collapse renders nothing while
          closed under reduced motion, and the toggle must always point at
          an element. */}
      <Box id={regionId}>
        <Collapse expanded={isExpanded}>
          <Stack gap="sm" pt="xxs">
            <PluginAdditionsSection
              {...titles}
              contentCount={manifest.contributes.content.length}
              aiToolCount={manifest.contributes.aiTools.length}
            />
            <PluginDataAccessSection
              permissions={manifest.permissions}
              hasChartTypes={titles.chartTypeTitles.length > 0}
            />
          </Stack>
        </Collapse>
      </Box>
    </>
  );
}
