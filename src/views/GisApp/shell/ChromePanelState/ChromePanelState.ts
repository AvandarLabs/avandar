import { useLocalStorage } from "@mantine/hooks";
import { useCallback, useMemo } from "react";

/** The floating panels whose collapse state a user controls. */
export type ChromePanelId = "layers" | "inspector" | "legend";

/** Collapsed state per panel. `true` means collapsed to its header pill. */
export type ChromePanelState = Record<ChromePanelId, boolean>;

/** State and actions exposed by the chrome-panel state module. */
export type ChromePanelStateController = {
  panelState: ChromePanelState;
  togglePanel: (panelId: ChromePanelId) => void;
  expandPanel: (panelId: ChromePanelId) => void;
};

/** Canvas width, in px, below which the inspector starts collapsed. */
const INSPECTOR_YIELDS_AT_PX = 1000;

/** Canvas width, in px, below which every panel starts collapsed. */
const TABLET_AT_PX = 792;

/**
 * Which panels start collapsed at a given canvas width.
 *
 * The inspector yields first because the stack is how you navigate a map and
 * the inspector is how you edit one layer: losing the way you navigate costs
 * more, and the inspector is one click away.
 *
 * @param canvasWidth Width of the map canvas in CSS pixels, not the viewport.
 */
function _panelStateFromCanvasWidth(canvasWidth: number): ChromePanelState {
  return canvasWidth <= TABLET_AT_PX
    ? { layers: true, inspector: true, legend: true }
    : canvasWidth < INSPECTOR_YIELDS_AT_PX
      ? { layers: false, inspector: true, legend: false }
      : { layers: false, inspector: false, legend: false };
}

/**
 * Per-user panel collapse state, persisted across sessions.
 *
 * Deliberately NOT part of the saved map config: a map shared with a colleague
 * should open in that colleague's own working layout, not in the author's.
 *
 * @param canvasWidth Current canvas width, used only for the first-run
 * default. Once the user has collapsed or expanded a panel their choice wins,
 * because a layout that silently rearranges itself on a window resize is worse
 * than one that is occasionally too narrow.
 */
/** Default calculation and persisted state for floating map panels. */
export const ChromePanelState = {
  /** Returns the first-run panel state for a canvas width. */
  fromCanvasWidth: _panelStateFromCanvasWidth,

  /** Reads and updates the current user's persisted panel state. */
  useChromePanelState: (canvasWidth: number): ChromePanelStateController => {
    const defaultState = useMemo(() => {
      return _panelStateFromCanvasWidth(canvasWidth);
      // The default is a first-run value only, so it must not follow a resize.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [panelState, setPanelState] = useLocalStorage<ChromePanelState>({
      key: "ava:gis:chrome-panels",
      defaultValue: defaultState,
      getInitialValueInEffect: false,
    });
    const togglePanel = useCallback(
      (panelId: ChromePanelId) => {
        setPanelState((current) => {
          return { ...current, [panelId]: !current[panelId] };
        });
      },
      [setPanelState],
    );
    const expandPanel = useCallback(
      (panelId: ChromePanelId) => {
        setPanelState((current) => {
          return current[panelId] ? { ...current, [panelId]: false } : current;
        });
      },
      [setPanelState],
    );
    return { panelState, togglePanel, expandPanel };
  },
};
