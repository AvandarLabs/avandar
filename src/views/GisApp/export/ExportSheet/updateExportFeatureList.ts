import { updateExportLayout } from "@/views/GisApp/export/ExportSheet/updateExportLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Applies one edit to the export layout's feature list, through
 * `updateExportLayout`. Does nothing when the layout has no feature list.
 */
export function updateExportFeatureList(
  options: Readonly<{
    onConfigChange: (
      update: (config: AvaMapConfig.T) => AvaMapConfig.T,
    ) => void;
    update: (
      featureList: AvaMapConfig.ExportFeatureList,
    ) => AvaMapConfig.ExportFeatureList;
  }>,
): void {
  const { onConfigChange, update } = options;
  updateExportLayout({
    onConfigChange,
    update: (layout) => {
      return layout.featureList === undefined
        ? layout
        : { ...layout, featureList: update(layout.featureList) };
    },
  });
}
