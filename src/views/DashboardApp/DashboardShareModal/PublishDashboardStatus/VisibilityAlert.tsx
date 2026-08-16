import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";
import { IconBuilding, IconInfoCircle, IconWorld } from "@tabler/icons-react";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  visibility: Dashboard.Visibility;
};

/**
 * The alert stating what the PERSISTED visibility means for who can read the
 * dashboard today. One arm per visibility, because "nobody can open it", "only
 * people you gave access" and "the whole internet" are three different facts
 * and each earns its own colour.
 */
export function VisibilityAlert({ visibility }: Readonly<Props>): ReactNode {
  return matchLiteral(visibility, {
    draft: () => {
      return (
        <Alert color="blue" icon={<IconInfoCircle size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              Not published yet. Nobody can open this dashboard from a link
              until you publish it.
            </Trans>
          </Text>
        </Alert>
      );
    },
    workspace: () => {
      return (
        <Alert color="teal" icon={<IconBuilding size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              This dashboard is published to your workspace. Only people you
              have given access can open the link below.
            </Trans>
          </Text>
        </Alert>
      );
    },
    public: () => {
      return (
        <Alert color="orange" icon={<IconWorld size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              This dashboard is <strong>public</strong>. Anyone with the link
              can view it, with no Avandar account.
            </Trans>
          </Text>
        </Alert>
      );
    },
  });
}
