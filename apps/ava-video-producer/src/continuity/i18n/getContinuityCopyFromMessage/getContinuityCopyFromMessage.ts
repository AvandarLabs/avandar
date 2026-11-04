import { setupI18n } from "@lingui/core";
import { continuityCatalogs } from "../catalogs.generated";
import type { I18n, Messages } from "@lingui/core";

type Catalogs = Readonly<Record<string, Messages>>;
const TRANSLATORS = new WeakMap<Catalogs, Map<string, I18n>>();

function _getLocaleTranslator(options: {
  locale: string;
  catalogs: Catalogs;
}): I18n {
  const { locale, catalogs } = options;
  const cached = TRANSLATORS.get(catalogs) ?? new Map<string, I18n>();
  TRANSLATORS.set(catalogs, cached);
  const existing = cached.get(locale);
  if (existing) {
    return existing;
  }
  const language = locale.split(/[-_]/)[0];
  const translator = setupI18n({
    locale,
    messages: {
      [locale]: {
        ...catalogs.en,
        ...catalogs[language],
        ...catalogs[locale],
      },
    },
  });
  cached.set(locale, translator);
  return translator;
}

/** Resolves active translations, then regional/language catalogs, then English. */
export function getContinuityCopyFromMessage(options: {
  message: string;
  i18n: I18n;
  catalogs?: Catalogs;
}): string {
  const { message, i18n, catalogs = continuityCatalogs } = options;
  if (!message) {
    return "";
  }
  const id = `continuity.${message}`;
  if (Object.hasOwn(i18n.messages, id)) {
    return i18n._(id);
  }
  const translator = _getLocaleTranslator({
    locale: i18n.locale || "en",
    catalogs,
  });
  return Object.hasOwn(translator.messages, id) ? translator._(id) : message;
}
