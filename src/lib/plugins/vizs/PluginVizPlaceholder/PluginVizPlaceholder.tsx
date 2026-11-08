import { Callout } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Flex } from "@mantine/core";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

/** Why a plugin chart shows a placeholder instead of the chart. */
export type PluginVizPlaceholderReason =
  | "missingPlugin"
  | "invalidSettings"
  | "renderFailed"
  | "loadFailed";

type Props = Readonly<{
  reason: PluginVizPlaceholderReason;

  /** The id of the plugin the chart comes from, named in the message. */
  pluginId: string;

  /** The chart type's localized title, when its manifest has loaded. */
  title?: string;

  /** Called by the Retry button, which shows only for `loadFailed`. */
  onRetry?: () => void;
}>;

type PlaceholderCopy = Readonly<{ heading: string; message: string }>;

/**
 * Resolves `msg` descriptors through `i18n` rather than taking the `t` from
 * `useLingui()`, so the extractor can still find every sentence.
 */
function _getPlaceholderCopy(
  options: Readonly<{
    reason: PluginVizPlaceholderReason;
    pluginId: string;
    title: string | undefined;
    i18n: I18n;
  }>,
): PlaceholderCopy {
  const { reason, pluginId, title, i18n } = options;
  return matchLiteral(reason, {
    missingPlugin: () => {
      return {
        heading: i18n._(msg`Plugin not available`),
        message: i18n._(
          msg`This chart needs the ${pluginId} plugin, which is not available.`,
        ),
      };
    },
    invalidSettings: () => {
      return {
        heading: i18n._(msg`Invalid chart settings`),
        message: i18n._(
          msg`This chart's saved settings are not valid, so it cannot be displayed.`,
        ),
      };
    },
    renderFailed: () => {
      return {
        heading:
          title === undefined
            ? i18n._(msg`This chart couldn't render`)
            : i18n._(msg`${title} couldn't render`),
        message: i18n._(
          msg`The ${pluginId} plugin ran into an error while drawing this chart.`,
        ),
      };
    },
    loadFailed: () => {
      return {
        heading: i18n._(msg`This chart couldn't load`),
        message: i18n._(msg`The ${pluginId} plugin's chart code didn't load.`),
      };
    },
  });
}

/**
 * Fills a plugin chart's area with the reason the chart cannot be drawn: the
 * plugin is missing, the saved settings are invalid, the chart failed to
 * render, or its code failed to load. The `loadFailed` reason adds a Retry
 * button.
 *
 * Use it in place of a plugin chart wherever one is rendered, for example in
 * the Data Explorer or on a dashboard tile.
 */
export function PluginVizPlaceholder({
  reason,
  pluginId,
  title,
  onRetry,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const { heading, message } = _getPlaceholderCopy({
    reason,
    pluginId,
    title,
    i18n,
  });
  return (
    <Flex h="100%" w="100%" justify="center" align="center">
      <Callout.Error title={heading} message={message} w="fit-content">
        {reason === "loadFailed" && onRetry !== undefined ? (
          <Button variant="default" w="fit-content" onClick={onRetry}>
            <Trans>Retry</Trans>
          </Button>
        ) : null}
      </Callout.Error>
    </Flex>
  );
}
