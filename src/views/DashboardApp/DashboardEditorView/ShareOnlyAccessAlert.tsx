import type { ReactElement } from "react";

import { Trans } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";

/** Tells a viewer that their access comes from a share, not from ownership. */
export function ShareOnlyAccessAlert(): ReactElement {
  return (
    <Alert
      color="blue"
      variant="light"
      title={<Trans>Shared with you</Trans>}
      m="sm"
    >
      <Text size="sm">
        <Trans>
          You can view this dashboard because it was shared with you.
        </Trans>
      </Text>
    </Alert>
  );
}
