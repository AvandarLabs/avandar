import { createAppStateManager } from "@/lib/utils/state/createAppStateManager";

type AppShellState = {
  isDesktopNavbarCollapsed: boolean;
};

const initialState: AppShellState = {
  isDesktopNavbarCollapsed: false,
};

export const AppShellStateManager = createAppStateManager({
  name: "AppShell",
  initialState,
  actions: {
    toggleDesktopNavbar: (state: AppShellState) => {
      return {
        ...state,
        isDesktopNavbarCollapsed: !state.isDesktopNavbarCollapsed,
      };
    },
  },
});
