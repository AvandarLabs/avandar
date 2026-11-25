import { Group, Text, VisuallyHidden } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { SlugCheckMessage } from "@/components/forms/CreateWorkspaceForm/SlugCheckMessage";
import type { WorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import type { ReactNode } from "react";

type Props = {
  slugCheck: WorkspaceSlugCheck;
};

/**
 * The line under the slug input while a slug is being checked or once it is
 * available, plus a screen-reader status that announces every check.
 * Rendered by `_getSlugFieldStatusProps` inside the slug field's
 * `inputContainer`.
 */
export function SlugFieldStatusLine({ slugCheck }: Props): ReactNode {
  const { status } = slugCheck;
  return (
    <>
      {/* errors render in the input's own error slot instead */}
      {status === "available" || status === "checking" ? (
        <Group gap={6} mt={6} wrap="nowrap" aria-hidden>
          {status === "available" ? (
            <IconCircleCheck size={14} color="var(--mantine-color-success-9)" />
          ) : null}
          <Text size="xs" c="neutral.8">
            <SlugCheckMessage slugCheck={slugCheck} />
          </Text>
        </Group>
      ) : null}
      <VisuallyHidden role="status">
        {status === "idle" ? null : <SlugCheckMessage slugCheck={slugCheck} />}
      </VisuallyHidden>
    </>
  );
}
