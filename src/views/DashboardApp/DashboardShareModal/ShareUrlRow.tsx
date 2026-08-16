import { useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  CopyButton,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { ShareUrlQrModal } from "@/views/DashboardApp/DashboardShareModal/ShareUrlQrModal";
import type { ReactNode } from "react";

type Props = {
  label: string;
  url: string;
  /**
   * Helper hint shown under the URL. Examples: "Use this for QR codes /
   * flyers" or "Always works; falls back to this if your vanity URL is
   * ever changed."
   */
  hint?: string;
  /**
   * Whether to show the "Show QR code" button. Defaults to true. We hide
   * the QR affordance on the vanity row so all QR codes encode the stable
   * dashboardId URL: even if the user later changes the vanity slug, any
   * printed QR keeps resolving.
   */
  showQr?: boolean;
};

/**
 * Display row for a single share URL. Read-only field showing the URL,
 * with a one-click copy button and an optional "Show QR code" button that
 * opens `ShareUrlQrModal`.
 */
export function ShareUrlRow({
  label,
  url,
  hint,
  showQr = true,
}: Props): ReactNode {
  const { t } = useLingui();
  const [isQrOpened, setIsQrOpened] = useState(false);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap" align="center">
        <TextInput
          value={url}
          readOnly
          style={{ flex: 1 }}
          onFocus={(e) => {
            return e.currentTarget.select();
          }}
        />
        <CopyButton value={url}>
          {({ copied, copy }) => {
            return (
              <Tooltip label={copied ? t`Copied!` : t`Copy link`}>
                <ActionIcon
                  variant="light"
                  color={copied ? "teal" : "neutral"}
                  size="lg"
                  onClick={copy}
                  aria-label={t`Copy share link`}
                >
                  {copied ?
                    <IconCheck size={18} />
                  : <IconCopy size={18} />}
                </ActionIcon>
              </Tooltip>
            );
          }}
        </CopyButton>
        {showQr ?
          <Tooltip label={t`Show QR code`}>
            <ActionIcon
              variant="light"
              color="neutral"
              size="lg"
              aria-label={t`Show QR code`}
              onClick={() => {
                return setIsQrOpened(true);
              }}
            >
              <IconQrcode size={18} />
            </ActionIcon>
          </Tooltip>
        : null}
      </Group>
      {hint ?
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      : null}

      <ShareUrlQrModal
        url={url}
        isOpened={isQrOpened}
        onClose={() => {
          return setIsQrOpened(false);
        }}
      />
    </Stack>
  );
}
