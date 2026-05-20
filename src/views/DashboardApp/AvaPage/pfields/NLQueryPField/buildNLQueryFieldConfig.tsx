import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import {
  NLQuery,
  NLQueryPField,
} from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";

/**
 * React hook that builds the Puck `CustomField` config for the NL query field.
 *
 * The field `label` is translated via the Lingui macro, so this must be
 * invoked from a React component / hook.
 */
export function useNLQueryPFieldConfig(): CustomField<NLQuery> {
  const { t } = useLingui();
  return {
    label: t`Prompt`,
    type: "custom",
    render: NLQueryPField,
  };
}
