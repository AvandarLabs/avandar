import { CustomField } from "@puckeditor/core";
import { NLQuery, NLQueryPField } from "./NLQueryPField";

export function buildNLQueryPFieldConfig(): CustomField<NLQuery> {
  return {
    label: "Prompt",
    type: "custom",
    render: NLQueryPField,
  };
}
