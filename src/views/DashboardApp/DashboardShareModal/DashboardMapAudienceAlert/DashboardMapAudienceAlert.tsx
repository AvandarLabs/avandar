import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useLimitedAudienceMapNames } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/useLimitedAudienceMapNames";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  dashboard: Dashboard.T;
  targetVisibility: Dashboard.Visibility;
};

/**
 * Warns, without blocking, that some people who can open this dashboard
 * cannot open one of its maps and will see the no-access state in its place.
 * Silent for a public dashboard, whose maps are published as snapshots.
 */
export function DashboardMapAudienceAlert({
  dashboard,
  targetVisibility,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const mapNames = useLimitedAudienceMapNames(dashboard);
  if (targetVisibility === "public" || mapNames.length === 0) {
    return null;
  }
  const mapList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(mapNames);
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={20} aria-hidden />}
      title={t`Not everyone can see every map`}
      titleOrder={5}
      titleSize="sm"
      message={t`Some people who can open this dashboard cannot open ${mapList}. They will see "You don't have access to this map" in its place.`}
      messageSize="sm"
    />
  );
}
