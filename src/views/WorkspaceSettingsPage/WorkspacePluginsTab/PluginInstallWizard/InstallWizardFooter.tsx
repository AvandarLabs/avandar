import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import type { PluginInstaller } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallPlugin";
import type { InstallWizardState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/useInstallWizardState";

type Props = Readonly<{
  wizard: InstallWizardState;
  installer: PluginInstaller;

  /** False while the current page needs a choice before the next one. */
  canGoNext: boolean;

  /** True while content imports run, which Done waits for. */
  isImportingContent: boolean;
  onInstall: () => void;
  onClose: () => void;
}>;

function PrimaryButton({
  wizard,
  installer,
  canGoNext,
  isImportingContent,
  onInstall,
  onClose,
}: Props): JSX.Element {
  const { t } = useLingui();
  if (wizard.page.step !== "confirm") {
    return (
      <Button disabled={!canGoNext} onClick={wizard.goToNextPage}>
        {t`Next`}
      </Button>
    );
  }
  if (installer.installation !== undefined) {
    return (
      <Button disabled={isImportingContent} onClick={onClose}>
        {t`Done`}
      </Button>
    );
  }
  return (
    <Button loading={installer.isInstalling} onClick={onInstall}>
      {t`Install`}
    </Button>
  );
}

/**
 * The install wizard's buttons: Back, then Next on every page but the last,
 * Install on the last, and Done once installed. An optional data slot's page
 * also offers Skip for now. Back goes away once the install starts, because
 * the choices it would return to are already saved.
 */
export function InstallWizardFooter(props: Props): JSX.Element {
  const { t } = useLingui();
  const { wizard, installer } = props;
  const hasInstallStarted =
    installer.isInstalling || installer.installation !== undefined;
  return (
    <Group justify="flex-end" gap="xs">
      {wizard.isFirstPage || hasInstallStarted ? null : (
        <Button variant="default" me="auto" onClick={wizard.goToPreviousPage}>
          {t`Back`}
        </Button>
      )}
      {wizard.page.step === "dataSlots" && !wizard.page.slot.required ? (
        <Button variant="default" onClick={wizard.skipDataSlot}>
          {t`Skip for now`}
        </Button>
      ) : null}
      <PrimaryButton {...props} />
    </Group>
  );
}
