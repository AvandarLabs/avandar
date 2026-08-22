import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconAdjustments } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

type Props = {
  concept: Concept.T;
};

/**
 * Opens this case type in Case Manager so the user can edit attributes or
 * sync records.
 */
export function EditCaseTypeButton({ concept }: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  return (
    <Button
      leftSection={<IconAdjustments size={18} aria-hidden />}
      onClick={() => {
        navigate(
          AppLinks.ontologyDesignerConceptView({
            workspaceSlug: workspace.slug,
            conceptId: concept.id,
            conceptName: concept.name,
          }),
        );
      }}
      size="compact-sm"
      variant="light"
    >
      <Trans>Edit case type</Trans>
    </Button>
  );
}
