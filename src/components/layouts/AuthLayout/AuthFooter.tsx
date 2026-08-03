import { Trans } from "@lingui/react/macro";
import { Anchor, Text } from "@mantine/core";

const PRIVACY_POLICY_URL = "https://www.avandarlabs.com/privacy-policy";

export function AuthFooter(): JSX.Element {
  return (
    <Text ta="center" size="sm" c="dimmed">
      <Anchor
        href={PRIVACY_POLICY_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Trans>Privacy Policy</Trans>
      </Anchor>
    </Text>
  );
}
