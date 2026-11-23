import { AnimationTheme } from "./AnimationTheme/AnimationTheme";
import { OverlayTheme } from "./OverlayTheme";

/**
 * Slate z-index: the raised view that floats on the app shell.
 *
 * Applied to the `AppSlate` paper, not to `AppShell.Main`. Mantine paints
 * the navbar and the aside at `getDefaultZIndex("app") + 1`, so a slate left
 * in normal flow sits under them and its drop shadow is chopped off at the
 * sidebar edge. Lifting the paper puts the shadow on top of the shell without
 * lifting `AppShell.Main`, whose box bleeds over the navbar and would swallow
 * sidebar clicks.
 *
 * This value must stay below `getDefaultZIndex("modal")` (200), the tier
 * Mantine gives `Drawer` and `Spotlight` and that we do not override. The
 * slate z-index makes the slate a stacking context, so every surface meant to
 * cover it has to outrank the slate rather than one of its descendants.
 */
export const APP_SLATE_Z_INDEX = 150;

/**
 * Docked chat aside z-index. While docked, Ask Avandar is fused to the
 * slate's inline-end edge and reads as the slate's right-hand pane, so it
 * paints just over the slate: that is what keeps the slate's drop shadow from
 * falling across the chat. It stays below `getDefaultZIndex("modal")` (200)
 * and `APP_CHROME_Z_INDEX` for the same reasons the slate does.
 */
export const APP_CHAT_ASIDE_Z_INDEX = APP_SLATE_Z_INDEX + 1;

/**
 * App chrome z-index. Floating toolbars, the mobile navbar, and the chat
 * composer overlay live here: above the slate but always below modals,
 * drawers, and any overlay layer. Anchoring chrome to this token (instead of
 * ad-hoc magic numbers like `1000`) is what keeps things like the Send
 * Feedback button from punching through modal overlays.
 */
export const APP_CHROME_Z_INDEX = 250;

/**
 * Modal z-index above all app chrome.
 *
 * Mantine's `getDefaultZIndex("modal")` is hardcoded to 200 and ignores
 * `theme.zIndex`, so defaults are set on `Modal` and `ModalsProvider`. The
 * value is intentionally well above `APP_CHROME_Z_INDEX` so future floating
 * UI added in the chrome tier cannot accidentally land above modals.
 */
export const MODAL_ROOT_Z_INDEX = 400;

/**
 * Onboarding tour overlay. Same layer as modals so share-modal controls can
 * be spotlighted. Joyride paints the tooltip at this value plus one.
 */
export const NUX_TOUR_Z_INDEX = MODAL_ROOT_Z_INDEX;

/**
 * Onboarding checklist. Above the tour overlay but below the tooltip so
 * step copy stays readable when it overlaps the "Get started" card.
 */
export const NUX_CHECKLIST_Z_INDEX = NUX_TOUR_Z_INDEX + 1;

/**
 * Product modals that interrupt the tour (drop-to-import confirm, hide-
 * tutorial confirm) and are not themselves a spotlight target. Must clear
 * the checklist and Joyride's tooltip, which sits at
 * `NUX_CHECKLIST_Z_INDEX + 1`.
 */
export const MODAL_ABOVE_NUX_TOUR_Z_INDEX = NUX_TOUR_Z_INDEX + 3;

/**
 * Marks every Mantine `Modal` root so the onboarding checklist can tell a
 * product modal (share, confirm) apart from Joyride's overlay.
 */
export const PRODUCT_MODAL_ROOT_CLASSNAME = "ava-product-modal";

/** Selector for a mounted product modal root. */
export const PRODUCT_MODAL_ROOT_SELECTOR = `.${PRODUCT_MODAL_ROOT_CLASSNAME}`;

/** Default props for `<Modal>` and `@mantine/modals` ModalsProvider. */
export const DEFAULT_MODAL_PROPS = {
  zIndex: MODAL_ROOT_Z_INDEX,
  centered: true,
  radius: OverlayTheme.panel.radius,
  classNames: {
    root: PRODUCT_MODAL_ROOT_CLASSNAME,
  },
  overlayProps: {
    backgroundOpacity: 0,
    color: "transparent",
    transitionProps: AnimationTheme.mantine.modalOverlay,
    style: {
      background: "var(--ava-overlay-background)",
      backdropFilter: "var(--ava-overlay-backdrop-filter)",
    },
  },
  transitionProps: AnimationTheme.mantine.modal,
} as const;

/**
 * Floating panel z-index. Sits above app chrome so a floating surface
 * stays reachable over a toolbar, but below `MODAL_ROOT_Z_INDEX` so a
 * modal always covers it.
 */
export const FLOATING_PANEL_Z_INDEX = 300;

/**
 * Overlay dropdown z-index for popovers, comboboxes, menus, and tooltips.
 * Sits above `MODAL_ROOT_Z_INDEX` so dropdowns opened inside a modal
 * (Share dialog selects, action menus, etc.) render on top of the modal
 * instead of being hidden behind it. Mantine's defaults (300) live below
 * our overridden modal layer (400), so we bump everything in this tier
 * up in one place.
 */
export const POPOVER_Z_INDEX = 500;

/**
 * Toast / notification z-index. Above modals, popovers, and full-screen
 * drop overlays so parse errors stay visible. The notifications container
 * uses `pointer-events: none` so only toasts capture clicks.
 */
export const NOTIFICATIONS_Z_INDEX = 10_000;
