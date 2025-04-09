import { Alert, AlertProps, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

type Props = {
  title: string;
  /**
   * If a message is provided, it will be displayed in a Text component.
   * If children are provided, they will be displaced under the message.
   */
  message: string;
} & AlertProps;

export function Callout({
  title,
  message,
  color = "danger",
  variant = "light",
  icon = <IconAlertCircle />,
  children,
  ...moreAlertProps
}: Props): JSX.Element {
  const contents = (
    <Stack>
      {message ?
        <Text>{message}</Text>
      : null}
      {children}
    </Stack>
  );

  return (
    <Alert
      color={color}
      variant={variant}
      title={<Title order={4}>{title}</Title>}
      icon={icon}
      children={contents}
      {...moreAlertProps}
    />
  );
}
