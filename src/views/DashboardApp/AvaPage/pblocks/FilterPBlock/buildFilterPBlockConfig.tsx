import { useLingui } from "@lingui/react/macro";
import { ComponentConfig } from "@puckeditor/core";
import { FilterPBlock } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";
import type { FilterPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/FilterPBlock/FilterPBlock";

/**
 * Build the Puck component config for the dashboard's Filter block. Reads the
 * Lingui `t` from `useLingui()` so labels, default props, and category
 * metadata can be translated. Must be invoked from React component / hook
 * context.
 */
export function useFilterPBlockConfig(): ComponentConfig<FilterPBlockProps> {
  const { t } = useLingui();

  const defaultProps: FilterPBlockProps = {
    filterId: "",
    label: t`Filter`,
    columnName: "",
    mode: "select_single",
    optionsRaw: "",
    defaultValue: "",
  };

  return {
    label: t`Filter`,
    fields: {
      filterId: {
        label: t`Filter id (stable)`,
        type: "text",
      },
      label: {
        label: t`Label`,
        type: "text",
      },
      columnName: {
        label: t`Column name in SQL`,
        type: "text",
      },
      mode: {
        label: t`Mode`,
        type: "select",
        options: [
          { label: t`Single select`, value: "select_single" },
          { label: t`Multi select`, value: "select_multi" },
          { label: t`Contains (free-text)`, value: "contains" },
        ],
      },
      optionsRaw: {
        label: t`Options (comma-separated, for select modes)`,
        type: "textarea",
      },
      defaultValue: {
        label: t`Default value`,
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
