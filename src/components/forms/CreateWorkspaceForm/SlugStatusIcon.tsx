import { Loader } from "@mantine/core";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { match } from "ts-pattern";
import type { WorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import type { ReactNode } from "react";

type Props = {
  status: WorkspaceSlugCheck["status"];
};

/**
 * The icon at the trailing edge of the slug input for each check status.
 * Rendered by `_getSlugFieldStatusProps` as the slug field's `rightSection`.
 */
export function SlugStatusIcon({ status }: Props): ReactNode {
  return match(status)
    .with("checking", () => {
      return <Loader size={14} color="neutral.6" />;
    })
    .with("available", () => {
      return (
        <IconCircleCheck
          aria-hidden
          size={18}
          color="var(--mantine-color-success-9)"
        />
      );
    })
    .with("invalid", "taken", "failed", () => {
      return <IconAlertCircle aria-hidden size={18} />;
    })
    .with("idle", () => {
      return null;
    })
    .exhaustive();
}
