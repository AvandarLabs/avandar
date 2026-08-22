import type { I18n } from "@lingui/core";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Divider, Loader, Text, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { slugify } from "$/lib/strings/transformations";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { notifySuccess } from "@/utils/notifications/notify";

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

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 20;

function _makeSlugValidator(i18n: I18n): (value: string) => string | undefined {
  return (value: string): string | undefined => {
    if (!value) {
      return i18n._(msg`The workspace ID cannot be empty`);
    }
    if (value.length < SLUG_MIN_LENGTH) {
      return i18n._(
        msg`The workspace ID must be at least ${SLUG_MIN_LENGTH} characters long`,
      );
    }
    if (value.length > SLUG_MAX_LENGTH) {
      return i18n._(
        msg`The workspace ID must be less than ${SLUG_MAX_LENGTH} characters long`,
      );
    }
    if (value.includes(" ")) {
      return i18n._(msg`The workspace ID cannot contain spaces`);
    }
    if (!value.match(/^[a-zA-Z0-9-]+$/)) {
      return i18n._(
        msg`The workspace ID can only contain letters, numbers, and hyphens`,
      );
    }
    return undefined;
  };
}

export function CreateWorkspaceForm({
  onSubmit,
  introText,
  onWorkspaceCreated,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const validateSlugString = _makeSlugValidator(i18n);
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
            description: t`This is the unique ID of your organization used in URLs.`,
            initialValue: "",
            label: t`Workspace ID`,
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
        slugValidationResult === undefined ||
        slugValidationResult.isValid ? null : (
          <Text c="red">{slugValidationResult.reason}</Text>
        ),
        isValidatingSlug ? <Loader /> : null,
        <Divider mt="xs" />,
        <Title order={4}>
          <Trans>About you</Trans>
        </Title>,
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
