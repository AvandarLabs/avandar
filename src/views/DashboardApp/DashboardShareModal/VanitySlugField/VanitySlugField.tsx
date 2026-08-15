import { Trans, useLingui } from "@lingui/react/macro";
import {
  Code,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import css from "./VanitySlugField.module.css";
import type { ReactNode } from "react";

type Props = {
  slugInput: string;
  normalisedSlug: string;
  /** Path the slug is appended to, e.g. `/d/` or `/acme/d/`. */
  urlPrefix: string;
  errorMessage?: string;
  hasPendingCheck: boolean;
  isAccepted: boolean;
  onChange: (slugInput: string) => void;
};

/** Edits and previews the optional public vanity URL. */
export function VanitySlugField({
  slugInput,
  normalisedSlug,
  urlPrefix,
  errorMessage,
  hasPendingCheck,
  isAccepted,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const rightSection =
    !normalisedSlug ? null
    : hasPendingCheck ? <Loader size="xs" />
    : isAccepted ?
      <IconCheck
        size={18}
        color="var(--mantine-color-teal-6)"
        aria-label={t`Custom URL is available`}
      />
    : null;
  return (
    <Stack gap={4}>
      <Title order={5} fw={600}>
        <Trans>Custom URL (optional)</Trans>
      </Title>
      <Text size="xs" c="dimmed">
        <Trans>
          A short, memorable URL for flyers, reports, and QR codes. Whatever you
          type is kebab-cased automatically.
        </Trans>
      </Text>
      <TextInput
        aria-label={t`Custom URL path`}
        placeholder={t`e.g. cholera-outbreak-2024`}
        value={slugInput}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        error={errorMessage}
        rightSection={rightSection}
        rightSectionWidth={36}
      />
      {normalisedSlug ?
        <Group gap={6} mt={2} wrap="nowrap">
          <Text size="xs" c="dimmed">
            <Trans>Preview:</Trans>
          </Text>
          <Code className={css.vanitySlugFieldPreview}>
            {urlPrefix}
            {normalisedSlug}
          </Code>
        </Group>
      : null}
    </Stack>
  );
}
