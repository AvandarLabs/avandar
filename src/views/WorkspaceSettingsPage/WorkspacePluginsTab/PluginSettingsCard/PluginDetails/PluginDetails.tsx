import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Box, Button, Collapse, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useId } from "react";
import { getContributionsFromManifest } from "@/lib/plugins/getContributionsFromManifest/getContributionsFromManifest";
import { PluginAdditionsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginAdditionsSection";
import { PluginDataAccessSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDataAccessSection";
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
  const { t, i18n } = useLingui();
  const [isExpanded, { toggle }] = useDisclosure(false);
  const regionId = useId();
  const { dataExplorerToolbarCommands, chartTypes } =
    getContributionsFromManifest(manifest);
  const getTitles = (contributions: ReadonlyArray<{ title: string }>) => {
    return contributions.map((contribution) => {
      return getLocalizedTextFromManifestStrings({
        strings,
        locale: i18n.locale,
        value: contribution.title,
      });
    });
  };
  const ToggleIcon = isExpanded ? IconChevronUp : IconChevronDown;
  return (
    <>
      <Button
        variant="subtle"
        color="neutral"
        size="compact-sm"
        w="fit-content"
        px={0}
        rightSection={<ToggleIcon size={14} aria-hidden />}
        aria-expanded={isExpanded}
        aria-controls={regionId}
        aria-describedby={headingId}
        onClick={toggle}
      >
        {isExpanded ? t`See less` : t`See more`}
      </Button>
      {/* The id sits on a wrapper because Collapse renders nothing while
          closed under reduced motion, and the toggle must always point at
          an element. */}
      <Box id={regionId}>
        <Collapse expanded={isExpanded}>
          <Stack gap="sm" pt="xxs">
            <PluginAdditionsSection
              toolbarCommandTitles={getTitles(dataExplorerToolbarCommands)}
              chartTypeTitles={getTitles(chartTypes)}
            />
            <PluginDataAccessSection
              permissions={manifest.permissions}
              hasChartTypes={chartTypes.length > 0}
            />
          </Stack>
        </Collapse>
      </Box>
    </>
  );
}
