import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

type Props = {
  concept: Concept.T;
};

/**
 * Opens the records workspace for this case type.
 */
export function ViewRecordsButton({ concept }: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  return (
    <Button
      size="compact-sm"
      variant="light"
      rightSection={<IconArrowRight size={16} aria-hidden />}
      onClick={() => {
        navigate(
          AppLinks.individualManagerHome({
            workspaceSlug: workspace.slug,
            conceptId: concept.id,
            conceptName: concept.name,
          }),
        );
      }}
    >
      <Trans>View records</Trans>
    </Button>
  );
}
