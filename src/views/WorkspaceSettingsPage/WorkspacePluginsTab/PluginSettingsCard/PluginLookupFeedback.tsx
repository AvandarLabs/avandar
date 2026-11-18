import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Button, VisuallyHidden } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";
import type { BoxProps } from "@mantine/core";

type Props = Readonly<{
  state: LookupState;

  /** What could not be loaded, as one translated sentence. */
  message: string;

  /** Announced while a retry is in flight. */
  retryingMessage: string;

  /** Announced once a retry succeeded and the alert is gone. */
  recoveredMessage: string;
  onRetry: () => void;

  /** The id of the element that says what Retry applies to. */
  describedById?: string;
  mt?: BoxProps["mt"];
}>;

/** True once the lookup was in error and is fine again. */
function useHasRecovered(isInError: boolean): boolean {
  const [hasBeenInError, setHasBeenInError] = useState(false);
  useEffect(() => {
    if (isInError) {
      setHasBeenInError(true);
    }
  }, [isInError]);
  return hasBeenInError && !isInError;
}

/** True once a retry started and the lookup has not been fine since. */
function useHasRetried(state: LookupState): boolean {
  const [hasRetried, setHasRetried] = useState(false);
  useEffect(() => {
    if (state === "retrying") {
      setHasRetried(true);
    } else if (state === "ok") {
      setHasRetried(false);
    }
  }, [state]);
  return hasRetried;
}

/**
 * Tells an admin that a lookup behind a plugin's uninstall failed, with a
 * Retry button, instead of showing an answer that never loaded. The alert
 * stays until a retry succeeds, and Retry shows a loader meanwhile. A status
 * region that is always mounted announces the retry, a retry that fails
 * again, and the recovery. It takes focus when Retry is pressed, since the
 * button is disabled during the retry and gone after it.
 *
 * Use it wherever a plugin's uninstall depends on a lookup that can fail, for
 * example on a plugin's card or in its uninstall dialog.
 */
export function PluginLookupFeedback({
  state,
  message,
  retryingMessage,
  recoveredMessage,
  onRetry,
  describedById,
  mt,
}: Props): JSX.Element {
  const { t } = useLingui();
  const statusRef = useRef<HTMLDivElement>(null);
  const hasRecovered = useHasRecovered(state !== "ok");
  const hasRetried = useHasRetried(state);
  const statusMessage = {
    ok: hasRecovered ? recoveredMessage : "",
    // The first failure is announced by the alert. A failure after a retry
    // is not, because the alert is already mounted.
    failed: hasRetried ? message : "",
    retrying: retryingMessage,
  }[state];
  return (
    <>
      {state === "ok" ? null : (
        <Callout messageSize="sm" message={message} mt={mt}>
          <Button
            variant="default"
            size="compact-sm"
            w="fit-content"
            loading={state === "retrying"}
            aria-describedby={describedById}
            onClick={() => {
              onRetry();
              statusRef.current?.focus();
            }}
          >
            {t`Retry`}
          </Button>
        </Callout>
      )}
      <VisuallyHidden ref={statusRef} role="status" tabIndex={-1}>
        {statusMessage}
      </VisuallyHidden>
    </>
  );
}
