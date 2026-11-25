import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";

type Props = Readonly<{ status: PluginInstallStatus }>;

/** The color each status takes. Only states that need attention are loud. */
const COLOR_BY_STATUS: Record<PluginInstallStatus, string> = {
  not_installed: "neutral",
  installed: "success",
  disabled: "neutral",
  needs_review: "warning",
  unavailable: "danger",
};

/**
 * A plugin's install status as a colored badge, so an admin can scan the
 * Plugins settings tab for plugins that are off or need attention.
 */
export function PluginStatusBadge({ status }: Props): JSX.Element {
  const { t } = useLingui();
  const label = matchLiteral(status, {
    not_installed: t`Not installed`,
    installed: t`Installed`,
    disabled: t`Disabled`,
    needs_review: t`Needs review`,
    unavailable: t`Unavailable`,
  });
  return (
    <Badge color={COLOR_BY_STATUS[status]} variant="light">
      {label}
    </Badge>
  );
}
