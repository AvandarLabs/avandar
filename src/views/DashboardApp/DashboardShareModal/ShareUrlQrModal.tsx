import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Button, Image, Modal, Stack, Text } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { notifyError } from "@/utils/notifications/notify";
import type { ReactNode } from "react";

type Props = {
  /** The URL the QR code encodes, also shown as the caption. */
  url: string;
  isOpened: boolean;
  onClose: () => void;
};

/**
 * Modal showing the QR code for a share URL, plus a button to download it as a
 * PNG.
 *
 * QR codes are generated client-side via `qrcode` (no network call) so we can
 * render even on the desktop offline build.
 */
export function ShareUrlQrModal({ url, isOpened, onClose }: Props): ReactNode {
  const { t } = useLingui();
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  useEffect(
    function generateQrCode() {
      // Dropped before anything else, and again on failure. The caption under
      // the image always reads the CURRENT `url`, so keeping the previous
      // code around would pair one dashboard's QR with another's caption, and
      // a generation that never succeeds would leave that pairing on screen
      // for as long as the modal stays open.
      setQrDataUrl(undefined);
      if (!isOpened) {
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
    [isOpened, url, t],
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
    <Modal
      opened={isOpened}
      onClose={onClose}
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
  );
}
