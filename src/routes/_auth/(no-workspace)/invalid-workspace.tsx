import { Container, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { notifyError } from "@/lib/ui/notifications/notifyError";

const searchSchema = z.object({
  redirectReason: z.string().optional(),
});

export const Route = createFileRoute("/_auth/(no-workspace)/invalid-workspace")(
  {
    validateSearch: searchSchema,
    component: InvalidWorkspacePage,
  },
);

function InvalidWorkspacePage() {
  const { redirectReason } = Route.useSearch();

  useEffect(() => {
    if (redirectReason) {
      notifyError({
        title: "Could not load page",
        message: redirectReason,
      });
    }
  }, [redirectReason]);

  return (
    <Container ta="center" fluid py="xxxl">
      <Stack gap="md">
        <Title order={1}>No workspace was found</Title>
        <Text size="xl">
          The workspace you are trying to access either does not exist or you do
          not have access to it.
        </Text>
      </Stack>
    </Container>
  );
}
