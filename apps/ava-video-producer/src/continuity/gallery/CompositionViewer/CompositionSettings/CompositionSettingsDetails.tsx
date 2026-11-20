import { CompositionActions } from "../CompositionActions/CompositionActions";
import { CompositionControls } from "../CompositionControls/CompositionControls";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { useCompositionAppearance } from "../useCompositionAppearance";
import type { useCompositionTheme } from "../useCompositionTheme";
import type { ReactNode } from "react";

type Props = Readonly<{
  id: string;
  captions: boolean | undefined;
  appearance: ReturnType<typeof useCompositionAppearance>;
  isScene: boolean;
  exportTheme: ExportTheme;
  theme: ReturnType<typeof useCompositionTheme>;
}>;

/** The appearance controls and downloads for one composition. */
export function CompositionSettingsDetails({
  id,
  captions,
  appearance,
  isScene,
  exportTheme,
  theme,
}: Props): ReactNode {
  return (
    <>
      <CompositionControls appearance={appearance} isScene={isScene} />
      <CompositionActions
        id={id}
        captions={captions}
        options={appearance.options}
        isScene={isScene}
        theme={exportTheme}
        themeState={theme.exportState}
        onRetryTheme={theme.retry}
      />
    </>
  );
}
