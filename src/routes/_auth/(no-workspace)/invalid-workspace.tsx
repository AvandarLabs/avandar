import { Trans } from "@lingui/react/macro";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { match } from "ts-pattern";
import { z } from "zod";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { AppLinks } from "@/config/AppLinks";
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
  const navigate = useNavigate();

  useEffect(() => {
    Logger.log("Invalid workspace", {
      redirectReason,
    });
  }, [redirectReason]);

  // Shared by the "not found / access revoked" case and the default case, so
  // a copy edit only has to happen in one place.
  const notFoundOrAccessRevokedMessage = (
    <Trans>
      This workspace no longer exists or your access has been revoked. If you
      think this is a mistake, contact your workspace owner.
    </Trans>
  );

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
                return notFoundOrAccessRevokedMessage;
              })
              .with("NO_SUBSCRIPTION", () => {
                return (
                  <Trans>
                    This workspace does not have a valid subscription.
                  </Trans>
                );
              })
              .otherwise(() => {
                return notFoundOrAccessRevokedMessage;
              })}
          </Text>
          <Group justify="center">
            <Button
              onClick={() => {
                void navigate({ to: AppLinks.home.to });
              }}
            >
              <Trans>Go to home</Trans>
            </Button>
          </Group>
        </Stack>
      </Container>
    </AppLayout>
  );
}
