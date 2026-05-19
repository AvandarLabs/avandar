import { CustomField } from "@puckeditor/core";
import type { GlobalFilterSubscription } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
import { GlobalFilterSubscriptionPField } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/GlobalFilterSubscriptionPField";

export function buildGlobalFilterSubscriptionPFieldConfig(): CustomField<
  GlobalFilterSubscription
> {
  return {
    label: "Global filters",
    type: "custom",
    render: GlobalFilterSubscriptionPField,
  };
}
