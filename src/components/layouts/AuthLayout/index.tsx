import { Paper } from "@avandar/ui";
import { Box, Container, Stack, Text, Title } from "@mantine/core";
import { CSSProperties, ReactNode } from "react";

import { HEADER_DESKTOP_TITLEBAR_HEIGHT } from "@/components/layouts/AppLayout/AppLayout";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";

const TITLEBAR_DRAG_REGION_STYLE: CSSProperties = {
  height: HEADER_DESKTOP_TITLEBAR_HEIGHT,
  flexShrink: 0,
  WebkitAppRegion: "drag",
} as CSSProperties;

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: Props): JSX.Element {
  const isDesktopPlatform = usePlatformInfo() === "desktop";

  return (
    <Stack gap={0} mih="100dvh">
      {isDesktopPlatform ? (
        <Box
          aria-hidden
          className="electrobun-webkit-app-region-drag"
          style={TITLEBAR_DRAG_REGION_STYLE}
        />
      ) : null}
      <Container size={512} py="xxl">
        <Stack>
          <Title ta="center" order={1}>
            {title}
          </Title>

          {subtitle ? (
            <Text ta="center" className="space-x-2" c="dimmed">
              {subtitle}
            </Text>
          ) : null}

          <Paper>{children}</Paper>

          {footer ? footer : null}
        </Stack>
      </Container>
    </Stack>
  );
}
