import type { Workspace } from "$/models/Workspace/Workspace";
import type { Props as DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { Field, Fields } from "@puckeditor/core";

import { useLingui } from "@lingui/react/macro";
import { ComponentConfig } from "@puckeditor/core";
import { useMemo } from "react";

import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizFilters } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { resolveDataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps/resolveDataVizPBlockProps";
import { useGlobalFilterSubscriptionPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/GlobalFilterSubscriptionPField/useGlobalFilterSubscriptionPFieldConfig";
import { useLocalFiltersPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/useLocalFiltersPFieldConfig";
import { useNLQueryPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/useNLQueryPFieldConfig";
import { useVizConfigPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/useVizConfigPFieldConfig";

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

type DataVizPBlockConfigOptions = {
  label: string;
  nlQueryField: Field<DataVizPBlockProps["nlQuery"]>;
  vizConfigField: Field<DataVizPBlockProps["vizConfig"]>;
  globalFilterField: Field<DataVizPBlockProps["globalFilterSubscription"]>;
  localFiltersField: Field<DataVizPBlockProps["localFilters"]>;
  vizTypeLabel: string;
};

type UseDataVizPBlockConfigOptions = {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
  snapshotRevision?: string;
};

function _getDataVizPBlockConfig(
  options: Readonly<DataVizPBlockConfigOptions>,
): ComponentConfig<DataVizPBlockProps> {
  return {
    label: options.label,
    fields: {
      nlQuery: options.nlQueryField,
      vizType: {
        label: options.vizTypeLabel,
        type: "select",
        options: VizTypes.map((vizType) => {
          return {
            label: vizTypeLabel(vizType),
            value: vizType,
          };
        }),
      },
      vizConfig: options.vizConfigField,
      globalFilterSubscription: options.globalFilterField,
      localFilters: options.localFiltersField,
    } as Fields<DataVizPBlockProps>,
    defaultProps,
    resolveData: (data, { changed, trigger }) => {
      return {
        props: resolveDataVizPBlockProps({
          props: data.props,
          changed,
          trigger,
        }),
      };
    },
    render: DataVizPBlock,
  };
}

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
export function useDataVizPBlockConfig(
  options: Readonly<UseDataVizPBlockConfigOptions>,
): ComponentConfig<DataVizPBlockProps> {
  const { t } = useLingui();
  const nlQueryFieldConfig = useNLQueryPFieldConfig();
  const vizConfigFieldConfig = useVizConfigPFieldConfig({
    workspaceId: options.workspaceId,
    dashboardId: options.dashboardId,
    snapshotRevision: options.snapshotRevision,
  });
  const globalFilterSubscriptionFieldConfig =
    useGlobalFilterSubscriptionPFieldConfig();
  const localFiltersFieldConfig = useLocalFiltersPFieldConfig();

  return useMemo(() => {
    return _getDataVizPBlockConfig({
      label: t`Data Visualization`,
      nlQueryField: nlQueryFieldConfig,
      vizConfigField: vizConfigFieldConfig,
      globalFilterField: globalFilterSubscriptionFieldConfig,
      localFiltersField: localFiltersFieldConfig,
      vizTypeLabel: t`Visualization Type`,
    });
  }, [
    t,
    nlQueryFieldConfig,
    vizConfigFieldConfig,
    globalFilterSubscriptionFieldConfig,
    localFiltersFieldConfig,
  ]);
}
