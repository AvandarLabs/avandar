import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { I18nProvider } from "@lingui/react";
import { createRoot } from "react-dom/client";
import { messages } from "../../gallery/locales/en/messages";
import { CompositionGallery } from "./CompositionGallery/CompositionGallery";

i18n.setMessagesCompiler(compileMessage);
i18n.loadAndActivate({ locale: "en", messages });
createRoot(document.getElementById("root")!).render(
  <I18nProvider i18n={i18n}>
    <CompositionGallery />
  </I18nProvider>,
);
