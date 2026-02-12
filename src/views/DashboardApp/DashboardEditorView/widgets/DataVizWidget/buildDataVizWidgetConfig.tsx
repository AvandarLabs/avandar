import { ComponentConfig } from "@puckeditor/core";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { buildNLQueryFieldConfig } from "../../fields/NLQueryField/buildNLQueryFieldConfig";
import { DataVizWidget, DataVizWidgetProps } from "./DataVizWidget";

const defaultProps: DataVizWidgetProps = {
  nlQuery: {
    prompt: "",
    rawSql: "",
    generations: [],
  },
};

export function buildDataVizWidgetConfig(_options: {
  dashboardTitle: string;
  workspaceId: WorkspaceId | undefined;
}): ComponentConfig<DataVizWidgetProps> {
  return {
    label: "DataViz",
    fields: {
      nlQuery: buildNLQueryFieldConfig(),
    },
    defaultProps,
    render: DataVizWidget,
  };
}
