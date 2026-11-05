import { Trans, useLingui } from "@lingui/react/macro";
import { Divider, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { slugify } from "$/lib/strings/transformations";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { SlugCheckMessage } from "@/components/forms/CreateWorkspaceForm/SlugCheckMessage";
import { SlugFieldStatusLine } from "@/components/forms/CreateWorkspaceForm/SlugFieldStatusLine";
import { SlugFormatMessage } from "@/components/forms/CreateWorkspaceForm/SlugFormatMessage";
import { SlugStatusIcon } from "@/components/forms/CreateWorkspaceForm/SlugStatusIcon";
import { getWorkspaceSlugFormatProblem } from "@/components/forms/getWorkspaceSlugFormatProblem/getWorkspaceSlugFormatProblem";
import { useWorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { notifySuccess } from "@/utils/notifications/notify";
import type { WorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
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
 * The live props for the slug input: a status icon at its trailing edge,
 * the error under it, and a success line in the same place when the slug
 * is free. Every state is also announced to screen readers. Spread into the
 * `workspaceSlug` field schema of `CreateWorkspaceForm`.
 */
function _getSlugFieldStatusProps(slugCheck: WorkspaceSlugCheck): {
  rightSection: ReactNode;
  error: ReactNode;
  inputContainer: (children: ReactNode) => ReactNode;
} {
  const { status } = slugCheck;
  const isError =
    status === "invalid" || status === "taken" || status === "failed";
  return {
    rightSection: <SlugStatusIcon status={status} />,
    error: isError ? <SlugCheckMessage slugCheck={slugCheck} /> : undefined,
    inputContainer: (children) => {
      return (
        <>
          {children}
          <SlugFieldStatusLine slugCheck={slugCheck} />
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
