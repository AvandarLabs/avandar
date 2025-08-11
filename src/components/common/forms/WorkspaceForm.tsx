import { Divider, Title } from "@mantine/core";
import { BasicForm } from "@/lib/ui/BasicForm";
import { slugify } from "@/lib/utils/strings/transformations";

const FORM_FIELDS = {
  workspaceName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  workspaceIdentifier: {
    type: "text" as const,
    description: "This is the unique ID of your organization used in URLs.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "workspaceName",
      transform: slugify,
    },
  },
  fullName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  displayName: {
    type: "text" as const,
    description: "This could be your name or nickname.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "fullName",
    },
  },
};

const FORM_ELEMENTS = [
  <Title order={4}>About your workspace</Title>,
  "workspaceName",
  "workspaceIdentifier",
  <Divider mt="xs" />,
  <Title order={4}>About you</Title>,
  "fullName",
  "displayName",
] as const;

type Props = {
  isLoading: boolean;
  onSubmit: (values: {
    workspaceName: string;
    workspaceIdentifier: string;
    fullName: string;
    displayName: string;
  }) => void;
  introText?: string;
};

export function WorkspaceForm({
  isLoading,
  onSubmit,
  introText,
}: Props): JSX.Element {
  return (
    <BasicForm
      fields={FORM_FIELDS}
      formElements={FORM_ELEMENTS}
      submitIsLoading={isLoading}
      onSubmit={(values) => {
        return onSubmit({
          workspaceName: values.workspaceName,
          workspaceIdentifier: values.workspaceIdentifier,
          fullName: values.fullName,
          displayName: values.displayName,
        });
      }}
      introText={introText}
    />
  );
}
