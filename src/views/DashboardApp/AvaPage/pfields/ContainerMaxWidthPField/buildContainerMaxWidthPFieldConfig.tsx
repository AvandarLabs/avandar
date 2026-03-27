import { CustomField } from "@puckeditor/core";
import { constant } from "@utils/misc/constant/constant";
import { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import {
  ContainerMaxWidthPField,
  ContainerMaxWidthValue,
} from "@/views/DashboardApp/AvaPage/pfields/ContainerMaxWidthPField/ContainerMaxWidthPField";

// TODO(jpsyx): this should not be of type `unknown` and should be something
// more specific
const containerMaxWidthPFieldConfig: CustomField<ContainerMaxWidthValue> = {
  label: "Container max width",
  type: "custom",
  render: (props: AvaPageFieldProps<ContainerMaxWidthValue>) => {
    return <ContainerMaxWidthPField {...props} />;
  },
};

export const buildContainerMaxWidthPFieldConfig = constant(
  containerMaxWidthPFieldConfig,
);
