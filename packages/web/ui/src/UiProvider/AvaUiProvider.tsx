import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useMemo } from "react";
import { I18nAvaUiProvider } from "@ui/i18n/I18nAvaUiProvider";
import type { CSSVariablesResolver, MantineThemeOverride } from "@mantine/core";
import type { NotificationsProps } from "@mantine/notifications";
import type { I18nMessages } from "@ui/i18n/i18nMessages";
import type { ReactElement, ReactNode } from "react";

type NotificationsStyles = NonNullable<NotificationsProps["styles"]>;

/** The callback form of Mantine's `styles`: `(theme, props, ctx) => record`. */
type NotificationsStylesFn = Extract<
  NotificationsStyles,
  (...args: never[]) => unknown
>;

/** The plain form of Mantine's `styles`: a selector-to-CSS record. */
type NotificationsStylesRecord = Exclude<
  NotificationsStyles,
  NotificationsStylesFn
>;

/**
 * Lets a notification stay clickable without its container swallowing clicks
 * on the page beneath it. The `Notifications` root spans a whole screen edge,
 * so without this it intercepts pointer events over empty space.
 */
const DEFAULT_NOTIFICATION_STYLES: NotificationsStylesRecord = {
  root: { pointerEvents: "none" },
  notification: { pointerEvents: "auto" },
};

/**
 * Layers an override over the defaults above, two levels deep.
 *
 * A plain `{ ...DEFAULT_NOTIFICATION_STYLES, ...override }` is one level too
 * shallow: an override that touches `notification` at all would replace the
 * whole selector and silently drop its `pointerEvents` default, undoing the
 * click-through behaviour. So each defaulted selector is spread individually.
 *
 * Selectors we set no default for pass straight through. Adding a third entry
 * to `DEFAULT_NOTIFICATION_STYLES` means adding a line here.
 */
function withDefaultStyles(
  override: NotificationsStylesRecord,
): NotificationsStylesRecord {
  const base = DEFAULT_NOTIFICATION_STYLES;
  return {
    ...override,
    root: { ...base.root, ...override.root },
    notification: { ...base.notification, ...override.notification },
  };
}

/**
 * The single provider an app mounts to use AvaUI.
 *
 * It owns everything AvaUI components need in context: the Mantine theme, the
 * notifications portal they render into, and the translated strings they
 * display. The app supplies its theme and copy; AvaUI supplies the wiring.
 *
 * Data-layer providers are deliberately not here. `AvaQueryProvider` and
 * anything else app-shaped belongs above or below this in the app's own tree,
 * passed through as `children`, so that AvaUI stays a presentation library with
 * no opinion about how data is fetched.
 *
 * ```tsx
 * <AvaUiProvider theme={Theme} i18nMessages={messages}>
 *   <App />
 * </AvaUiProvider>
 * ```
 *
 * @param props.theme Mantine theme override. Defaults to Mantine's own theme.
 * @param props.cssVariablesResolver Maps theme values onto CSS variables.
 * @param props.i18nMessages Translated strings. Partial: any key left out falls
 *   back to the English default, so an app can translate incrementally.
 * @param props.notificationsProps Forwarded to Mantine's `Notifications`.
 *   Styles are deliberately not part of this; use `notificationsStyles`.
 * @param props.notificationsStyles Merged over AvaUI's notification styles per
 *   selector rather than replacing them, so an app can restyle `notification`
 *   without losing the click-through behaviour AvaUI sets on `root`. Accepts
 *   Mantine's callback form too, in which case its result is merged.
 */
export function AvaUiProvider(props: {
  children: ReactNode;
  theme?: MantineThemeOverride;
  cssVariablesResolver?: CSSVariablesResolver;
  i18nMessages?: Partial<I18nMessages>;
  notificationsProps?: Omit<NotificationsProps, "styles">;
  notificationsStyles?: NotificationsStyles;
}): ReactElement {
  const {
    children,
    theme,
    cssVariablesResolver,
    i18nMessages,
    notificationsProps,
    notificationsStyles,
  } = props;

  const mergedNotificationsStyles = useMemo((): NotificationsStyles => {
    if (notificationsStyles === undefined) {
      return DEFAULT_NOTIFICATION_STYLES;
    }

    if (typeof notificationsStyles === "function") {
      return (mantineTheme, styleProps, ctx) => {
        return withDefaultStyles(
          notificationsStyles(mantineTheme, styleProps, ctx),
        );
      };
    }

    return withDefaultStyles(notificationsStyles);
  }, [notificationsStyles]);

  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <Notifications
        {...notificationsProps}
        styles={mergedNotificationsStyles}
      />
      <I18nAvaUiProvider i18nMessages={i18nMessages}>
        {children}
      </I18nAvaUiProvider>
    </MantineProvider>
  );
}
