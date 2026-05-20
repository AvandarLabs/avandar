import { ComponentConfig } from "@puckeditor/core";
import { FilterPBlock } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";
import type { FilterPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";

const defaultProps: FilterPBlockProps = {
  filterId: "",
  label: "Filter",
  columnName: "",
  mode: "select_single",
  optionsRaw: "",
  defaultValue: "",
};

export function buildFilterPBlockConfig(): ComponentConfig<FilterPBlockProps> {
  return {
    label: "Filter",
    fields: {
      filterId: {
        label: "Filter id (stable)",
        type: "text",
      },
      label: {
        label: "Label",
        type: "text",
      },
      columnName: {
        label: "Column name in SQL",
        type: "text",
      },
      mode: {
        label: "Mode",
        type: "select",
        options: [
          { label: "Single select", value: "select_single" },
          { label: "Multi select", value: "select_multi" },
          { label: "Contains (free-text)", value: "contains" },
        ],
      },
      optionsRaw: {
        label: "Options (comma-separated, for select modes)",
        type: "textarea",
      },
      defaultValue: {
        label: "Default value",
        type: "text",
      },
    },
    defaultProps,
    resolveData: (data) => {
      const props: FilterPBlockProps = {
        ...defaultProps,
        ...data.props,
        // Auto-assign a stable id if missing so newly dropped filters work.
        filterId:
          data.props.filterId && data.props.filterId.length > 0 ?
            data.props.filterId
          : `filter-${data.props.id ?? crypto.randomUUID()}`,
      };
      return { props };
    },
    render: FilterPBlock,
  };
}
