import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import css from "./VanitySlugField.module.css";
import type { ReactNode } from "react";

export type VanitySlugFieldProps = {
  slugInput: string;
  normalisedSlug: string;
  errorMessage?: string;
  hasPendingCheck: boolean;
  isAccepted: boolean;
  onChange: (slugInput: string) => void;
  /**
   * When set, the heading is omitted and this string is shown immediately
   * before the path field, e.g. `https://app.example.com/d/`.
   */
  urlPrefix?: string;
};

function VanitySlugInput({
  slugInput,
  normalisedSlug,
  errorMessage,
  hasPendingCheck,
  isAccepted,
  onChange,
}: Readonly<Omit<VanitySlugFieldProps, "urlPrefix">>): ReactNode {
  const { t } = useLingui();
  const rightSection = !normalisedSlug ? null : hasPendingCheck ? (
    <Loader size="xs" />
  ) : isAccepted ? (
    <IconCheck
      size={18}
      color="var(--mantine-color-teal-6)"
      aria-label={t`Custom URL is available`}
    />
  ) : null;
  return (
    <TextInput
      className={css.vanitySlugFieldInput}
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
  );
}

/** Edits the optional public vanity URL. */
export function VanitySlugField({
  urlPrefix,
  ...inputProps
}: Readonly<VanitySlugFieldProps>): ReactNode {
  const input = <VanitySlugInput {...inputProps} />;
  if (urlPrefix) {
    return (
      <Stack gap={4} className={css.vanitySlugFieldEditor}>
        <div className={css.vanitySlugFieldPrefixedRow}>
          <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            className={css.vanitySlugFieldUrlPrefix}
            component="span"
          >
            {urlPrefix}
          </Text>
          {input}
        </div>
      </Stack>
    );
  }
  return (
    <Stack gap={4}>
      <Title order={5} fw={600}>
        <Trans>Custom URL (optional)</Trans>
      </Title>
      <Text size="xs" c="dimmed">
        <Trans>A short, memorable URL for flyers, reports, and QR codes.</Trans>
      </Text>
      {input}
    </Stack>
  );
}
