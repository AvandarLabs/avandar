import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import { FeedbackButton } from "@/components/FeedbackButton/FeedbackButton";
import {
  cssVariablesResolver,
  MODAL_ROOT_Z_INDEX,
  Theme,
} from "@/config/Theme";

type Props = {
  children: ReactNode;
};

export function AvandarUIProvider({ children }: Props): JSX.Element {
  return (
    <MantineProvider theme={Theme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider modalProps={{ zIndex: MODAL_ROOT_Z_INDEX }}>
        <Notifications position="bottom-right" />
        <FeedbackButton />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}
