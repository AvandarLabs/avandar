import { Alert, AlertProps, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

type Props = {
  title: string;
} & AlertProps;

export function Callout({
  title,
  color = "danger",
  ...alertProps
}: Props): JSX.Element {
  return (
    <Alert
      variant="light"
      color={color}
      title={<Title order={4}>{title}</Title>}
      icon={<IconAlertCircle />}
      {...alertProps}
    />
  );
}
