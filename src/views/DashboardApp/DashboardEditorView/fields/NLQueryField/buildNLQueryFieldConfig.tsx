import { CustomField } from "@puckeditor/core";
import { NLQuery, NLQueryField } from "./NLQueryField";

export function buildNLQueryFieldConfig(): CustomField<NLQuery> {
  return {
    label: "Prompt",
    type: "custom",
    render: NLQueryField,
  };
}
