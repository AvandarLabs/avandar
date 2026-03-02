import { Container, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Logger } from "$/lib/Logger";
import { useEffect } from "react";
import { match } from "ts-pattern";
import { z } from "zod";

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
    Logger.log("Invalid workspace", {
      redirectReason,
    });
  }, [redirectReason]);

  return (
    <Container ta="center" fluid py="xxxl">
      <Stack gap="md">
        <Title order={1}>No workspace was found</Title>
        <Text size="xl">
          {match(redirectReason)
            .with("NOT_FOUND_OR_ACCESS_REVOKED", () => {
              return (
                <>
                  The workspace you are trying to access either does not exist
                  or you do not have access to it.
                </>
              );
            })
            .with("NO_SUBSCRIPTION", () => {
              return <>This workspace does not have a valid subscription.</>;
            })
            .otherwise(() => {
              return (
                <>
                  The workspace you are trying to access either does not exist
                  or you do not have access to it.
                </>
              );
            })}
        </Text>
      </Stack>
    </Container>
  );
}
