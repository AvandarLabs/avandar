import { Trans, useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { ReactNode } from "react";

type Props = {
  codes: ColumnCodes.T;
};

/** What a conversion did, and which entry it came from. */
function ConvertedSentence({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName, entryName } = codes;
  // A converted column's `direction` is the side it holds now.
  const holdsLabels = codes.direction === "encode";
  if (codes.isSourceDeleted) {
    return holdsLabels ? (
      <Trans>
        The values were converted to these labels. The dictionary entry they
        came from was deleted.
      </Trans>
    ) : (
      <Trans>
        The values were converted to these codes. The dictionary entry they came
        from was deleted.
      </Trans>
    );
  }
  return holdsLabels ? (
    <Trans>
      From {dictionaryName} › {entryName}. The values were converted to these
      labels.
    </Trans>
  ) : (
    <Trans>
      From {dictionaryName} › {entryName}. The values were converted to these
      codes.
    </Trans>
  );
}

/** The version a pinned conversion was given, and the current one. */
function PinnedSentence({ codes }: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const appliedVersion = i18n.number(codes.appliedDictionaryVersion);
  const current = codes.currentDictionaryVersion;
  if (current !== undefined && current > codes.appliedDictionaryVersion) {
    const currentVersion = i18n.number(current);
    return (
      <Trans>
        Converted with version {appliedVersion} of the dictionary. The
        dictionary is now at version {currentVersion}.
      </Trans>
    );
  }
  return (
    <Trans>Converted with version {appliedVersion} of the dictionary.</Trans>
  );
}

/**
 * Where a column's code list came from and what it did to the values:
 * attached as reference, or converted, with the pinned version and the
 * kept original values when they apply. The foot of `CodeListPopover`.
 */
export function CodeListPopoverFooter({ codes }: Readonly<Props>): ReactNode {
  const { dictionaryName, entryName } = codes;
  if (codes.mode === "reference") {
    return (
      <Text size="xs" c="dimmed">
        <Trans>
          From {dictionaryName} › {entryName}. Attached as reference. The values
          in the data are unchanged.
        </Trans>
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      <Text size="xs" c="dimmed">
        <ConvertedSentence codes={codes} />{" "}
        {codes.isPinned ? <PinnedSentence codes={codes} /> : null}
      </Text>
      {codes.keepsOriginal ? (
        <Text size="xs" c="dimmed">
          <Trans>
            The original values are kept beside it, in a column ending in
            _original.
          </Trans>
        </Text>
      ) : null}
    </Stack>
  );
}
