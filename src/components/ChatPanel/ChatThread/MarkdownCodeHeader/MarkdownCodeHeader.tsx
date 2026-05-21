import { useLingui } from "@lingui/react/macro";
import { ActionIcon, CopyButton, Text } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import css from "../ChatThread.module.css";
import type { CodeHeaderProps } from "@assistant-ui/react-markdown";

export function MarkdownCodeHeader({
  language,
  code,
}: CodeHeaderProps): JSX.Element {
  const { t } = useLingui();
  const displayLanguage =
    language && language !== "unknown" ? language : undefined;

  return (
    <div className={css.codeBlockHeader}>
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
