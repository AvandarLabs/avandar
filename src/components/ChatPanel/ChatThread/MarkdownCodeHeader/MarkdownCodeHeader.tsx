import { useLingui } from "@lingui/react/macro";
import { ActionIcon, CopyButton, Text } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import markdownCss from "../MarkdownTextPart/MarkdownTextPart.module.css";
import css from "./MarkdownCodeHeader.module.css";
import type { CodeHeaderProps } from "@assistant-ui/react-markdown";

/**
 * Renders the copy/language header shown above a fenced code block in
 * assistant markdown. Mapped to the `CodeHeader` slot of the markdown
 * components, so it sits directly above the highlighted code and provides
 * the language label plus a copy-to-clipboard button. The header container
 * class (`codeBlockHeader`) is owned by MarkdownTextPart's module because
 * it is styled jointly with the adjacent code block (they share a seam).
 */
export function MarkdownCodeHeader({
  language,
  code,
}: CodeHeaderProps): React.ReactNode {
  const { t } = useLingui();
  const displayLanguage =
    language && language !== "unknown" ? language : undefined;

  return (
    <div className={markdownCss.codeBlockHeader}>
      {displayLanguage ?
        <Text
          component="span"
          size="xs"
          className={css.codeBlockLanguage}
          tt="uppercase"
        >
          {displayLanguage}
        </Text>
      : <span />}
      <CopyButton value={code} timeout={2000}>
        {({ copied, copy }) => {
          return (
            <Tooltip label={copied ? t`Copied` : t`Copy code`}>
              <ActionIcon
                variant="subtle"
                className={css.codeBlockCopyButton}
                size="sm"
                aria-label={t`Copy code`}
                onClick={copy}
              >
                {copied ?
                  <IconCheck size={14} />
                : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          );
        }}
      </CopyButton>
    </div>
  );
}
