import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { ReactNode } from "react";

import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";

type Props = {
  actionKind: PublishActionKind;
};

/** The label on the modal's primary button, one per publish action. */
export function PrimaryActionLabel({ actionKind }: Readonly<Props>): ReactNode {
  return matchLiteral(actionKind, {
    publish_workspace: () => {
      return <Trans>Publish to workspace</Trans>;
    },
    publish_public: () => {
      return <Trans>Publish publicly</Trans>;
    },
    republish: () => {
      return <Trans>Update &amp; republish</Trans>;
    },
    make_internal: () => {
      return <Trans>Make internal</Trans>;
    },
    unpublish: () => {
      return <Trans>Unpublish</Trans>;
    },
    disabled_no_audience: () => {
      return <Trans>Publish</Trans>;
    },
  });
}
