import { ComponentConfig } from "@puckeditor/core";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { buildNLQueryFieldConfig } from "../../fields/NLQueryField/buildNLQueryFieldConfig";
import { DataVizPBlock } from "./DataVizPBlock";
import type { DataVizPBlockProps } from "./DataVizPBlock";

const defaultProps: DataVizPBlockProps = {
  nlQuery: {
    prompt: "",
    rawSql: "",
    generations: [],
  },
};

export function buildDataVizPBlockConfig(_options: {
  dashboardTitle: string;
  workspaceId: WorkspaceId | undefined;
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
