import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconArrowMerge } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

/** Starts a crosswalk: many datasets mapped onto one combined dataset. */
export function NewCrosswalkButton(): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  return (
    <Button
      leftSection={<IconArrowMerge size={18} aria-hidden />}
      size="compact-sm"
      variant="default"
      onClick={() => {
        navigate(AppLinks.dataManagerNewCrosswalk(workspace.slug));
      }}
    >
      {t`New crosswalk`}
    </Button>
  );
}
