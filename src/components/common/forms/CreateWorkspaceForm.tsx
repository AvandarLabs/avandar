import { Divider, Loader, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLinks } from "@/config/AppLinks";
import { AvaForm } from "@/lib/ui/AvaForm/AvaForm";
import { notifySuccess } from "@/lib/ui/notifications/notify";
import { slugify } from "@/lib/utils/strings/transformations";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

type Props = {
  onSubmit?: (values: {
    workspaceName: string;
    workspaceIdentifier: string;
    fullName: string;
    displayName: string;
  }) => void;
  introText?: string;
};

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 20;

function validateSlugString(value: string): string | undefined {
  if (!value) {
    return "The workspace ID cannot be empty";
  }
  if (value.length < SLUG_MIN_LENGTH) {
    return `The workspace ID must be at least ${SLUG_MIN_LENGTH} characters long`;
  }
  if (value.length > SLUG_MAX_LENGTH) {
    return `The workspace ID must be less than ${SLUG_MAX_LENGTH} characters long`;
  }
  if (value.includes(" ")) {
    return "The workspace ID cannot contain spaces";
  }
  if (!value.match(/^[a-zA-Z0-9-]+$/)) {
    return "The workspace ID can only contain letters, numbers, and hyphens";
  }
  return undefined;
}

export function CreateWorkspaceForm({
  onSubmit,
  introText,
}: Props): JSX.Element {
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
        notifySuccess("Workspace created successfully!");
        close();

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

  const [validateSlug, isValidatingSlug] =
    WorkspaceClient.useValidateWorkspaceSlug({
      onSuccess: (result, variables) => {
        setSlugValidationResult(result);
        setLastValidatedSlug(variables.workspaceSlug);
      },
    });
  const [slugValidationResult, setSlugValidationResult] = useState<
    { isValid: true } | { isValid: false; reason: string } | undefined
  >(undefined);
  const [lastValidatedSlug, setLastValidatedSlug] = useState<
    string | undefined
  >(undefined);

  const onSlugChange = (newSlug: string) => {
    // check if slug is valid
    validateSlug({ workspaceSlug: newSlug });
  };

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
            description:
              "This is the unique ID of your organization used in URLs.",
            initialValue: "",
            label: "Workspace ID",
            required: true,
            syncWhileUntouched: {
              syncFrom: "workspaceName",
              transform: slugify,
            },
            onChange: onSlugChange,
            debounceMs: 500,
            validateFn: validateSlugString,
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
            description: "The name you want other team members to see.",
            initialValue: "",
            required: true,
            syncWhileUntouched: {
              syncFrom: "fullName",
            },
          },
        } as const
      }
      formElements={[
        <Title order={4}>About your workspace</Title>,
        "workspaceName",
        "workspaceSlug",
        slugValidationResult === undefined || slugValidationResult.isValid ?
          null
        : <Text c="red">{slugValidationResult.reason}</Text>,
        isValidatingSlug ? <Loader /> : null,
        <Divider mt="xs" />,
        <Title order={4}>About you</Title>,
        "fullName",
        "displayName",
      ]}
      submitIsLoading={isWorkspaceCreating}
      submitIsDisabled={
        slugValidationResult === undefined ||
        !slugValidationResult.isValid ||
        isValidatingSlug
      }
      onSubmit={({ workspaceName, workspaceSlug, fullName, displayName }) => {
        // due to our input's debounce, it is technically possible to submit
        // a slug that has not yet been validated. So here we check that the
        // submitted slug is indeed the same as the last validated slug.
        // If it's not, we do nothing.
        if (workspaceSlug !== lastValidatedSlug) {
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
