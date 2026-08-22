import { ApplicationMenu } from "electrobun";
import type { ApplicationMenuItemConfig, BrowserWindow } from "electrobun";

const RELOAD_ACTION = "view:reload";
const TOGGLE_DEVTOOLS_ACTION = "view:toggleDevTools";

type MenuClickedEvent = {
  data?: { action?: string };
};

/**
 * Builds the macOS application menu and attaches a click handler that wires
 * the custom (non-`role`) items to the given window's webview.
 *
 * The first submenu in the returned array becomes the macOS "app menu"
 * (whose visible title is replaced by the running app's process name);
 * subsequent submenus appear in order after it.
 *
 * Menu items that use `role` get their standard macOS behavior and default
 * accelerators for free (Quit → ⌘Q, Close → ⌘W, Minimize → ⌘M, Cut/Copy/
 * Paste, etc.). Items that use `action` are dispatched to our click handler,
 * which evaluates JS in the webview (Reload) or calls the webview's native
 * DevTools toggle.
 *
 * @param appName Visible label for the app menu (cosmetic on macOS; the
 *   process name is what's actually shown in the menu bar).
 * @param window The main window whose webview should receive reload /
 *   DevTools commands. Read lazily on click so a closed-and-reopened window
 *   doesn't strand the handler against a stale view.
 */
export function setupApplicationMenu(
  appName: string,
  window: BrowserWindow,
): void {
  const menu: ApplicationMenuItemConfig[] = [
    {
      label: appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide", accelerator: "Cmd+H" },
        { role: "hideOthers", accelerator: "Alt+Cmd+H" },
        { role: "showAll" },
        { type: "separator" },
        { role: "quit", accelerator: "Cmd+Q" },
      ],
    },
    {
      label: "File",
      submenu: [{ role: "close", accelerator: "Cmd+W" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", accelerator: "Cmd+Z" },
        { role: "redo", accelerator: "Shift+Cmd+Z" },
        { type: "separator" },
        { role: "cut", accelerator: "Cmd+X" },
        { role: "copy", accelerator: "Cmd+C" },
        { role: "paste", accelerator: "Cmd+V" },
        { role: "pasteAndMatchStyle", accelerator: "Shift+Alt+Cmd+V" },
        { role: "delete" },
        { role: "selectAll", accelerator: "Cmd+A" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          action: RELOAD_ACTION,
          accelerator: "CmdOrCtrl+R",
        },
        {
          label: "Toggle Developer Tools",
          action: TOGGLE_DEVTOOLS_ACTION,
          accelerator: "Alt+Cmd+I",
        },
        { type: "separator" },
        { role: "toggleFullScreen", accelerator: "Ctrl+Cmd+F" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize", accelerator: "Cmd+M" },
        { role: "zoom" },
        { type: "separator" },
        { role: "close", accelerator: "Cmd+W" },
      ],
    },
  ];

  ApplicationMenu.setApplicationMenu(menu);

  ApplicationMenu.on("application-menu-clicked", (event: unknown) => {
    const action = (event as MenuClickedEvent).data?.action;
    if (action === undefined) return;

    const webview = window.webview;
    if (webview === undefined) return;

    if (action === RELOAD_ACTION) {
      webview.executeJavascript("location.reload()");
    } else if (action === TOGGLE_DEVTOOLS_ACTION) {
      webview.toggleDevTools();
    }
  });
}
