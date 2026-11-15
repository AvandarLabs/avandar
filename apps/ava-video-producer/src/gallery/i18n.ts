import { setupI18n } from "@lingui/core";
import { messages as galleryMessages } from "./locales/en/messages";

/** Gallery copy comes from the compiled English catalog. */
export const galleryI18n: ReturnType<typeof setupI18n> = setupI18n({
  locale: "en",
  messages: {
    en: galleryMessages,
  },
});
