import { setupI18n } from "@lingui/core";
import { messages } from "../messages.en.generated";

/** DOM-free English copy shared by previews, validation, and Node exports. */
export const stockI18n: ReturnType<typeof setupI18n> = setupI18n({
  locale: "en",
  messages: {
    en: messages,
  },
});
