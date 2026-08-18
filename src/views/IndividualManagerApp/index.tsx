import { Box, Flex, MantineTheme } from "@mantine/core";
import { Outlet } from "@tanstack/react-router";
import { IndividualNavbar } from "@/views/IndividualManagerApp/IndividualNavbar";
import type { Concept } from "$/models/ontology/Concept/Concept";

type Props = {
  concept: Concept.T;
};

export function IndividualManagerApp({ concept }: Props): JSX.Element {
  return (
    <Flex>
      <IndividualNavbar
        concept={concept}
        miw={240}
        mih="100dvh"
        h="100dvh"
        style={$individualNavbarBorder}
      />
      <Box flex={1}>
        <Outlet />
      </Box>
    </Flex>
  );
}

const $individualNavbarBorder = (theme: MantineTheme) => {
  return {
    borderRight: `1px solid ${theme.colors.neutral[2]}`,
  };
};
