import { useLingui } from "@lingui/react/macro";
import { useCallback, useMemo } from "react";
import { VizTypePField } from "@/views/DashboardApp/AvaPage/pfields/VizTypePField/VizTypePField";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { CustomField } from "@puckeditor/core";

/**
 * Builds the Puck `CustomField` config for a chart block's chart type, which
 * lists the built-in viz types and the workspace's plugin chart types. Takes
 * the chart query's auth so the field can read the result columns a picked
 * plugin chart fills its column settings from. A hook because the field
 * `label` is translated with the Lingui macro.
 */
export function useVizTypePFieldConfig(
  auth: Readonly<StructuredQueryAuth>,
): CustomField<AvaVizConfig.Type> {
  const { t } = useLingui();

  const render = useCallback(
    ({ onChange }: AvaPageFieldProps<AvaVizConfig.Type>) => {
      return <VizTypePField auth={auth} onChange={onChange} />;
    },
    [auth],
  );

  return useMemo(() => {
    return {
      label: t`Visualization Type`,
      type: "custom",
      render,
    };
  }, [t, render]);
}
