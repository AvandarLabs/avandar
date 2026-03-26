import { ComponentConfig } from "@puckeditor/core";
import { buildNLQueryPFieldConfig } from "../../pfields/NLQueryPField/buildNLQueryFieldConfig";
import { DataVizPBlock } from "./DataVizPBlock/DataVizPBlock";
import type { DataVizPBlockProps } from "./DataVizPBlock/DataVizPBlock";
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
