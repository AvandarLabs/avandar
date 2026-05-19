import { CustomField } from "@puckeditor/core";
import { GlobalFilterSubscriptionPField } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/GlobalFilterSubscriptionPField";
import type { GlobalFilterSubscription } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";

// eslint-disable-next-line max-len
export function buildGlobalFilterSubscriptionPFieldConfig(): CustomField<GlobalFilterSubscription> {
  return {
    label: "Global filters",
    type: "custom",
    render: GlobalFilterSubscriptionPField,
  };
}
