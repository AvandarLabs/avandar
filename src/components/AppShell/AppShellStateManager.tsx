import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";

type AppShellState = {
  isNavbarSidebarCollapsed: boolean;
};

const initialState: AppShellState = {
  isNavbarSidebarCollapsed: false,
};

export const AppShellStateManager = createAppStateManager({
  name: "AppShell",
  initialState,
  actions: {
    toggleNavbarSidebar: (state: AppShellState) => {
      return {
        ...state,
        isNavbarSidebarCollapsed: !state.isNavbarSidebarCollapsed,
      };
    },
  },
});
