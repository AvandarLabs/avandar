import { useLingui } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { usePluginActionCopy } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy";
import type {
  ConfirmedPluginActionKind,
  ImportedDatasetsState,
} from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { UninstallActionCopy } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { ButtonProps } from "@mantine/core";

type Props = Readonly<{
  kind: ConfirmedPluginActionKind;
  pluginName: string;

  /** The id of the plugin's card heading, which describes this button. */
  headingId: string;
  isDisabled: boolean;

  /**
   * What the card knows about the datasets the plugin imported. Uninstall is
   * disabled while it loads, opens the uninstall modal when there are some,
   * and confirms an uninstall that keeps every dataset when the lookup failed.
   */
  importedDatasets: ImportedDatasetsState;
  actions: PluginInstallationActions;
}>;

/** How each kind of action looks. Uninstall is the only destructive one. */
const STYLE_BY_KIND: Record<
  ConfirmedPluginActionKind,
  Pick<ButtonProps, "variant" | "color">
> = {
  review: {},
  enable: { variant: "outline" },
  disable: { variant: "outline", color: "neutral" },
  uninstall: { variant: "subtle", color: "danger" },
};

function _makeOnConfirmByKind(
  actions: PluginInstallationActions,
): Record<ConfirmedPluginActionKind, () => void> {
  return {
    review: actions.approvePermissions,
    enable: () => {
      actions.setIsEnabled(true);
    },
    disable: () => {
      actions.setIsEnabled(false);
    },
    uninstall: actions.uninstall,
  };
}

/** The sentences Uninstall adds when the datasets could not be looked up. */
function _listLookupFailedNotes(copy: UninstallActionCopy): string[] {
  return [copy.lookupFailedProblem, copy.lookupFailedOutcome];
}

/** The paragraphs of a confirmation: its body, then any extra notes. */
function ConfirmParagraphs({
  paragraphs,
}: Readonly<{ paragraphs: readonly string[] }>): JSX.Element {
  return (
    <Stack gap="xs">
      {paragraphs.map((paragraph) => {
        return (
          <Text key={paragraph} size="sm">
            {paragraph}
          </Text>
        );
      })}
    </Stack>
  );
}

/**
 * One action button on a plugin's settings card. Clicking it opens a
 * confirmation, and the action runs only once the user confirms, because
 * every action changes the plugin for every member of the workspace.
 * Uninstall of a plugin that imported datasets opens the uninstall modal
 * instead, which is its own confirmation. When the lookup of imported
 * datasets failed, Uninstall confirms an uninstall that keeps every dataset.
 */
export function PluginActionButton({
  kind,
  pluginName,
  headingId,
  isDisabled,
  importedDatasets,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const copies = usePluginActionCopy({ pluginName });
  const copy = copies[kind];
  const isUninstall = kind === "uninstall";
  const style = STYLE_BY_KIND[kind];
  const paragraphs =
    isUninstall && importedDatasets === "failed"
      ? [copy.confirmBody, ..._listLookupFailedNotes(copies.uninstall)]
      : [copy.confirmBody];
  return (
    <Button
      size="compact-sm"
      {...style}
      aria-describedby={headingId}
      disabled={isDisabled || (isUninstall && importedDatasets === "loading")}
      onClick={() => {
        if (isUninstall && importedDatasets === "some") {
          actions.uninstallWithImportedDatasets();
          return;
        }
        modals.openConfirmModal({
          title: copy.confirmTitle,
          children: <ConfirmParagraphs paragraphs={paragraphs} />,
          labels: { confirm: copy.confirmLabel, cancel: t`Cancel` },
          confirmProps: { color: style.color },
          onConfirm: _makeOnConfirmByKind(actions)[kind],
        });
      }}
    >
      {copy.label}
    </Button>
  );
}
