import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";

type Props = Readonly<{
  /** The id of the plugin's card heading, which describes this button. */
  headingId: string;
  isDisabled: boolean;

  /** Runs with the clicked button, where focus returns after the wizard. */
  onInstall: (opener: HTMLElement) => void;
}>;

/**
 * The Install button on the card of a plugin the workspace does not have.
 * Unlike the other actions it asks for no confirmation, because it opens the
 * install wizard, which reviews the plugin before anything is saved.
 */
export function PluginInstallButton({
  headingId,
  isDisabled,
  onInstall,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Button
      size="compact-sm"
      aria-describedby={headingId}
      disabled={isDisabled}
      onClick={(event) => {
        onInstall(event.currentTarget);
      }}
    >
      {t`Install`}
    </Button>
  );
}
