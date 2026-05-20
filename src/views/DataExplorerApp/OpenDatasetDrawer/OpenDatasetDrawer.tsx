import { Trans, useLingui } from "@lingui/react/macro";
import { Title } from "@mantine/core";
import { Drawer, Tabs } from "@ui";
import { APP_SHELL_MAIN_ID } from "@/components/AppShell/AppShell";
import { MODAL_ROOT_Z_INDEX } from "@/config/Theme";
import { buildSelectAllPreviewSQL } from "@/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL";
import { ImportDatasetView } from "@/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView";
import { SavedDatasetsView } from "@/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  opened: boolean;
  onClose: () => void;

  /**
   * Called when the user picks (or imports) a dataset. The drawer is
   * responsible for the canvas-side state updates via this callback.
   */
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;

  /**
   * Height of the drawer expressed as a CSS length (e.g. `"40%"`, `480`, or
   * `"30rem"`). Because the drawer slides up from the bottom, `size` controls
   * vertical extent rather than width. Defaults to `"40%"`.
   */
  size?: number | string;

  /**
   * Whether to render a dimming overlay behind the drawer that blocks
   * interaction with the rest of the page. When `false`, the underlying
   * canvas remains clickable and scrollable while the drawer is open.
   * Defaults to `false`.
   */
  withOverlay?: boolean;
};

/**
 * The Data Explorer's "Open" drawer. Slides up from the bottom of the canvas
 * and is scoped to the app's main layout so it does not cover the side
 * navbar or chat panel Aside. When `withOverlay` is false the canvas behind
 * the drawer stays interactive — focus is not trapped, body scroll is not
 * locked, and clicking outside does not dismiss the drawer.
 */
export function OpenDatasetDrawer({
  opened,
  onClose,
  onOpen,
  size = "40%",
  withOverlay = false,
}: Props): JSX.Element {
  const { t } = useLingui();
  const onImportSaved = (dataset: Dataset.T) => {
    onOpen(
      {
        datasetId: dataset.id,
        name: dataset.name,
        sourceType: dataset.sourceType,
      },
      buildSelectAllPreviewSQL(dataset.id),
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      keepMounted={false}
      boundary={`#${APP_SHELL_MAIN_ID}`}
      position="bottom"
      size={size}
      withOverlay={withOverlay}
      lockScroll={withOverlay}
      trapFocus={withOverlay}
      closeOnClickOutside={withOverlay}
      zIndex={MODAL_ROOT_Z_INDEX}
      styles={{
        // When the overlay is off, the inner flex container still spans the
        // boundary and would swallow clicks targeted at the canvas above the
        // drawer. Disabling pointer events on `inner` and re-enabling them on
        // `content` keeps the drawer panel itself interactive while letting
        // clicks pass through to the rest of the page.
        inner: withOverlay ? undefined : { pointerEvents: "none" },
        content: {
          borderLeft: "none",
          borderTop: "1px solid var(--ava-border-default)",
          ...(withOverlay ? null : { pointerEvents: "auto" }),
        },
      }}
      title={
        <Title order={4}>
          <Trans>Open dataset</Trans>
        </Title>
      }
    >
      <Tabs
        tabIds={["saved", "import"] as const}
        renderTabHeader={{
          saved: t`Saved datasets`,
          import: t`Import dataset`,
        }}
        renderTabPanel={{
          saved: () => {
            return <SavedDatasetsView onOpen={onOpen} />;
          },
          import: () => {
            return <ImportDatasetView onSaveSuccess={onImportSaved} />;
          },
        }}
      />
    </Drawer>
  );
}
