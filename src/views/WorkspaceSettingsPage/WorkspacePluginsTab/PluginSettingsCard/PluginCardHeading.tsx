import { Group, Title } from "@mantine/core";
import { isPluginIconComponent } from "@/lib/plugins/isPluginIconComponent/isPluginIconComponent";
import { PluginStatusBadge } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginStatusBadge";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginIconComponent } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  /** The id of the heading, which the card and its actions point to. */
  headingId: string;
  pluginName: string;

  /** Undefined when the plugin has no icon, such as one no longer bundled. */
  icon: PluginIconComponent | undefined;
  status: PluginInstallStatus;
}>;

/**
 * The top row of a plugin's settings card: its icon, its name as a heading,
 * and its install status. The card is named by the heading, and each action
 * is described by it, so a screen reader hears which plugin an action is for.
 */
export function PluginCardHeading({
  headingId,
  pluginName,
  icon: PluginIcon,
  status,
}: Props): JSX.Element {
  return (
    <Group gap="sm" wrap="nowrap">
      {isPluginIconComponent(PluginIcon) ? (
        <PluginIcon size={28} aria-hidden />
      ) : null}
      {/* Order 5 nests the name under the tab's order 4 title. The size stays
          at h4 so the name keeps its look. */}
      <Title id={headingId} order={5} size="h4">
        {pluginName}
      </Title>
      <PluginStatusBadge status={status} />
    </Group>
  );
}
