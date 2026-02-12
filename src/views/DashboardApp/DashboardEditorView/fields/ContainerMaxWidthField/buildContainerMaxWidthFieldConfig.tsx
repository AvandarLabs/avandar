import { CustomField } from "@puckeditor/core";
import { constant } from "$/lib/utils/constant/constant";
import { DashboardFieldProps } from "../../utils/puck.types";
import {
  ContainerMaxWidthField,
  ContainerMaxWidthValue,
} from "./ContainerMaxWidthField";

// TODO(jpsyx): this should not be of type `unknown` and should be something
// more specific
const containerMaxWidthFieldConfig: CustomField<ContainerMaxWidthValue> = {
  label: "Container max width",
  type: "custom",
  render: (props: DashboardFieldProps<ContainerMaxWidthValue>) => {
    return <ContainerMaxWidthField {...props} />;
  },
};

export const buildContainerMaxWidthFieldConfig = constant(
  containerMaxWidthFieldConfig,
);
