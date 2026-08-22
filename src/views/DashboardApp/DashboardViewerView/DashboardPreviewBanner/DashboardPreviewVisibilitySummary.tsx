import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { match } from "ts-pattern";

type Props = {
  visibility: Dashboard.Visibility;
};

/** Describes which audience can access the dashboard being previewed. */
export function DashboardPreviewVisibilitySummary({
  visibility,
}: Readonly<Props>): ReactNode {
  return (
    <Text size="xs" c="dimmed">
      {match(visibility)
        .with("public", () => {
          return <Trans>This dashboard is published publicly.</Trans>;
        })
        .with("workspace", () => {
          return <Trans>Published to your workspace.</Trans>;
        })
        .with("draft", () => {
          return <Trans>Not yet published. Viewers will not see this.</Trans>;
        })
        .exhaustive()}
    </Text>
  );
}
