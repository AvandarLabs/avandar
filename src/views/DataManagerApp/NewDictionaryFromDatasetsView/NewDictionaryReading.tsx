import { useLingui } from "@lingui/react/macro";
import { Center, Group, Loader, Text } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import type { ReactNode } from "react";

type Props = {
  datasetName: string | undefined;
};

/** Shown while the dataset that opened the flow is read on this device. */
export function NewDictionaryReading({
  datasetName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <AppViewBody>
      <Center py="xxl">
        <Group gap="sm" aria-live="polite">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {datasetName
              ? t`Reading ${datasetName} on this device`
              : t`Reading datasets on this device`}
          </Text>
        </Group>
      </Center>
    </AppViewBody>
  );
}
