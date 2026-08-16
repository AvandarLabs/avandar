import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconQrcode,
} from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { notifyError } from "@/utils/notifications/notify";
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
 * opens a modal with the rendered QR image plus a download button.
 *
 * QR codes are generated client-side via `qrcode` (no network call) so we
 * can render even on the desktop offline build.
 */
export function ShareUrlRow({
  label,
  url,
  hint,
  showQr = true,
}: Props): ReactNode {
  const { t } = useLingui();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  useEffect(
    function generateQrCode() {
      // Dropped before anything else, and again on failure. The caption under
      // the image always reads the CURRENT `url`, so keeping the previous
      // code around would pair one dashboard's QR with another's caption, and
      // a generation that never succeeds would leave that pairing on screen
      // for as long as the modal stays open.
      setQrDataUrl(undefined);
      if (!qrOpen) {
        return;
      }
      let isCancelled = false;
      QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 256,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then((dataUrl) => {
          if (!isCancelled) {
            setQrDataUrl(dataUrl);
          }
        })
        .catch((error: unknown) => {
          console.error(error);
          notifyError({
            title: t`Could not generate QR code`,
            message: t`Please try again.`,
          });
        });
      return () => {
        isCancelled = true;
      };
    },
    [qrOpen, url, t],
  );

  const downloadQr = (): void => {
    if (!qrDataUrl) {
      return;
    }
    const downloadLink = document.createElement("a");
    downloadLink.href = qrDataUrl;
    downloadLink.download = `dashboard-qr-${Date.now()}.png`;
    downloadLink.click();
  };

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
                return setQrOpen(true);
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

      <Modal
        opened={qrOpen}
        onClose={() => {
          return setQrOpen(false);
        }}
        title={t`QR code`}
        centered
        size="sm"
      >
        <Stack align="center" gap="md">
          {qrDataUrl ?
            <Box>
              <Image src={qrDataUrl} alt={t`QR code`} w={256} h={256} />
            </Box>
          : <Text size="sm" c="dimmed">
              <Trans>Generating…</Trans>
            </Text>
          }
          <Text size="xs" c="dimmed" ta="center">
            <Trans>Scans to:</Trans>{" "}
            <Text component="span" ff="monospace" size="xs">
              {url}
            </Text>
          </Text>
          <Button
            leftSection={<IconDownload size={14} />}
            variant="outline"
            color="neutral"
            disabled={!qrDataUrl}
            onClick={downloadQr}
          >
            <Trans>Download PNG</Trans>
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
