import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

type Props = {
  fileName: string;
};

export function ImportConfirmBody({ fileName }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack mt="md">
      <Text>{t`Do you want to import "${fileName}" as a new dataset?`}</Text>
    </Stack>
  );
}
