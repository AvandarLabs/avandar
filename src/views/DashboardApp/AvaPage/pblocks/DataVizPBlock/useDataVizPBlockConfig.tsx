import { useLingui } from "@lingui/react/macro";
import { ComponentConfig } from "@puckeditor/core";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import { useMemo } from "react";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { resolveDataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps/resolveDataVizPBlockProps";
import { useGlobalFilterSubscriptionPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/useGlobalFilterSubscriptionPFieldConfig";
import { useLocalFiltersPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/useLocalFiltersPFieldConfig";
import { useNLQueryPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/useNLQueryPFieldConfig";
import { useVizConfigPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/useVizConfigPFieldConfig";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { Workspace } from "$/models/Workspace/Workspace";

const DEFAULT_VIZ_TYPE = "table" as const;

const defaultProps: DataVizPBlockProps = {
  nlQuery: {
    prompt: "",
    rawSql: "",
    generations: [],
  },
  vizType: DEFAULT_VIZ_TYPE,
  vizConfig: VizConfigs.makeEmptyConfig(DEFAULT_VIZ_TYPE),
  globalFilterSubscription: DataVizFilters.defaultGlobalFilterSubscription,
  localFilters: [],
};

/**
 * Build the Puck component config for the dashboard's Data Visualization
 * block.
 *
 * Top-level fields are `nlQuery`, `vizType`, and `vizConfig`. `vizType` is a
 * regular Puck select so it appears as a first-class control alongside the
 * prompt; `vizConfig` is a custom field that renders the per-type subform
 * (axis pickers, legend toggle, etc.). The `resolveData` hook keeps the two
 * in sync by running `VizConfigs.convertVizConfig` whenever the user picks a
 * different `vizType`, and by falling back to defaults when older saved data
 * is missing either field.
 *
 * This is a React hook because it composes the per-field configs (which are
 * themselves hooks). It must be invoked from a React component / hook.
 */
export function useDataVizPBlockConfig(options: {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
}): ComponentConfig<DataVizPBlockProps> {
  const { t } = useLingui();
  const nlQueryFieldConfig = useNLQueryPFieldConfig();
  const vizConfigFieldConfig = useVizConfigPFieldConfig({
    workspaceId: options.workspaceId,
    dashboardId: options.dashboardId,
  });
  const globalFilterSubscriptionFieldConfig =
    useGlobalFilterSubscriptionPFieldConfig();
  const localFiltersFieldConfig = useLocalFiltersPFieldConfig();

  return useMemo(() => {
    return {
      label: t`Data Visualization`,
      fields: {
        nlQuery: nlQueryFieldConfig,
        vizType: {
          label: t`Visualization Type`,
          type: "select",
          options: VizTypes.map((vizType) => {
            return {
              label: vizTypeLabel(vizType),
              value: vizType,
            };
          }),
        },
        vizConfig: vizConfigFieldConfig,
        globalFilterSubscription: globalFilterSubscriptionFieldConfig,
        localFilters: localFiltersFieldConfig,
      },
      defaultProps,
      resolveData: (data, { changed }) => {
        const nextProps = resolveDataVizPBlockProps({
          props: data.props,
          changed,
        });
        return { props: nextProps };
      },
      render: DataVizPBlock,
    };
  }, [
    t,
    nlQueryFieldConfig,
    vizConfigFieldConfig,
    globalFilterSubscriptionFieldConfig,
    localFiltersFieldConfig,
  ]);
}
