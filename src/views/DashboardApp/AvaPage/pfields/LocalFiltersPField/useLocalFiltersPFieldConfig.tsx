import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { useMemo } from "react";
import { LocalFiltersPField } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFiltersPField";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type {
  LegacyLocalFilter,
  LocalFilter,
} from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

/**
 * React hook that returns the Puck `CustomField` config for the local-filters
 * field. The field `label` is translated via the Lingui macro, so this must
 * be invoked from a React component / hook.
 */
export function useLocalFiltersPFieldConfig(
  auth: StructuredQueryAuth,
): CustomField<readonly LocalFilter[] | readonly LegacyLocalFilter[]> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      label: t`Local filters (viewer-editable, this chart only)`,
      type: "custom",
      render: () => {
        return <LocalFiltersPField auth={auth} />;
      },
    };
  }, [t, auth]);
}
