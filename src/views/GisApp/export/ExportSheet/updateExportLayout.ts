import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/**
 * Applies one field-level edit to the map's persisted export layout.
 *
 * Every export sheet control funnels through this single helper, which is
 * why `AvaMapConfig.withExportLayout` has exactly one call site outside
 * tests: nothing else in the app may write `exportLayout`.
 */
export function updateExportLayout(
  options: Readonly<{
    onConfigChange: (
      update: (config: AvaMapConfig.T) => AvaMapConfig.T,
    ) => void;
    update: (layout: AvaMapConfig.ExportLayout) => AvaMapConfig.ExportLayout;
  }>,
): void {
  const { onConfigChange, update } = options;
  onConfigChange((current) => {
    return AvaMapConfig.withExportLayout({
      config: current,
      exportLayout: update(current.exportLayout),
    });
  });
}
