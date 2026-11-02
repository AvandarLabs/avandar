import { setupI18n } from "@lingui/core";
import { messages as stockMessages } from "../stock/i18n/messages.en.generated";
import { messages as galleryMessages } from "./locales/en/messages";

/** Gallery and stock content share the canonical compiled English catalog. */
export const galleryI18n: ReturnType<typeof setupI18n> = setupI18n({
  locale: "en",
  messages: {
    en: {
      ...stockMessages,
      ...galleryMessages,
    },
  },
});
