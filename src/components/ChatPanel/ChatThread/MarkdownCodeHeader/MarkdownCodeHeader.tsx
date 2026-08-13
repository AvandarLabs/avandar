import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, CopyButton, Text } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import css from "./MarkdownCodeHeader.module.css";
import type { CodeHeaderProps } from "@assistant-ui/react-markdown";

type Props = CodeHeaderProps;

/** Renders the copy and language controls for a fenced code block. */
export function MarkdownCodeHeader({
  language,
  code,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const displayLanguage =
    language && language !== "unknown" ? language : undefined;

  return (
    <div className={css.markdownCodeHeaderRoot} data-markdown-code-header>
      {displayLanguage ?
        <Text
          component="span"
          size="xs"
          className={css.markdownCodeHeaderLanguage}
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
                className={css.markdownCodeHeaderCopyButton}
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
