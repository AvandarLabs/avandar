import { Trans, useLingui } from "@lingui/react/macro";
import {
  Divider,
  Group,
  Loader,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { IconAlertCircle, IconCircleCheck } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { match } from "ts-pattern";
import { slugify } from "$/lib/strings/transformations";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import {
  getWorkspaceSlugFormatProblem,
  useWorkspaceSlugCheck,
  WORKSPACE_SLUG_MAX_LENGTH,
  WORKSPACE_SLUG_MIN_LENGTH,
} from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { notifySuccess } from "@/utils/notifications/notify";
import type {
  WorkspaceSlugCheck,
  WorkspaceSlugFormatProblem,
} from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import type { ReactNode } from "react";

type Props = {
  onSubmit?: (values: {
    workspaceName: string;
    workspaceIdentifier: string;
    fullName: string;
    displayName: string;
  }) => void;
  introText?: string;

  /** Called after the workspace is created */
  onWorkspaceCreated?: () => void;
};

/** How long to wait after the last keystroke before checking a slug. */
const SLUG_CHECK_DEBOUNCE_MS = 300;

/**
 * Translates a slug format problem into a short fix the user can act on.
 */
function SlugFormatMessage({
  problem,
}: {
  problem: WorkspaceSlugFormatProblem;
}): ReactNode {
  return match(problem)
    .with("empty", () => {
      return <Trans>Enter an ID for your workspace.</Trans>;
    })
    .with("too_short", () => {
      return (
        <Trans>Use at least {WORKSPACE_SLUG_MIN_LENGTH} characters.</Trans>
      );
    })
    .with("too_long", () => {
      return (
        <Trans>Use {WORKSPACE_SLUG_MAX_LENGTH} characters or fewer.</Trans>
      );
    })
    .with("invalid_characters", () => {
      return <Trans>Use only letters, numbers, and hyphens.</Trans>;
    })
    .exhaustive();
}

/**
 * The message for a slug check, or `undefined` while there is nothing to say.
 */
function SlugCheckMessage({
  slugCheck,
}: {
  slugCheck: WorkspaceSlugCheck;
}): ReactNode {
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

/**
 * The live props for the slug input: a status icon at its trailing edge,
 * the error under it, and a success line in the same place when the slug
 * is free. Every state is also announced to screen readers.
 */
function _getSlugFieldStatusProps(slugCheck: WorkspaceSlugCheck): {
  rightSection: ReactNode;
  error: ReactNode;
  inputContainer: (children: ReactNode) => ReactNode;
} {
  const { status } = slugCheck;
  const isError =
    status === "invalid" || status === "taken" || status === "failed";
  const message = <SlugCheckMessage slugCheck={slugCheck} />;
  return {
    rightSection: match(status)
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
      .exhaustive(),
    error: isError ? message : undefined,
    inputContainer: (children) => {
      return (
        <>
          {children}
          {/* errors render in the input's own error slot instead */}
          {status === "available" || status === "checking" ? (
            <Group gap={6} mt={6} wrap="nowrap" aria-hidden>
              {status === "available" ? (
                <IconCircleCheck
                  size={14}
                  color="var(--mantine-color-success-9)"
                />
              ) : null}
              <Text size="xs" c="neutral.8">
                {message}
              </Text>
            </Group>
          ) : null}
          <VisuallyHidden role="status">
            {status === "idle" ? null : message}
          </VisuallyHidden>
        </>
      );
    },
  };
}

export function CreateWorkspaceForm({
  onSubmit,
  introText,
  onWorkspaceCreated,
}: Props): JSX.Element {
  const { t } = useLingui();
  const navigate = useNavigate();
  const [submittedOnwerInfo, setSubmittedOnwerInfo] = useState<
    | {
        fullName: string;
        displayName: string;
      }
    | undefined
  >(undefined);
  const [createWorkspace, isWorkspaceCreating] =
    WorkspaceClient.useCreateWorkspaceWithOwner({
      queryToInvalidate: [WorkspaceClient.getClientName()],
      onSuccess: (newWorkspace) => {
        notifySuccess(t`Workspace created successfully!`);
        onWorkspaceCreated?.();

        // navigate to the new workspace
        navigate(AppLinks.workspaceHome(newWorkspace.slug));

        if (onSubmit && submittedOnwerInfo) {
          onSubmit({
            workspaceName: newWorkspace.name,
            workspaceIdentifier: newWorkspace.slug,
            fullName: submittedOnwerInfo.fullName,
            displayName: submittedOnwerInfo.displayName,
          });
        }
      },
    });

  const [slugCheck, checkSlug] = useWorkspaceSlugCheck();
  const isSlugAvailable = slugCheck.status === "available";

  return (
    <AvaForm
      fields={
        {
          workspaceName: {
            key: "workspaceName",
            type: "text",
            initialValue: "",
            required: true,
          },
          workspaceSlug: {
            key: "workspaceSlug",
            type: "text",
            description: t`This is the unique ID of your organization used in URLs.`,
            initialValue: "",
            label: t`Workspace ID`,
            required: true,
            syncWhileUntouched: {
              syncFrom: "workspaceName",
              transform: slugify,
            },
            onChange: checkSlug,
            debounceMs: SLUG_CHECK_DEBOUNCE_MS,
            validateFn: (value: string) => {
              const problem = getWorkspaceSlugFormatProblem(value);
              return problem ? (
                <SlugFormatMessage problem={problem} />
              ) : undefined;
            },
            ..._getSlugFieldStatusProps(slugCheck),
          },
          fullName: {
            key: "fullName",
            type: "text",
            initialValue: "",
            required: true,
          },
          displayName: {
            key: "displayName",
            type: "text",
            description: t`The name you want other team members to see.`,
            initialValue: "",
            required: true,
            syncWhileUntouched: {
              syncFrom: "fullName",
            },
          },
        } as const
      }
      formElements={[
        <Title order={4}>
          <Trans>About your workspace</Trans>
        </Title>,
        "workspaceName",
        "workspaceSlug",
        <Divider mt="xs" />,
        <Title order={4}>
          <Trans>About you</Trans>
        </Title>,
        "fullName",
        "displayName",
      ]}
      submitIsLoading={isWorkspaceCreating}
      submitIsDisabled={!isSlugAvailable}
      onSubmit={({ workspaceName, workspaceSlug, fullName, displayName }) => {
        // due to our input's debounce, it is technically possible to submit
        // a slug that has not yet been checked. So here we check that the
        // submitted slug is indeed the one that was confirmed available.
        // If it's not, we do nothing.
        if (!isSlugAvailable || workspaceSlug !== slugCheck.slug) {
          return;
        }

        createWorkspace({
          workspaceName,
          workspaceSlug,
          ownerName: fullName,
          ownerDisplayName: displayName,
        });
        setSubmittedOnwerInfo({ fullName, displayName });
      }}
      introContent={introText}
    />
  );
}
