import { Trans } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { SlugFormatMessage } from "@/components/forms/CreateWorkspaceForm/SlugFormatMessage";
import type { WorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import type { ReactNode } from "react";

type Props = {
  slugCheck: WorkspaceSlugCheck;
};

/**
 * Describes where a slug check stands, or renders nothing while it is idle.
 * Rendered by `_getSlugFieldStatusProps` as the slug field's error, and by
 * `SlugFieldStatusLine` for the visible success line and the screen-reader
 * status.
 */
export function SlugCheckMessage({ slugCheck }: Props): ReactNode {
  return match(slugCheck)
    .with({ status: "idle" }, () => {
      return undefined;
    })
    .with({ status: "invalid" }, ({ problem }) => {
      return <SlugFormatMessage problem={problem} />;
    })
    .with({ status: "checking" }, ({ slug }) => {
      return <Trans>Checking if {slug} is available…</Trans>;
    })
    .with({ status: "available" }, ({ slug }) => {
      return <Trans>{slug} is available</Trans>;
    })
    .with({ status: "taken" }, ({ slug }) => {
      return <Trans>{slug} is already taken. Try another ID.</Trans>;
    })
    .with({ status: "failed" }, () => {
      return (
        <Trans>
          We couldn't check this ID. Check your connection, then edit the ID to
          try again.
        </Trans>
      );
    })
    .exhaustive();
}
