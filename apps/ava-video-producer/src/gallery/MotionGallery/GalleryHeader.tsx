import { Trans, useLingui as useGalleryLingui } from "@lingui/react/macro";
import { Icon } from "./Icon";
import type { ReactNode } from "react";

/** Navigation to the motion library and other showcases. */
export function GalleryHeader(): ReactNode {
  const { t } = useGalleryLingui();

  return (
    <header className="site-header">
      <a
        href="motion.html"
        className="brand"
        aria-label={t`Avandar Motion Atlas home`}
      >
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <Trans>avandar</Trans>
          <span className="brand-divider">
            <Trans>/</Trans>
          </span>
          <span className="brand-room">
            <Trans>Motion Atlas</Trans>
          </span>
        </span>
      </a>
      <nav aria-label={t`Showcase`}>
        <a href="index.html">
          <Trans>Starter showcase</Trans>
        </a>
        <a href="productions.html">
          <Trans>Productions</Trans>
          <Icon name="arrow" size={15} />
        </a>
      </nav>
      <span className="header-edition">
        <Trans>A LIBRARY IN MOTION</Trans>
        <span className="tiny-dot" />
      </span>
    </header>
  );
}
