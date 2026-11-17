import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";

type Props = Readonly<{
  /** What could not be loaded, as one translated sentence. */
  message: string;
  onRetry: () => void;
}>;

/**
 * An alert that says a lookup behind a plugin's uninstall failed, with a
 * Retry button. Use it where an admin must be told a lookup failed instead
 * of being shown an answer that was never loaded, for example on a plugin's
 * card or in its uninstall dialog.
 */
export function PluginLookupErrorCallout({
  message,
  onRetry,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Callout messageSize="sm" message={message}>
      <Button
        variant="default"
        size="compact-sm"
        w="fit-content"
        onClick={onRetry}
      >
        {t`Retry`}
      </Button>
    </Callout>
  );
}
