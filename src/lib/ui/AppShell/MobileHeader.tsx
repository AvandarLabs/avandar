import { Burger, Group, Title } from "@mantine/core";
import { APP_NAME } from "$/config/AppConfig";
import { clsx } from "clsx";
import css from "./AppShell.module.css";
import { Logo } from "./Logo";

type Props = {
  isMobileNavbarOpened: boolean;
  onToggleMobileNavbar: () => void;
  title?: string;
};

export function MobileHeader({
  title,
  isMobileNavbarOpened,
  onToggleMobileNavbar,
}: Props): JSX.Element {
  return (
    <>
      <Group
        h="100%"
        px="md"
        className={clsx(css.navbarTitleLink, "transition-colors")}
      >
        <Burger
          color="white"
          opened={isMobileNavbarOpened}
          onClick={onToggleMobileNavbar}
          size="sm"
          hiddenFrom="sm"
        />
        <Logo size="small" />
        <Title order={2} size="md" textWrap="nowrap" fw={500}>
          {title ?? APP_NAME}
        </Title>
      </Group>
    </>
  );
}
