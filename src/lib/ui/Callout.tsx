import {
  Alert,
  AlertProps,
  Stack,
  Text,
  TextProps,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

type Props = {
  title: string;
  titleSize?: TextProps["size"];

  /**
   * If a message is provided, it will be displayed in a Text component.
   * If children are provided, they will be displaced under the message.
   */
  message?: string;
  messageSize?: TextProps["size"];
} & AlertProps;

export function Callout({
  title,
  message,
  titleSize,
  color = "danger",
  variant = "light",
  icon = <IconAlertCircle size={32} />,
  children,
  messageSize = "xl",
  ...moreAlertProps
}: Props): JSX.Element {
  const contents = (
    <Stack gap="xxs">
      {message ?
        <Text size={messageSize}>{message}</Text>
      : null}
      {children}
    </Stack>
  );

  return (
    <Alert
      color={color}
      variant={variant}
      title={
        <Title order={2} size={titleSize}>
          {title}
        </Title>
      }
      icon={icon}
      styles={{ icon: { width: "fit-content", height: "fit-content" } }}
      children={contents}
      {...moreAlertProps}
    />
  );
}

Callout.Info = (props: Omit<Props, "color">): JSX.Element => {
  return <Callout color="info" {...props} />;
};

Callout.Error = (props: Omit<Props, "color">): JSX.Element => {
  return <Callout color="danger" {...props} />;
};
