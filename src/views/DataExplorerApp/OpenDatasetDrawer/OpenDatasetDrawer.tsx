import { Trans, useLingui } from "@lingui/react/macro";
import { Title } from "@mantine/core";
import { Drawer, Tabs } from "@ui";
import { APP_SHELL_MAIN_ID } from "@/components/AppShell/AppShell";
import { MODAL_ROOT_Z_INDEX } from "@/config/Theme";
import { buildSelectAllPreviewSQL } from "@/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL";
import { ImportDatasetView } from "@/views/DataExplorerApp/OpenDatasetDrawer/ImportDatasetView";
import { SavedDatasetsView } from "@/views/DataExplorerApp/OpenDatasetDrawer/SavedDatasetsView";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { MantineTransition } from "@mantine/core";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type DrawerPosition = "left" | "right" | "top" | "bottom";

/**
 * Slide transitions that match each anchor edge. A bottom-anchored drawer
 * should slide upward into view; a right-anchored drawer should slide
 * leftward; and so on. Mantine derives a sensible default from `position`
 * but our `@ui` Drawer wrapper can swallow it, so we set it explicitly.
 */
const SLIDE_TRANSITION_BY_POSITION: Record<DrawerPosition, MantineTransition> =
  {
    bottom: "slide-up",
    top: "slide-down",
    left: "slide-right",
    right: "slide-left",
  };

type Props = {
  opened: boolean;
  onClose: () => void;

  /**
   * Called when the user picks (or imports) a dataset. The drawer is
   * responsible for the canvas-side state updates via this callback.
   */
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;

  /**
   * Edge the drawer anchors to. Controls both the slide direction and which
   * dimension `size` applies to. Defaults to `"bottom"`.
   */
  position?: DrawerPosition;

  /**
   * Length along the axis perpendicular to the anchored edge (height for
   * top/bottom, width for left/right). Accepts any CSS length, e.g. `"40%"`,
   * `480`, or `"30rem"`. Defaults to `"40%"`.
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
 * The Data Explorer's "Open" drawer. Defaults to sliding up from the bottom
 * of the canvas and is scoped to the app's main layout so it does not cover
 * the side navbar or chat panel Aside. When `withOverlay` is false the
 * canvas behind the drawer stays interactive — focus is not trapped, body
 * scroll is not locked, and clicking outside does not dismiss the drawer.
 */
export function OpenDatasetDrawer({
  opened,
  onClose,
  onOpen,
  position = "bottom",
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
      position={position}
      size={size}
      withOverlay={withOverlay}
      lockScroll={withOverlay}
      trapFocus={withOverlay}
      closeOnClickOutside={withOverlay}
      zIndex={MODAL_ROOT_Z_INDEX}
      transitionProps={{
        transition: SLIDE_TRANSITION_BY_POSITION[position],
      }}
      styles={{
        // When the overlay is off, the inner flex container still spans the
        // boundary and would swallow clicks targeted at the canvas above the
        // drawer. Disabling pointer events on `inner` and re-enabling them on
        // `content` keeps the drawer panel itself interactive while letting
        // clicks pass through to the rest of the page.
        inner: withOverlay ? undefined : { pointerEvents: "none" },
        content: {
          // The shared Drawer wrapper paints a left border for right-anchored
          // drawers. Replace it with the border that hugs the anchored edge.
          borderLeft: position === "right" ? undefined : "none",
          borderRight:
            position === "left" ?
              "1px solid var(--ava-border-default)"
            : undefined,
          borderTop:
            position === "bottom" ?
              "1px solid var(--ava-border-default)"
            : undefined,
          borderBottom:
            position === "top" ?
              "1px solid var(--ava-border-default)"
            : undefined,
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
