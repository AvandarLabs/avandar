import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";
import { IconInfoCircle, IconWorld } from "@tabler/icons-react";

type Props = {
  visibility: Dashboard.Visibility;
};

/**
 * The alert shown when the picked audience has not reached the published copy.
 *
 * `visibility` is the PERSISTED value, not the selection: what the reader
 * needs is what the world can still see.
 */
export function DivergenceAlert({ visibility }: Readonly<Props>): ReactNode {
  if (visibility === "public") {
    // Live exposure, not a tidy pending change: the dropdown already reads
    // "Restricted" while `is_public` is still true and the anon policy still
    // serves the whole internet.
    return (
      <Alert color="red" icon={<IconWorld size={18} />} variant="light">
        <Text size="sm">
          <Trans>
            This dashboard is still public on the web. Anyone with the link can
            view it until you press the button below.
          </Trans>
        </Text>
      </Alert>
    );
  }
  return (
    <Alert color="yellow" icon={<IconInfoCircle size={18} />} variant="light">
      <Text size="sm">
        {/* A draft has no published copy to be stale, so it must not claim one:
            the "Not published yet" alert sits directly above this. */}
        {visibility === "draft" ? (
          <Trans>
            This dashboard is not published yet. Use the button below to publish
            it to the audience you picked.
          </Trans>
        ) : (
          <Trans>
            The published copy still serves the previous audience. Use the
            button below to apply your change.
          </Trans>
        )}
      </Text>
    </Alert>
  );
}
