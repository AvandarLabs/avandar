import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { useMemo } from "react";
import { LocalFiltersPField } from "@/views/DashboardApp/AvaPage/pfields/LocalFiltersPField/LocalFiltersPField";
import type { LocalFilter } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/DataVizFilters/DataVizFilters";

/**
 * React hook that returns the Puck `CustomField` config for the local-filters
 * field. The field `label` is translated via the Lingui macro, so this must
 * be invoked from a React component / hook.
 */
export function useLocalFiltersPFieldConfig(): CustomField<
  readonly LocalFilter[]
> {
  const { t } = useLingui();
  return useMemo(() => {
    return {
      label: t`Local filters (viewer-editable, this chart only)`,
      type: "custom",
      render: LocalFiltersPField,
    };
  }, [t]);
}
