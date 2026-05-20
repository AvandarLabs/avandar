import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import {
  cssVariablesResolver,
  DEFAULT_NOTIFICATIONS_PROPS,
  Theme,
} from "@/config/Theme";

type Props = {
  children: ReactNode;
};

export function AvandarUiProvider({ children }: Props): JSX.Element {
  return (
    <MantineProvider theme={Theme} cssVariablesResolver={cssVariablesResolver}>
      <Notifications
        position={DEFAULT_NOTIFICATIONS_PROPS.position}
        transitionDuration={DEFAULT_NOTIFICATIONS_PROPS.transitionDuration}
      />
      {children}
    </MantineProvider>
  );
}
