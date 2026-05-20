import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { GlobalFilterSubscriptionPField } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/GlobalFilterSubscriptionPField";
import type { GlobalFilterSubscription } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";

/**
 * React hook that returns the Puck `CustomField` config for the global filter
 * subscription field. The field `label` is translated via the Lingui macro,
 * so this must be invoked from a React component / hook.
 */
// eslint-disable-next-line max-len
export function useGlobalFilterSubscriptionPFieldConfig(): CustomField<GlobalFilterSubscription> {
  const { t } = useLingui();
  return {
    label: t`Global filters`,
    type: "custom",
    render: GlobalFilterSubscriptionPField,
  };
}
