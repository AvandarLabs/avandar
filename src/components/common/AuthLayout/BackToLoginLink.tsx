import { Box, Center } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "@/lib/ui/links/Link";

export function BackToLoginLink(): JSX.Element {
  return (
    <Link c="dimmed" to="/signin" size="sm">
      <Center inline className="transition-colors hover:text-neutral-600">
        <IconArrowLeft size={12} stroke={1.5} />
        <Box ml="xxs">Back to the login page</Box>
      </Center>
    </Link>
  );
}
