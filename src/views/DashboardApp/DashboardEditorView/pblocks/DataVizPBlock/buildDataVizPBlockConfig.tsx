import { ComponentConfig } from "@puckeditor/core";
import { buildNLQueryFieldConfig } from "../../fields/NLQueryField/buildNLQueryFieldConfig";
import { DataVizPBlock } from "./DataVizPBlock";
import type { DataVizPBlockProps } from "./DataVizPBlock";
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
    label: "DataViz",
    fields: {
      nlQuery: buildNLQueryFieldConfig(),
    },
    defaultProps,
    render: DataVizPBlock,
  };
}
