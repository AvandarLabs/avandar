import { CustomField } from "@puckeditor/core";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
import { LocalFiltersPField } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFiltersPField";

export function buildLocalFiltersPFieldConfig(): CustomField<
  readonly LocalFilter[]
> {
  return {
    label: "Local filters (viewer-editable, this chart only)",
    type: "custom",
    render: LocalFiltersPField,
  };
}
