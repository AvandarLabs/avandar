import type { I18nMessages } from "@avandar/ui";

import { AvaQueryProvider } from "@avandar/query-hooks";
import { AvaUiProvider } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { ReactNode, useMemo } from "react";

import {
  cssVariablesResolver,
  DEFAULT_NOTIFICATIONS_PROPS,
  NOTIFICATIONS_Z_INDEX,
  Theme,
} from "@/config/Theme";
import { notifyError } from "@/utils/notifications/notify";

type Props = {
  children: ReactNode;
};

/**
 * Translates the strings that AvaUI renders.
 *
 * AvaUI has no i18n framework of its own: it declares the strings it needs as
 * a plain object so it stays usable by apps on any i18n stack. This is the
 * single place where Lingui is bound to that contract, so Lingui stays an app
 * dependency. The `t` macros below are what Lingui's extractor picks up.
 */
function useAvandarUIMessages(): I18nMessages {
  // `t` is bound to the active locale by `useLingui()`, so depending on it
  // alone re-translates on locale change. Matches `useVizConfigSchemas`.
  const { t } = useLingui();

  return useMemo(
    (): I18nMessages => {
      return {
        cancel: t`Cancel`,
        confirm: t`Confirm`,
        confirmActionMessage: t`Are you sure you want to proceed with this action? This cannot be undone.`,
        confirmActionTitle: t`Confirm Action`,
        edit: t`Edit`,
        empty: t`Empty`,
        emptyText: t`Empty text`,
        fieldCannotBeEmpty: t`This field cannot be empty`,
        invalidDate: t`Invalid date`,
        invalidEmail: t`Invalid email address`,
        no: t`No`,
        noValue: t`No value`,
        noValues: t`There are no values`,
        save: t`Save`,
        submit: t`Submit`,
        thisField: t`This field`,
        upload: t`Upload`,
        yes: t`Yes`,

        andMore: (remainingCount) => {
          return t`... and ${remainingCount} more`;
        },
        collectionLabel: (collectionNumber) => {
          return t`Collection ${collectionNumber}`;
        },
        editNamed: (name) => {
          return t`Edit ${name}`;
        },
        fieldMinLength: ({ fieldName, minLength }) => {
          return t`${fieldName} must be at least ${minLength} characters long`;
        },
        saveWithShortcut: (keyboardShortcut) => {
          return t`${keyboardShortcut} to save`;
        },
      };
    },
    // re-translate whenever the active locale changes
    [t],
  );
}

/**
 * Everything the Avandar app puts in React context, in one place.
 *
 * AvaUI owns the presentation layer (theme, notifications, translations), so
 * this hands it the app's theme and Lingui-bound copy and lets it mount them.
 * The data layer stays here: `AvaQueryProvider` is passed through as a child so
 * AvaUI keeps no opinion about how data is fetched.
 */
export function AvandarAppProvider({ children }: Props): ReactNode {
  const i18nMessages = useAvandarUIMessages();

  return (
    <AvaUiProvider
      theme={Theme}
      cssVariablesResolver={cssVariablesResolver}
      i18nMessages={i18nMessages}
      notificationsProps={{
        position: DEFAULT_NOTIFICATIONS_PROPS.position,
        transitionDuration: DEFAULT_NOTIFICATIONS_PROPS.transitionDuration,
        zIndex: NOTIFICATIONS_Z_INDEX,
      }}
    >
      <AvaQueryProvider
        onError={({ title, message }) => {
          return notifyError({ title, message });
        }}
      >
        {children}
      </AvaQueryProvider>
    </AvaUiProvider>
  );
}
