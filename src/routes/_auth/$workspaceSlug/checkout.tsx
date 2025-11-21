import {
  Button,
  Center,
  Container,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { SUPPORT_EMAIL } from "@/config/AppConfig";

const searchSchema = z.object({
  success: z.boolean().optional(),
});

export const Route = createFileRoute("/_auth/$workspaceSlug/checkout")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (search.success === undefined) {
      throw redirect({ to: "/" });
    }
  },
  component: CheckoutPage,
});

function CheckoutPage() {
  const { success } = Route.useSearch();
  const navigate = useNavigate();

  const contents =
    success === true ?
      <>
        <ThemeIcon size={64} radius="xl" variant="light" color="green">
          <IconCheck size={32} stroke={2.5} />
        </ThemeIcon>
        <Stack gap="xs" align="center">
          <Title order={2} fw={600}>
            Checkout Successful!
          </Title>
          <Text size="lg" c="dimmed" maw={400}>
            Your checkout was successful!
          </Text>
          <Text component="strong" size="lg" c="dimmed" maw={400} fw="bold">
            It may take a few minutes for your subscription to take effect.
          </Text>
        </Stack>
        <Button
          onClick={() => {
            navigate({ to: "/" });
          }}
          size="md"
          mt="md"
        >
          Continue to your workspace
        </Button>
      </>
    : <>
        <ThemeIcon size={64} radius="xl" variant="light" color="red">
          <IconAlertCircle size={32} stroke={2.5} />
        </ThemeIcon>
        <Stack gap="xs" align="center">
          <Title order={2} fw={600}>
            Checkout Problem
          </Title>
          <Text size="lg" c="dimmed" maw={400}>
            There was a problem with your checkout. Please reach out to{" "}
            <Text
              component="a"
              href={`mailto:${SUPPORT_EMAIL}`}
              c="blue"
              fw={500}
              td="underline"
            >
              {SUPPORT_EMAIL}
            </Text>{" "}
            for assistance.
          </Text>
        </Stack>
        <Stack gap="xs" w="100%">
          <Button
            component="a"
            href={`mailto:${SUPPORT_EMAIL}`}
            variant="filled"
            color="red"
            size="md"
            mt="md"
          >
            Contact Support
          </Button>
          <Button
            onClick={() => {
              navigate({ to: "/" });
            }}
            variant="subtle"
            size="md"
          >
            Return to Home
          </Button>
        </Stack>
      </>;

  // This shouldn't be reached due to beforeLoad redirect
  return (
    <Container size="sm" py="xl">
      <Center h="100%">
        <Paper
          p="xl"
          radius="md"
          shadow="sm"
          withBorder
          bg="white"
          w="100%"
          maw={500}
        >
          <Stack gap="lg" align="center" ta="center">
            {contents}
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
