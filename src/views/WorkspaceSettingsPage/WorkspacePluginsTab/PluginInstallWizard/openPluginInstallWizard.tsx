import { t } from "@lingui/core/macro";
import { randomId } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Puts focus back where the admin was before the wizard opened. A successful
 * install turns the card's Install button into other buttons, so the button
 * that opened the wizard may be gone by now. Then focus goes to the card's
 * heading, which the Install button points to with `aria-describedby`.
 */
function _returnFocusFromOpener(
  opener: Element | null,
  headingId: string | null,
): void {
  const target =
    opener?.isConnected === true
      ? opener
      : headingId === null
        ? null
        : document.getElementById(headingId);
  if (target instanceof HTMLElement) {
    target.focus({ preventScroll: true });
  }
}

/**
 * Opens the install wizard for one plugin in a large modal titled
 * "Install <plugin name>". A plugin's settings card calls it from its Install
 * button. A click outside does not close it, so a half-made choice is not
 * lost; the close button and Escape still do, except while content imports run.
 */
export function openPluginInstallWizard(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;
}): void {
  const { pluginName, manifestModule } = options;
  const opener = document.activeElement;
  const headingId = opener?.getAttribute("aria-describedby") ?? null;
  const modalId = randomId();
  modals.open({
    modalId,
    title: t`Install ${pluginName}`,
    size: "xl",
    closeOnClickOutside: false,
    closeButtonProps: { "aria-label": t`Close` },
    // Mantine would return focus to the opener only, which a successful
    // install can remove. `onClose` runs for Done, Escape, and the close
    // button alike.
    returnFocus: false,
    onClose: () => {
      window.setTimeout(() => {
        _returnFocusFromOpener(opener, headingId);
      }, 0);
    },
    children: (
      <PluginInstallWizard
        pluginName={pluginName}
        manifestModule={manifestModule}
        modalId={modalId}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}
