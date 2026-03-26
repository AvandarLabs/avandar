import { ComponentConfig } from "@puckeditor/core";
import { buildNLQueryPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/buildNLQueryFieldConfig";
import { DataVizPBlock } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { DataVizPBlockProps } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizPBlock";
import type { Workspace } from "$/models/Workspace/Workspace";

const defaultProps: DataVizPBlockProps = {
  nlQuery: {
    prompt: "",
    rawSql: "",
    generations: [],
  },
};

export function buildDataVizPBlockConfig(_options: {
  dashboardTitle: string;
  workspaceId: Workspace.Id | undefined;
}): ComponentConfig<DataVizPBlockProps> {
  return {
    label: "Data Visualization",
    fields: {
      nlQuery: buildNLQueryPFieldConfig(),
    },
    defaultProps,
    render: DataVizPBlock,
  };
}
