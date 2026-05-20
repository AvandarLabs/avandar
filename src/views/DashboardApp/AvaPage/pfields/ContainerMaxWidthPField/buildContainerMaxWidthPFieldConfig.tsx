import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import {
  ContainerMaxWidthPField,
  ContainerMaxWidthValue,
} from "@/views/DashboardApp/AvaPage/pfields/ContainerMaxWidthPField/ContainerMaxWidthPField";

/**
 * React hook that returns the Puck `CustomField` config for the container
 * max-width field. The field `label` is translated via the Lingui macro, so
 * this must be invoked from a React component / hook.
 */
// TODO(jpsyx): this should not be of type `unknown` and should be something
// more specific
export function useContainerMaxWidthPFieldConfig(): CustomField<ContainerMaxWidthValue> {
  const { t } = useLingui();
  return {
    label: t`Container max width`,
    type: "custom",
    render: (props: AvaPageFieldProps<ContainerMaxWidthValue>) => {
      return <ContainerMaxWidthPField {...props} />;
    },
  };
}
