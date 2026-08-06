import { Trans } from "@lingui/react/macro";
import { Container, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { Logger } from "@/utils/Logger";

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
    <AppLayout>
      <Container ta="center" fluid py="xxxl">
        <Stack gap="md">
          <Title order={1}>
            <Trans>No workspace was found</Trans>
          </Title>
          <Text size="xl">
            {match(redirectReason)
              .with("NOT_FOUND_OR_ACCESS_REVOKED", () => {
                return (
                  <Trans>
                    The workspace you are trying to access either does not exist
                    or you do not have access to it.
                  </Trans>
                );
              })
              .with("NO_SUBSCRIPTION", () => {
                return (
                  <Trans>
                    This workspace does not have a valid subscription.
                  </Trans>
                );
              })
              .otherwise(() => {
                return (
                  <Trans>
                    The workspace you are trying to access either does not exist
                    or you do not have access to it.
                  </Trans>
                );
              })}
          </Text>
        </Stack>
      </Container>
    </AppLayout>
  );
}
