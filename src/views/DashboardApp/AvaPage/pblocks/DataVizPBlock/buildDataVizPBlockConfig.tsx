import { ComponentConfig } from "@puckeditor/core";
import { DashboardId } from "$/models/Dashboard/Dashboard.types";
import { VizConfigs, VizTypes } from "$/models/vizs/VizConfig/VizConfigs";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import { resolveDataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/resolveDataVizPBlockProps";
import { buildNLQueryPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/buildNLQueryFieldConfig";
import { buildVizConfigPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/buildVizConfigPFieldConfig";
import type { DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
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
};

const vizTypeOptions = VizTypes.map((vizType) => {
  return {
    label: VizConfigs.getDisplayName(vizType),
    value: vizType,
  };
});

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
 */
export function buildDataVizPBlockConfig(options: {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
  dashboardId: DashboardId;
}): ComponentConfig<DataVizPBlockProps> {
  return {
    label: "Data Visualization",
    fields: {
      nlQuery: buildNLQueryPFieldConfig(),
      vizType: {
        label: "Visualization Type",
        type: "select",
        options: vizTypeOptions,
      },
      vizConfig: buildVizConfigPFieldConfig({
        workspaceId: options.workspaceId,
        dashboardId: options.dashboardId,
      }),
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
}
