import { t } from "@lingui/core/macro";
import { randomId } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import { returnFocusFromOpener } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Opens the install wizard for one plugin in a large modal titled
 * "Install <plugin name>". A plugin's settings card calls it from its Install
 * button. A click outside does not close it, so a half-made choice is not
 * lost; the close button and Escape still do, except while content imports run.
 */
export function openPluginInstallWizard(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;

  /** The button that opened the wizard, where focus returns on close. */
  opener: HTMLElement;

  /** The id of the card's heading, where focus goes if the opener is gone. */
  headingId: string;
}): void {
  const { pluginName, manifestModule, opener, headingId } = options;
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
        returnFocusFromOpener(opener, headingId);
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
