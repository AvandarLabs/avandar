import { Anchor, Box, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import reactLogo from "@/assets/react.svg";

export const Route = createFileRoute("/_auth/")({
  component: HomePage,
});

/**
 * You can delete this custom hook. It's simple boilerplace to show how
 * to use React Query. This function simply returns a random number.
 */
function useRandomNumber(): UseQueryResult<number> {
  return useQuery({
    queryKey: ["example"],
    queryFn: () =>
      Promise.resolve(
        Math.round((Math.random() * 100 + Number.EPSILON) * 100) / 100,
      ),
  });
}

function HomePage() {
  const [count, setCount] = useState(0);
  const { data: randomNumber, isLoading } = useRandomNumber();

  return (
    <Stack>
      <Title order={1}>This is an H1 Title</Title>
      <Group>
        <Text>This is a test image asset:</Text>
        <Anchor href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </Anchor>
      </Group>
      <Box>
        <Button onClick={() => setCount((prevCount) => prevCount + 1)}>
          Count is {count}
        </Button>
      </Box>
      <Text>This is a test paragraph.</Text>
      <Text>
        Loading random number from a query:{" "}
        {isLoading ? "Loading..." : randomNumber}
      </Text>
    </Stack>
  );
}
